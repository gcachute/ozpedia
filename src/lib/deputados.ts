// Atuação dos deputados ligados a Osasco na Câmara dos Deputados (dados/deputados-camara.json) e na Assembleia
// Legislativa de São Paulo (dados/deputados-alesp.json), lidos nos dados abertos de cada casa.
import { readFileSync } from "node:fs";
import path from "node:path";

export type ProposicaoFederal = { id: number; tipo: string; numero: number; ano: number; ementa: string; data: string | null };
export type DeputadoFederal = {
  pessoa: string;
  id: number;
  nome: string;
  legislaturas: number[];
  historico: { data: string; legislatura: number; partido: string; situacao: string | null; condicao: string | null; descricao: string }[];
  orgaos: { sigla: string; nome: string; cargo: string; inicio: string | null; fim: string | null; id: number }[];
  proposicoes: ProposicaoFederal[];
  osasco: ProposicaoFederal[];
  porTipo: Record<string, number>;
  cota: { porAno: Record<string, number>; porTipo: Record<string, number> };
  frentes: { titulo: string; legislatura: number; id: number }[];
};
export type PropositEstadual = { id: string; natureza: string; numero: string; ano: number; ementa: string; data: string | null };
export type DeputadoEstadual = {
  pessoa: string;
  id: number;
  nome: string | null;
  anos: [number, number] | null;
  porNatureza: Record<string, number>;
  apoio: number;
  proposituras: PropositEstadual[];
  osasco: PropositEstadual[];
  verba: { porAno: Record<string, number>; porTipo: Record<string, number> };
  comissoes: { sigla: string; nome: string | null; efetivo: boolean; inicio: string | null; fim: string | null }[];
};

const ler = <T>(arq: string): T => JSON.parse(readFileSync(path.join(process.cwd(), "dados", arq), "utf8")) as T;
type DadosFederal = { coletadoEm: string; tipos: Record<string, string>; deputados: DeputadoFederal[] };
type DadosEstadual = { coletadoEm: string; deputados: DeputadoEstadual[] };
let _f: DadosFederal | null = null;
let _e: DadosEstadual | null = null;
export const dadosCamaraFederal = (): DadosFederal => (_f ??= ler<DadosFederal>("deputados-camara.json"));
export const dadosAlesp = (): DadosEstadual => (_e ??= ler<DadosEstadual>("deputados-alesp.json"));

export const deputadoFederal = (pessoa: string) => dadosCamaraFederal().deputados.find((d) => d.pessoa === pessoa) ?? null;
export const deputadoEstadual = (pessoa: string) => dadosAlesp().deputados.find((d) => d.pessoa === pessoa) ?? null;

// Ementas trazem às vezes CPF (em pedidos de verba); o número sai.
export const limpaEmenta = (s: string) => s.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[número omitido]").replace(/\s+/g, " ").trim();

// Legislatura n da Câmara dos Deputados: 50ª = 1995–1999.
export const periodoLegislatura = (n: number) => `${1995 + (n - 50) * 4}–${1999 + (n - 50) * 4}`;

// "PASSAGEM AÉREA - SIGEPA" → "Passagem aérea"; "COMBUSTÍVEIS E LUBRIFICANTES." → "Combustíveis e lubrificantes".
export function nomeDespesa(t: string): string {
  const s = t.replace(/\s*-\s*SIGEPA\s*$/i, "").replace(/[.\s]+$/, "").trim().toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Para RPD a Câmara não tem um nome geral; o primeiro subtipo da lista é um caso particular.
const NOME_TIPO: Record<string, string> = { RPD: "Requerimento Procedimental" };
export const nomeTipoFederal = (sigla: string) => NOME_TIPO[sigla] ?? dadosCamaraFederal().tipos[sigla] ?? sigla;

// Plural dos nomes de tipo ("Projeto de Lei" → "projetos de lei").
export function pluralTipo(nome: string, n: number): string {
  // Minúsculas, menos siglas (CPI) e "Constituição".
  const m = nome
    .trim()
    .split(/\s+/)
    .map((p) => (/^[A-ZÀ-Ú]{2,}$/.test(p) || /^Constitui/.test(p) ? p : p.toLowerCase()))
    .join(" ");
  if (n === 1) return m;
  const [cabeca, ...resto] = m.split(" ");
  const pl: Record<string, string> = {
    projeto: "projetos",
    proposta: "propostas",
    emenda: "emendas",
    requerimento: "requerimentos",
    indicação: "indicações",
    moção: "moções",
    recurso: "recursos",
    documento: "documentos",
    medida: "medidas",
  };
  return [pl[cabeca] ?? cabeca, ...resto].join(" ");
}

// Fatos do mandato, pela descrição que a Câmara dá a cada mudança de situação.
export function fatoMandato(h: DeputadoFederal["historico"][number]): string | null {
  const d = h.descricao;
  if (/Posse de Eleito Titular/i.test(d)) return "Posse como titular";
  if (/Posse de Suplente/i.test(d)) return "Posse como suplente";
  if (/Efetiva[çc][ãa]o/i.test(d)) return "Efetivação no mandato";
  if (/Reassun[çc][ãa]o/i.test(d)) return "Volta ao mandato";
  if (/Término da Legislatura/i.test(d)) return "Fim da legislatura";
  if (/Renúncia/i.test(d)) return "Renúncia ao mandato";
  if (/Afastamento com prazo determinado|Licen[çc]a/i.test(d)) return "Afastamento por licença";
  if (/Afastamento definitivo/i.test(d)) return "Saída definitiva";
  if (/Alteração de partido/i.test(d)) return "Mudança de partido";
  if (/Convoca[çc][ãa]o/i.test(d) && h.situacao === "CONVOCADO") return "Convocação como suplente";
  return null;
}

export function fatosMandato(d: DeputadoFederal) {
  const vistos = new Set<string>();
  const lista: { data: string; fato: string; partido: string }[] = [];
  for (const h of d.historico) {
    const fato = fatoMandato(h);
    if (!fato) continue;
    const k = `${h.data.slice(0, 10)}|${fato}`;
    if (vistos.has(k)) continue;
    vistos.add(k);
    lista.push({ data: h.data.slice(0, 10), fato, partido: h.partido });
  }
  return lista;
}

export const urlProposicaoFederal = (id: number) => `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${id}`;
export const urlOrgaoFederal = (id: number) => `https://www.camara.leg.br/comissoes/${id}`;
export const urlPropositEstadual = (id: string) => `https://www.al.sp.gov.br/propositura/${id}`;

export const fonteFederal = (d: DeputadoFederal) => `camara-dep-dados-${d.pessoa}`;
export const fonteCota = (d: DeputadoFederal) => `camara-dep-cota-${d.pessoa}`;
export const FONTE_ALESP_PROPOSITURAS = "alesp-proposituras";
export const FONTE_ALESP_VERBA = "alesp-verba-gabinete";
export const FONTE_ALESP_COMISSOES = "alesp-comissoes";
