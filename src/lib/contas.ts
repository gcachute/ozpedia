// Contas anuais da Prefeitura julgadas pela Câmara (conteudo/contas-prefeitura.yml, lidas nos decretos legislativos
// publicados na Imprensa Oficial do Município).
import { readFileSync } from "node:fs";
import path from "node:path";
import { load as lerYaml } from "js-yaml";

export type ContaAnual = {
  exercicio: number;
  resultado: "aprovadas" | "rejeitadas";
  decreto?: string;
  deliberacao?: string;
  parecerTce?: string;
  nota?: string;
  // Edição da Imprensa Oficial com o decreto; sem ela, a fonte é outra (fonte).
  edicao?: { numero: string; data: string; url: string };
  fonte?: string;
  // Parecer prévio do Tribunal de Contas vindo de outra fonte que não o decreto.
  parecer?: { texto: string; fontes: string[] };
};
let _contas: ContaAnual[] | null = null;
export const contasPrefeitura = () =>
  (_contas ??= ((lerYaml(readFileSync(path.join(process.cwd(), "conteudo", "contas-prefeitura.yml"), "utf8")) ?? []) as ContaAnual[]).sort(
    (a, b) => a.exercicio - b.exercicio,
  ));
export const fonteConta = (c: ContaAnual) => (c.edicao ? `iomo-${c.edicao.numero}` : c.fonte!);
export const contasEntre = (inicio: string, fim: string) =>
  contasPrefeitura().filter((c) => String(c.exercicio) >= inicio.slice(0, 4) && String(c.exercicio) <= fim.slice(0, 4));
