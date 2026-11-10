// Modelo do arquivo: pessoas, partidos, eleições e legislaturas, juntando os dados do TSE (dados/) com as páginas
// escritas à mão (conteudo/). Tudo é calculado na hora de montar o site.
import tse from "../../dados/tse.json";
import partidosTse from "../../dados/partidos-tse.json";
import registro from "../../dados/partidos-tse-registro.json";
import { escrita, escritas } from "./conteudo";
import { CAMARA } from "./camara";
import historico from "../../dados/camara-legislaturas.json";
import { nomeProprio, slugify } from "./texto";

export type Candidatura = {
  ano: number;
  cargo: string;
  local: string;
  partido: string | null;
  numero: string | null;
  urna: string | null; // null quando o TSE não informou o nome naquela linha
  situacao: string | null;
  resultado: string | null;
  votos: number | null;
  votos2turno?: number;
};
export type PessoaTse = { id: string; urna: string | null; candidaturas: Candidatura[] };

export const ANOS_MUNICIPAIS = [1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024];
const pessoasTse = tse.pessoas as PessoaTse[];

// ---------- Resultados em palavras comuns, sem depender de gênero ----------
export function rotuloResultado(c: Candidatura): string {
  if (c.resultado === "Eleito") return "Venceu";
  if (c.resultado === "Suplente") return "Suplência";
  if (c.resultado === "Não eleito") return "Não obteve vaga";
  const s = (c.situacao ?? "").toUpperCase();
  if (/INDEFERIDO|INAPTO/.test(s)) return "Candidatura não aceita";
  if (/CANCELAMENTO|CANCELAD/.test(s)) return "Candidatura cancelada";
  if (/RENUNCIA|RENÚNCIA/.test(s)) return "Renúncia";
  if (/SUB JUDICE/.test(s)) return "Candidatura em julgamento";
  return "Sem resultado no arquivo";
}
export const venceu = (c: Candidatura) => c.resultado === "Eleito";
export const emOsasco = (c: Candidatura) => c.local === "Osasco";

// ---------- Partidos ----------
// Cada página de partido é uma sigla. Duas siglas repetidas por partidos diferentes ganham página própria:
// o PL de antes da fusão com o PRONA (2006) e o PSD extinto em 2003 (o PSD de hoje foi registrado em 2011).
export function chavePartido(sigla: string | null | undefined, ano: number): string | null {
  if (!sigla) return null;
  let s = sigla.toUpperCase().replace(/\s+/g, "").normalize("NFD").replace(/\p{M}/gu, "");
  if (s === "PATRI") s = "PATRIOTA";
  if (s === "PSD" && ano < 2011) return "PSD-ANTIGO";
  if (s === "PL" && ano < 2007) return "PL-ANTIGO";
  return s;
}
export const idPartido = (chave: string) => slugify(chave);

export type Mudanca = { tipo: "nome" | "fusao" | "incorporacao"; de: string[]; para: string; data: string; processo: string };
const mudancas = registro.mudancas as Mudanca[];
const registrados = registro.registrados as Record<string, { nome: string; deferimento: string; numero: number }>;

export type Partido = {
  chave: string;
  id: string;
  sigla: string; // como aparece nos arquivos do TSE, na eleição mais recente
  nome: string | null; // nome completo, de acordo com o TSE
  fonteNome: string | null;
  registro: { nome: string; deferimento: string; numero: number } | null;
  depois: Mudanca[]; // o que aconteceu com o partido (passou a se chamar, fundiu-se, foi incorporado)
  antes: Mudanca[]; // partidos que viraram este
  anos: number[]; // eleições municipais em Osasco com candidatura do partido
};

// Nome completo escrito como nome ("PARTIDO DOS TRABALHADORES" → "Partido dos Trabalhadores").
const nomePartidoBonito = (s: string) => nomeProprio(s).replace(/\bDo B\b/, "do B");

