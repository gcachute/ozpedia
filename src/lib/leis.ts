// Leis municipais publicadas na Imprensa Oficial do Município de Osasco (scripts/importar-leis-iomo.mjs,
// dados/leis-iomo.json). Autoria e sanção ligadas às páginas das pessoas pelo nome publicado.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { EXERCERAM, LEGISLATURAS, pessoa, pessoas, pessoaDoNome } from "./dados";
import { CAMARA } from "./camara";
import { sucessaoPrefeitura } from "./prefeitos";
import { convocacoes } from "./convocacoes";

export type LeiIomo = {
  key: string;
  lei: string;
  complementar: boolean;
  numero: number;
  data: string;
  dataCabecalho?: string; // data do cabeçalho publicado, quando difere da do fecho (erro de digitação na publicação)
  ementa: string;
  projeto: { numero: number; ano: number } | null;
  autoriaTexto: string | null;
  assinatura: { nome: string; cargo: string };
  referendos?: { nome: string; cargo: string }[];
  vetoRejeitado?: string; // lei promulgada pela Câmara depois de rejeitar o veto ("total", "parcial" ou "sim")
  edicao: { numero: string; data: string; url: string };
  texto: string;
};
type Arquivo = { fonte: string; url: string; coletadoEm: string; edicoesLidas: number; leis: LeiIomo[] };

const ARQ = path.join(process.cwd(), "dados", "leis-iomo.json");
let _dados: Arquivo | null = null;
export function dadosLeis(): Arquivo {
  if (!_dados) _dados = existsSync(ARQ) ? (JSON.parse(readFileSync(ARQ, "utf8")) as Arquivo) : { fonte: "", url: "", coletadoEm: "", edicoesLidas: 0, leis: [] };
  return _dados;
}
export const leisIomo = () => dadosLeis().leis;

// "Lei nº 5.448" → "lei-5448"; "Lei Complementar nº 312" → "lei-complementar-312" (o mesmo de camara.ts).
export const idLeiIomo = (l: LeiIomo) => `lei-${l.complementar ? "complementar-" : ""}${l.numero}`;
let _porId: Map<string, LeiIomo> | null = null;
export const leiIomo = (id: string) => (_porId ??= new Map(leisIomo().map((l) => [idLeiIomo(l), l]))).get(id) ?? null;

export const anosLeis = () => [...new Set(leisIomo().map((l) => Number(l.data.slice(0, 4))))].sort((a, b) => b - a);
export const leisDoAno = (ano: number) => leisIomo().filter((l) => l.data.startsWith(String(ano)));
export const fonteEdicao = (l: LeiIomo) => `iomo-${l.edicao.numero}`;

// Números entre a primeira e a última lei do ano que não foram achados em nenhuma edição lida, em faixas ("4.290 a 4.300").
export function numerosFaltando(ano: number, complementar: boolean): [number, number][] {
  const todos = new Set(leisIomo().filter((l) => l.complementar === complementar).map((l) => l.numero));
  const doAno = leisDoAno(ano)
    .filter((l) => l.complementar === complementar)
    .map((l) => l.numero)
    .sort((a, b) => a - b);
  const faixas: [number, number][] = [];
  if (!doAno.length) return faixas;
  for (let n = doAno[0]; n <= doAno.at(-1)!; n++) {
    if (todos.has(n)) continue;
    const ult = faixas.at(-1);
    if (ult && ult[1] === n - 1) ult[1] = n;
    else faixas.push([n, n]);
  }
  return faixas;
}
export const edicoesUsadas = () => [...new Map(leisIomo().map((l) => [l.edicao.numero, l.edicao])).values()];

// ---------- Nomes → pessoas ----------
export const dobra = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const PALAVRAS_FRACAS = new Set(["de", "da", "do", "das", "dos", "e"]);
const fichas = (s: string) => dobra(s).split(" ").filter((w) => w && !PALAVRAS_FRACAS.has(w));

