// Suplentes convocados para assumir uma vaga na Câmara, pelos atos da Presidência publicados na Imprensa Oficial do
// Município (scripts/importar-convocacoes-iomo.mjs, dados/convocacoes-iomo.json).
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type Convocacao = {
  convocado: string;
  apelido: string | null;
  titular: string | null;
  motivo: "licenca" | "cargo" | "impedimento" | "renuncia" | "judicial";
  dias: number | null;
  cargo: string | null;
  impedido: string | null;
  aPartirDe: string | null;
  ato: string | null;
  edicao: { numero: string; data: string; url: string };
  pessoaConvocado: string | null;
  pessoaTitular: string | null;
  pessoaImpedido: string | null;
};
type Arquivo = { fonte: string; url: string; coletadoEm: string; convocacoes: Convocacao[] };

const ARQ = path.join(process.cwd(), "dados", "convocacoes-iomo.json");
let _dados: Arquivo | null = null;
export function dadosConvocacoes(): Arquivo {
  if (!_dados) _dados = existsSync(ARQ) ? (JSON.parse(readFileSync(ARQ, "utf8")) as Arquivo) : { fonte: "", url: "", coletadoEm: "", convocacoes: [] };
  return _dados;
}
export const convocacoes = () => dadosConvocacoes().convocacoes;
// Data em que a convocação vale: a do ato, quando traz; senão, a da publicação.
export const dataConvocacao = (c: Convocacao) => c.aPartirDe ?? c.edicao.data;
export const fonteConvocacao = (c: Convocacao) => `iomo-${c.edicao.numero}`;
export const convocacoesEntre = (inicio: string, fim: string) => convocacoes().filter((c) => dataConvocacao(c) >= inicio && dataConvocacao(c) <= fim);
export const convocacoesDe = (id: string) => convocacoes().filter((c) => c.pessoaConvocado === id);
export const licencasDe = (id: string) => convocacoes().filter((c) => c.pessoaTitular === id);
export const pessoasConvocadas = () => new Set(convocacoes().map((c) => c.pessoaConvocado).filter((x): x is string => !!x));
export const edicoesConvocacoes = () => [...new Map(convocacoes().map((c) => [c.edicao.numero, c.edicao])).values()];