let _partidos: Map<string, Partido> | null = null;
export function partidos(): Map<string, Partido> {
  if (_partidos) return _partidos;
  const mapa = new Map<string, Partido>();
  const garante = (chave: string) => {
    if (!mapa.has(chave))
      mapa.set(chave, { chave, id: idPartido(chave), sigla: chave.replace(/-ANTIGO$/, ""), nome: null, fonteNome: null, registro: registrados[chave] ?? null, depois: [], antes: [], anos: [] });
    return mapa.get(chave)!;
  };
  const ultimoAno = new Map<string, number>();
  for (const p of pessoasTse)
    for (const c of p.candidaturas) {
      const k = chavePartido(c.partido, c.ano);
      if (!k || !emOsasco(c)) continue;
      const pt = garante(k);
      if (!pt.anos.includes(c.ano)) pt.anos.push(c.ano);
      if (c.ano >= (ultimoAno.get(k) ?? 0)) {
        ultimoAno.set(k, c.ano);
        pt.sigla = c.partido!;
      }
    }
  // Nome completo: o do registro no TSE para quem está registrado hoje; senão, o da última eleição municipal em Osasco.
  const nomes = partidosTse.nomes as Record<string, Record<string, string>>;
  for (const [sigla, porAno] of Object.entries(nomes))
    for (const [ano, nome] of Object.entries(porAno)) {
      const k = chavePartido(sigla, Number(ano));
      if (!k || !mapa.has(k)) continue;
      const pt = mapa.get(k)!;
      if (!pt.registro) {
        pt.nome = nomePartidoBonito(nome);
        pt.fonteNome = "tse-partidos-candidaturas";
      }
    }
  for (const pt of mapa.values()) {
    if (pt.registro) {
      pt.nome = pt.registro.nome;
      pt.fonteNome = "tse-partidos";
    }
    pt.anos.sort((a, b) => a - b);
  }
  // Mudanças de nome, fusões e incorporações; partido que só aparece nelas também ganha página.
  for (const m of mudancas) {
    for (const de of m.de) garante(de).depois.push(m);
    garante(m.para).antes.push(m);
  }
  for (const pt of mapa.values()) if (!pt.nome && registrados[pt.chave]) pt.nome = registrados[pt.chave].nome;
  _partidos = mapa;
  return mapa;
}
export const partidoPorId = (id: string) => [...partidos().values()].find((p) => p.id === id) ?? null;
export const partidoDe = (sigla: string | null | undefined, ano: number) => {
  const k = chavePartido(sigla, ano);
  return k ? (partidos().get(k) ?? null) : null;
};
// Nome curto do partido para listas: a sigla, como o TSE escreve.
// Como no De Olho em OZ: sigla para quem é conhecido pela sigla (PT, PL, MDB), nome para quem é conhecido pelo nome.
const PELO_NOME: Record<string, string> = {
  PODE: "Podemos",
  UNIAO: "União Brasil",
  REPUBLICANOS: "Republicanos",
  SOLIDARIEDADE: "Solidariedade",
  AVANTE: "Avante",
  CIDADANIA: "Cidadania",
  AGIR: "Agir",
  MOBILIZA: "Mobiliza",
  NOVO: "Novo",
  REDE: "Rede",
  PATRIOTA: "Patriota",
  DEMOCRATA: "Democrata",
  MISSAO: "Missão",
};
export function siglaExibida(p: Partido): string {
  if (PELO_NOME[p.chave]) return PELO_NOME[p.chave];
  const s = p.sigla.toUpperCase();
  if (s === "PCDOB" || s === "PC DO B") return "PCdoB";
  if (s === "PT DO B") return "PT do B";
  if (p.chave === "PSD-ANTIGO") return "PSD antigo";
  if (p.chave === "PL-ANTIGO") return "PL antigo";
  return p.sigla;
}
// Partido que só aparece nas mudanças (sem candidatura em Osasco) não tem página: o link vai para onde ele foi.
export const temPaginaPartido = (p: Partido) => p.anos.length > 0 || escrita("partidos", p.id) != null;

