// Julgamentos do Tribunal de Contas do Estado sobre órgãos de Osasco, lidos nos resultados publicados de cada sessão
// (dados/tce-julgamentos.json). Só entram itens com resultado de mérito; não entram aposentadorias, admissões e pensões,
// nem nomes de advogados e de responsáveis que não são o prefeito, a prefeita ou o presidente da Câmara.
import { readFileSync } from "node:fs";
import path from "node:path";

export type JulgamentoTce = {
  data: string;
  orgao: string;
  arquivo: string;
  processo: string;
  entidade: string;
  assunto: string;
  contratada: string | null;
  julgamento: string | null;
  resultado: string;
  pessoas: string[];
};
type Dados = { fonte: string; url: string; coletadoEm: string; itens: JulgamentoTce[] };

let _d: Dados | null = null;
export const dadosTce = () => (_d ??= JSON.parse(readFileSync(path.join(process.cwd(), "dados", "tce-julgamentos.json"), "utf8")) as Dados);
export const julgamentosTce = () => [...dadosTce().itens].sort((a, b) => b.data.localeCompare(a.data) || a.processo.localeCompare(b.processo));
export const anosTce = () => [...new Set(julgamentosTce().map((j) => j.data.slice(0, 4)))].sort().reverse();
export const julgamentosTcePessoa = (id: string) => julgamentosTce().filter((j) => j.pessoas.includes(id));

export const fonteTce = (j: JulgamentoTce) => `tce-sessao-${j.arquivo}`;
export const urlTce = (arquivo: string) => `https://www.tce.sp.gov.br/sites/default/files/noticias/${arquivo}.pdf`;
export const sessoesTce = () => [...new Map(julgamentosTce().map((j) => [j.arquivo, j])).values()];

// Tipo de julgamento, pelo que o próprio item descreve.
export function tipoTce(j: JulgamentoTce): string {
  const t = `${j.julgamento ?? ""}`;
  if (/^Recurso Ordin/i.test(t)) return "Recurso";
  if (/^Embargos/i.test(t)) return "Embargos de declaração";
  if (/^Pedido de Reexame/i.test(t)) return "Pedido de reexame";
  if (/^A[çc][ãa]o de (Revis|Rescis)/i.test(t)) return "Ação de revisão ou rescisão";
  if (/^Agravo/i.test(t)) return "Agravo";
  if (/Contas Anuais/i.test(j.assunto)) return "Contas anuais";
  return "Julgamento";
}
