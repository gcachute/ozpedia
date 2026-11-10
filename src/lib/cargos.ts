// Cargo dito pela instituição, para o texto não depender de gênero ("Prefeitura de Osasco", não "prefeito").
import type { Candidatura } from "./dados";

export function instituicao(c: Pick<Candidatura, "cargo" | "local">): string {
  const cargo = c.cargo.toLowerCase();
  if (cargo === "vereador") return "Câmara Municipal de Osasco";
  if (cargo === "prefeito") return "Prefeitura de Osasco";
  if (cargo === "vice-prefeito") return "Vice-prefeitura de Osasco";
  if (cargo === "deputado estadual") return "Assembleia Legislativa de São Paulo";
  if (cargo === "deputado federal") return "Câmara dos Deputados, por São Paulo";
  if (cargo === "senador") return "Senado Federal, por São Paulo";
  if (cargo.includes("suplente de senador")) return `Senado Federal, por São Paulo (${c.cargo.toLowerCase()})`;
  if (cargo === "governador") return "Governo de São Paulo";
  if (cargo === "vice-governador") return "Vice-governo de São Paulo";
  return c.cargo;
}

// Ordem para listar: Prefeitura antes da Câmara, Osasco antes do estado.
export const ordemCargo = (cargo: string) =>
  ["prefeito", "vice-prefeito", "vereador", "governador", "vice-governador", "senador", "deputado federal", "deputado estadual"].indexOf(cargo.toLowerCase()) >>> 0;

// "a Câmara Municipal de Osasco", "o Senado Federal, por São Paulo".
export const comArtigo = (inst: string) => (/^(Governo|Vice-governo|Senado)/.test(inst) ? `o ${inst}` : `a ${inst}`);
