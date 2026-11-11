// Decretos do Executivo de política pública lidos na Imprensa Oficial do Município (scripts/importar-decretos-iomo.mjs,
// dados/decretos-iomo.json). Ficam de fora os atos sobre pessoas (nomeações, aposentadorias...), desapropriações e
// créditos orçamentários.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type Decreto = {
  numero: number;
  data: string;
  ementa: string;
  assinatura: { nome: string; cargo: string };
  edicao: { numero: string; data: string; url: string };
};
type Arquivo = { fonte: string; url: string; coletadoEm: string; decretos: Decreto[] };
const ARQ = path.join(process.cwd(), "dados", "decretos-iomo.json");
let _d: Arquivo | null = null;
export const dadosDecretos = (): Arquivo =>
  (_d ??= existsSync(ARQ) ? (JSON.parse(readFileSync(ARQ, "utf8")) as Arquivo) : { fonte: "", url: "", coletadoEm: "", decretos: [] });
export const decretos = () => dadosDecretos().decretos;
export const anosDecretos = () => [...new Set(decretos().map((d) => Number(d.data.slice(0, 4))))].sort((a, b) => b - a);
export const decretosDoAno = (ano: number) => decretos().filter((d) => d.data.startsWith(String(ano)));
export const decretosEntre = (inicio: string, fim: string) => decretos().filter((d) => d.data >= inicio && d.data <= fim);
export const edicoesDecretos = () => [...new Map(decretos().map((d) => [d.edicao.numero, d.edicao])).values()];