// ---------- Pessoas ----------
export type Pessoa = {
  id: string;
  nome: string; // nome de urna (ou o título da página escrita à mão)
  candidaturas: Candidatura[];
  escrita: boolean;
};

// ---------- Câmara Municipal desde 1962 (página oficial "Todas as Legislaturas") ----------
export type VereadorLeg = { nome: string; suplente: boolean; votos: number | null; pessoa: string | null };
export type SessaoLeg = { numero: number; inicio: string; fim: string; mesa: { cargo: string; nome: string; pessoa: string | null }[] };
export type LegCamara = { numero: number; titulo: string; inicio: string; fim: string; vereadores: VereadorLeg[]; sessoes: SessaoLeg[] };
export const LEGISLATURAS = (historico.legislaturas as LegCamara[]).slice().sort((a, b) => b.numero - a.numero);
export const HISTORICO_CAMARA = { url: historico.url, coletadoEm: historico.coletadoEm };

// Quem só aparece na lista da Câmara (sem candidatura nos arquivos do TSE, de 1996 em diante) ganha um identificador
// tirado do nome completo publicado pela Câmara.
const idsTse = new Set(pessoasTse.map((p) => p.id));
const idPorNomeCamara = new Map<string, string>();
for (const l of LEGISLATURAS)
  for (const v of l.vereadores)
    if (!v.pessoa && !idPorNomeCamara.has(v.nome)) {
      let id = slugify(v.nome);
      if (idsTse.has(id)) id = `${id}-vereador`;
      idPorNomeCamara.set(v.nome, id);
    }
const nomePorIdCamara = new Map([...idPorNomeCamara].map(([n, i]) => [i, n]));
// Pessoa de um nome da Câmara (vereador ou membro da Mesa).
export const pessoaDoNome = (nome: string, pessoa: string | null) => pessoa ?? idPorNomeCamara.get(nome) ?? null;

// Mandatos de uma pessoa na Câmara, com os cargos na Mesa Diretora, ano a ano.
export function mandatosCamara(id: string) {
  const lista: { leg: LegCamara; suplente: boolean; votos: number | null; nomeOficial: string; mesa: { cargo: string; inicio: string; fim: string }[] }[] = [];
  for (const l of [...LEGISLATURAS].reverse()) {
    const v = l.vereadores.find((x) => pessoaDoNome(x.nome, x.pessoa) === id);
    if (!v) continue;
    const mesa = l.sessoes.flatMap((s) => s.mesa.filter((m) => pessoaDoNome(m.nome, m.pessoa) === id).map((m) => ({ cargo: m.cargo, inicio: s.inicio, fim: s.fim })));
    lista.push({ leg: l, suplente: v.suplente, votos: v.votos, nomeOficial: v.nome, mesa });
  }
  return lista;
}

// Ganha página quem venceu alguma eleição em Osasco, quem disputou a Prefeitura (titular ou vice), quem exerceu mandato
// na Câmara em qualquer legislatura desde 1962 (inclusive suplentes que assumiram) e quem tem página escrita à mão.
// As demais candidaturas aparecem nas páginas das eleições, sem link.
const naCamara = new Set([...CAMARA.vereadores.map((v) => v.pessoa), ...LEGISLATURAS.flatMap((l) => l.vereadores.map((v) => v.pessoa)).filter(Boolean)]);
const temPagina = (p: PessoaTse) =>
  !!p.urna && (naCamara.has(p.id) || p.candidaturas.some((c) => emOsasco(c) && (venceu(c) || c.cargo !== "Vereador")));