// Nomes conhecidos de cada pessoa: título da página, nomes de urna e nome completo publicado pela Câmara.
let _variantes: Map<string, Set<string>> | null = null;
export function variantes() {
  if (_variantes) return _variantes;
  const m = new Map<string, Set<string>>();
  const poe = (id: string, nome: string | null | undefined) => {
    if (!nome) return;
    if (!m.has(id)) m.set(id, new Set());
    m.get(id)!.add(dobra(nome));
  };
  for (const p of pessoas().values()) {
    poe(p.id, p.nome);
    for (const c of p.candidaturas) poe(p.id, c.urna);
  }
  for (const l of LEGISLATURAS) for (const v of l.vereadores) { const id = pessoaDoNome(v.nome, v.pessoa); if (id) poe(id, v.nome); }
  for (const v of CAMARA.vereadores) { poe(v.pessoa, v.nome); poe(v.pessoa, v.perfil.nomeCompleto); }
  for (const e of EXERCERAM) for (const n of e.nomes) poe(e.pessoa, n);
  // Nomes completos publicados nos atos de convocação de suplentes.
  for (const c of convocacoes()) {
    if (c.pessoaConvocado) poe(c.pessoaConvocado, c.convocado);
    if (c.pessoaTitular && c.titular) poe(c.pessoaTitular, c.titular);
  }
  _variantes = m;
  return m;
}

// Pessoa cujo nome bate com o texto: igual a um nome conhecido, ou todas as palavras de um nome conhecido (duas ou mais)
// aparecem no texto. Só vale quando uma única pessoa do grupo bate.
export function acharPessoa(texto: string, grupo: Iterable<string>): string | null {
  const alvo = dobra(texto);
  const fs = new Set(fichas(texto));
  const exatos = new Set<string>();
  const contidos = new Set<string>();
  for (const id of grupo) {
    for (const v of variantes().get(id) ?? []) {
      if (v === alvo) exatos.add(id);
      const vf = v.split(" ").filter((w) => w && !PALAVRAS_FRACAS.has(w));
      if (vf.length >= 2 && vf.every((w) => fs.has(w))) contidos.add(id);
      // Nome publicado mais curto que o conhecido ("Severino Tinha Di Ferreira" × "... dos Santos"): três palavras ou mais, todas no nome conhecido.
      else if (fs.size >= 3 && [...fs].every((w) => vf.includes(w))) contidos.add(id);
    }
  }
  if (exatos.size === 1) return [...exatos][0];
  if (contidos.size === 1) return [...contidos][0];
  return null;
}

// Quem foi vereador (inclusive suplente que assumiu) em algum momento.
let _vereadores: Set<string> | null = null;
export const vereadores = () =>
  (_vereadores ??= new Set([
    ...LEGISLATURAS.flatMap((l) => l.vereadores.map((v) => pessoaDoNome(v.nome, v.pessoa)).filter((x): x is string => !!x)),
    ...CAMARA.vereadores.map((v) => v.pessoa),
    ...EXERCERAM.map((e) => e.pessoa),
  ]));

// Grafias publicadas no Diário Oficial que não batem com nenhum nome conhecido, ligadas à mão depois de conferir que a
// pessoa era vereadora na data da lei (lista oficial de legislaturas da Câmara).
const GRAFIAS: Record<string, string> = {
  "francisco de paula de o leite": "de-paula-2012",
  "alex sandro de sousa sa": "alex-da-academia",
  "josias nascimento": "josias-da-juco",
  "andrea capriotti": "andrea-verginio-capriotti",
  "batista de souza moreira": "batista-comunidade",
  "michel figueiredo": "michel-figueredo",
  "doutor lindoso": "dr-marcio-lindoso",
  "adauto leonildo de sousa": "adauto-to",
};

// "do Vereador Gabriel de Paula Barbosa – Gabriel Saúde" → ["gabriel-saude"]; "dos Vereadores X e Y" → [x, y].
const _autores = new Map<string, string[]>();
export function autoresDe(l: LeiIomo): string[] {
  if (!l.autoriaTexto) return [];
  if (_autores.has(l.key)) return _autores.get(l.key)!;
  const t = l.autoriaTexto.replace(/^(d[oa]s?\s+)?(Sra?\.?\s+|Senhora?\s+)?(Vereador(?:a|es|as)?|Edis?)\s+/i, "");
  const ids: string[] = [];
  if (!/Mesa|Executivo|Prefeit|Comiss/i.test(t))
    for (const parte of t.split(/\s*,\s*|\s+e\s+(?=(?:d[oa]\s+)?(?:Vereador|[A-ZÁÉÍÓÚÂÊÔÃÕÇ]))/)) {
      const limpa = parte
        .replace(/^(d[oa]s?\s+)?(Sra?\.?\s+|Senhora?\s+)?Vereador(?:a)?\s+/i, "")
        .replace(/\s+e outros vereadores$/i, "")
        .trim();
      const grafia = GRAFIAS[dobra(limpa)];
      if (grafia) {
        if (!ids.includes(grafia)) ids.push(grafia);
        continue;
      }
      if (!limpa) continue;
      const pedacos = limpa.split(/\s+[–—-]\s+/);
      const id = acharPessoa(pedacos.at(-1)!, vereadores()) ?? acharPessoa(pedacos[0], vereadores()) ?? acharPessoa(limpa, vereadores());
      if (id && !ids.includes(id)) ids.push(id);
    }
  _autores.set(l.key, ids);
  return ids;
}

