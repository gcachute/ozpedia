// Detalhes das eleições municipais de Osasco (dados/eleicoes-tse.json): datas, vagas, comparecimento, votos por partido,
// coligações e o que cada candidatura declarou ao TSE (ocupação, escolaridade, naturalidade), mais as contas de 2024.
import dados from "../../dados/eleicoes-tse.json";
import { nomeProprio } from "./texto";

export type Turno = { aptos: number; comparecimento: number; abstencoes: number; validos: number; nominais: number; legenda: number; brancos: number; nulos: number | null; secoes: number | null };
export type PartidoCamara = { sigla: string; nome: string | null; numero: string; coligacao: string | null; composicao: string | null; federacao: string | null; nominais: number; legenda: number };
export type AnoTse = {
  datas: Record<string, string>;
  posse: string | null;
  vagas: Record<string, number>;
  zonas: number;
  turnos: Record<string, Turno>;
  partidosCamara: PartidoCamara[];
  coligacoes: { numero: string; nome: string | null; composicao: string }[];
};
export type DetalheCandidatura = {
  ocupacao: string | null;
  instrucao: string | null;
  naturalidade: string | null;
  coligacao: string | null;
  composicao: string | null;
  federacao: string | null;
  composicaoFederacao: string | null;
  reeleicao: boolean | null;
};
export type Campanha = { receitas: number | null; receitasPorOrigem: Record<string, number>; despesas: number | null; maioresDespesas: [string, number][]; bens: number | null };

const D = dados as unknown as { anos: Record<string, AnoTse>; candidaturas: Record<string, DetalheCandidatura>; campanhas2024: Record<string, Campanha> };

export const anoTse = (ano: number) => D.anos[String(ano)] ?? null;
export const detalhe = (ano: number, cargo: string, numero: string | null) => (numero ? (D.candidaturas[`${ano}|${cargo}|${numero}`] ?? null) : null);
export const campanha2024 = (cargo: string, numero: string | null) => (numero ? (D.campanhas2024[`2024|${cargo}|${numero}`] ?? null) : null);

// "EMPRESÁRIA/EMPRESÁRIO" → "empresária/empresário"; "SUPERIOR COMPLETO" → "superior completo".
export const minusculas = (s: string | null) => (s ? s.toLowerCase().replace(/\s+/g, " ").trim() : null);
// "INUBIA PAULISTA/SP" → "Inubia Paulista, SP"
export const lugar = (s: string | null) => {
  if (!s) return null;
  const [m, uf] = s.split("/");
  return `${nomeProprio(m.replace(/\s*-\s*[A-Z]{2}$/, ""))}${uf ? `, ${uf}` : ""}`;
};

// Siglas que formam uma coligação ou federação, como o TSE escreve: "PT / PC do B / Federação X (13-PT / 65-PC do B)".
export function siglasDaComposicao(composicao: string | null): string[] {
  if (!composicao) return [];
  const siglas: string[] = [];
  const semFederacao = composicao.replace(/Federa[çc][ãa]o[^(]*\(([^)]*)\)/gi, (_, dentro: string) => {
    for (const x of dentro.split("/")) siglas.push(x.replace(/^\s*\d+-/, "").trim());
    return "";
  });
  for (const x of semFederacao.split("/")) if (x.trim()) siglas.push(x.trim());
  return siglas;
}
export const mesmaSigla = (a: string, b: string) => a.toUpperCase().replace(/\s+/g, "") === b.toUpperCase().replace(/\s+/g, "");

export const pct = (parte: number, todo: number) => (todo ? `${((100 * parte) / todo).toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%` : "");
export const reais = (v: number | null) => (v == null ? "" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }));

// "COLIGAÇÃO NOVOS TEMPOS PARA OSASCO" → "NOVOS TEMPOS PARA OSASCO" (a palavra já aparece no rótulo).
export const semPrefixo = (nome: string | null) => (nome ? nome.replace(/^(COLIGA[ÇC][ÃA]O|Coliga[çc][ãa]o)\s+/, "").replace(/^Federa[çc][ãa]o\s+/i, "") : nome);