let _pessoas: Map<string, Pessoa> | null = null;
export function pessoas(): Map<string, Pessoa> {
  if (_pessoas) return _pessoas;
  const mapa = new Map<string, Pessoa>();
  for (const p of pessoasTse) {
    const e = escrita("pessoas", p.id);
    if (!temPagina(p) && !e) continue;
    mapa.set(p.id, { id: p.id, nome: e?.cab.titulo ?? nomeProprio(p.urna ?? ""), candidaturas: p.candidaturas, escrita: !!e });
  }
  for (const [id, nome] of nomePorIdCamara) {
    const e = escrita("pessoas", id);
    mapa.set(id, { id, nome: e?.cab.titulo ?? nome, candidaturas: [], escrita: !!e });
  }
  for (const e of escritas("pessoas"))
    if (!mapa.has(e.id)) mapa.set(e.id, { id: e.id, nome: e.cab.titulo ?? e.id, candidaturas: [], escrita: true });
  _pessoas = mapa;
  return mapa;
}
export const pessoa = (id: string) => pessoas().get(id) ?? null;

// Todas as candidaturas de uma eleição municipal em Osasco, com o id da pessoa (tenha ela página ou não).
export function candidaturasDe(ano: number) {
  const lista: (Candidatura & { pessoa: string; nome: string; temPagina: boolean })[] = [];
  const ps = pessoas();
  for (const p of pessoasTse)
    for (const c of p.candidaturas)
      if (c.ano === ano && emOsasco(c)) lista.push({ ...c, pessoa: p.id, nome: c.urna || p.urna ? nomeProprio((c.urna ?? p.urna)!) : "Nome não informado no arquivo", temPagina: ps.has(p.id) });
  return lista;
}

// ---------- Eleições ----------
export type Eleicao = { ano: number; dadosTse: boolean; escrita: boolean };
export function eleicoes(): Eleicao[] {
  const anos = new Set<number>([...ANOS_MUNICIPAIS, ...escritas("eleicoes").map((e) => Number(e.id))]);
  return [...anos]
    .sort((a, b) => b - a)
    .map((ano) => ({ ano, dadosTse: ANOS_MUNICIPAIS.includes(ano), escrita: !!escrita("eleicoes", String(ano)) }));
}

// Chapa da Prefeitura: titular e vice com o mesmo número, no mesmo ano.
export function chapas(ano: number) {
  const cs = candidaturasDe(ano);
  const titulares = cs.filter((c) => c.cargo === "Prefeito");
  return titulares
    .map((t) => ({ titular: t, vice: cs.find((v) => v.cargo === "Vice-prefeito" && v.numero === t.numero) ?? null }))
    .sort((a, b) => (b.titular.votos2turno ?? -1) - (a.titular.votos2turno ?? -1) || (b.titular.votos ?? -1) - (a.titular.votos ?? -1));
}

// ---------- Legislaturas e mandatos ----------
// Mandato de quatro anos, começando no ano seguinte ao da eleição (Constituição, art. 29).
export const periodo = (ano: number) => `${ano + 1}-${ano + 4}`;
export const periodoTexto = (ano: number) => `${ano + 1}–${ano + 4}`;
// Legislaturas: as 16 da página oficial da Câmara. O id é o período ("2025-2028"); "ano" é a eleição que preencheu as
// vagas quando há dados do TSE (1996 em diante), ou a de 1962 para a primeira.
const anoInicio = (iso: string) => Number(iso.slice(0, 4));
export const legislaturas = () =>
  LEGISLATURAS.map((l) => {
    const ini = anoInicio(l.inicio);
    const fim = anoInicio(l.fim);
    const ano = ANOS_MUNICIPAIS.includes(ini - 1) ? ini - 1 : l.numero === 1 ? 1962 : null;
    return { id: `${ini}-${fim}`, numero: l.numero, periodo: `${ini}–${fim}`, ano, leg: l };
  });
export const legislaturaDaEleicao = (ano: number) => legislaturas().find((l) => l.ano === ano) ?? null;
export const eleitosCamara = (ano: number) =>
  candidaturasDe(ano)
    .filter((c) => c.cargo === "Vereador" && venceu(c))
    .sort((a, b) => (b.votos ?? 0) - (a.votos ?? 0));