// Quem sancionou (prefeito, vice em exercício) ou promulgou (presidente da Câmara).
let _chefes: Set<string> | null = null;
const chefes = () =>
  (_chefes ??= new Set([
    ...sucessaoPrefeitura().flatMap((m) => [m.pessoa, m.vicePessoa]).filter((x): x is string => !!x),
    ...LEGISLATURAS.flatMap((l) => l.sessoes.flatMap((s) => s.mesa.filter((x) => x.cargo === "Presidente").map((x) => pessoaDoNome(x.nome, x.pessoa)))).filter(
      (x): x is string => !!x,
    ),
  ]));
const _sancao = new Map<string, string | null>();
export function quemAssinou(l: LeiIomo): string | null {
  if (!_sancao.has(l.key)) {
    // Presidência da Câmara "em exercício": pode ser qualquer vereador da Mesa.
    const grupo = /Presidente.*exerc/i.test(l.assinatura.cargo) ? new Set([...chefes(), ...vereadores()]) : chefes();
    const id = acharPessoa(l.assinatura.nome, grupo);
    _sancao.set(l.key, id && pessoa(id) ? id : null);
  }
  return _sancao.get(l.key)!;
}

export const leisDeAutoria = (id: string) => leisIomo().filter((l) => autoresDe(l).includes(id));
export const leisAssinadasPor = (id: string) => leisIomo().filter((l) => quemAssinou(l) === id);

// Cargo de quem assinou, em palavras que não dependem de gênero.
export const cargoAssinatura = (c: string) =>
  /Presidente/i.test(c) ? (/exerc/i.test(c) ? "Presidência da Câmara Municipal, em exercício" : "Presidência da Câmara Municipal") : /exerc/i.test(c) ? "Prefeitura de Osasco, em exercício" : "Prefeitura de Osasco";

// Leis que dão o nome da pessoa a um lugar ou equipamento ("Denomina JOSÉ SANTOS SASSO a Unidade de Pronto Atendimento"):
// a ementa trata de denominação e traz um nome completo conhecido da pessoa (três palavras ou mais) antes de qualquer
// menção à autoria ("Indicação do Vereador...", "de autoria...").
let _homenagens: Map<string, LeiIomo[]> | null = null;
export function homenagensA(id: string): LeiIomo[] {
  if (!_homenagens) {
    _homenagens = new Map();
    const ementas = leisIomo()
      .filter((l) => /denomina/i.test(l.ementa))
      .map((l) => ({ l, e: ` ${dobra(l.ementa.split(/Indica[çc][ãa]o|autoria|Aut[óo]grafo|Projeto de Lei/i)[0])} ` }));
    for (const [pid, nomes] of variantes())
      for (const n of nomes) {
        if (n.split(" ").length < 3) continue;
        for (const { l, e } of ementas)
          if (e.includes(` ${n} `)) {
            const lista = _homenagens.get(pid) ?? [];
            if (!lista.includes(l)) lista.push(l);
            _homenagens.set(pid, lista);
          }
      }
  }
  return _homenagens.get(id) ?? [];
}

// Quem assinou um ato do Executivo, pelo nome publicado (prefeitos e vices).
const _porNome = new Map<string, string | null>();
export function quemAssinouNome(nome: string): string | null {
  if (!_porNome.has(nome)) {
    const id = acharPessoa(nome, chefes());
    _porNome.set(nome, id && pessoa(id) ? id : null);
  }
  return _porNome.get(nome)!;
}
