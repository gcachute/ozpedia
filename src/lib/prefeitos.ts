// Sucessão na Prefeitura de Osasco desde 1962, em ordem: a lista escrita à mão até 1996 e, depois, as chapas que
// venceram as eleições com dados do TSE. Usada na página da Prefeitura e no quadro de cada pessoa (antecessor e sucessor).
import { readFileSync } from "node:fs";
import path from "node:path";
import { load as lerYaml } from "js-yaml";
import { ANOS_MUNICIPAIS, chapas, periodoTexto, pessoa } from "./dados";

// O arquivo do TSE não traz o vice de 1996 nem o de 2000 (ver "Como o arquivo é feito"); o nome vem da Galeria de Prefeitos.
export const VICE_GALERIA: Record<number, { nome: string; pessoa?: string; fonte: string }> = {
  1996: { nome: "Carlos José Gaspar", pessoa: "dr-gaspar", fonte: "prefeitura-galeria-silas-bortolosso" },
  2000: { nome: "Angelo Alberto Forsanaro Melli", fonte: "prefeitura-galeria-celso-giglio" },
};

export type PrefeitoAntigo = {
  pessoa: string;
  periodo: string;
  partido?: string;
  vice?: string;
  vicePessoa?: string;
  fontes: string[];
  nota?: string;
};

export type MandatoPrefeito = {
  pessoa: string | null;
  nome: string;
  periodo: string;
  vicePessoa: string | null;
  viceNome: string | null;
  fontes: string[];
};

let cache: MandatoPrefeito[] | null = null;

export function prefeitosAntigos(): PrefeitoAntigo[] {
  return (lerYaml(readFileSync(path.join(process.cwd(), "conteudo", "prefeitos-antes-de-1997.yml"), "utf8")) ?? []) as PrefeitoAntigo[];
}

export function sucessaoPrefeitura(): MandatoPrefeito[] {
  if (cache) return cache;
  const lista: MandatoPrefeito[] = prefeitosAntigos().map((a) => ({
    pessoa: pessoa(a.pessoa) ? a.pessoa : null,
    nome: pessoa(a.pessoa)?.nome ?? a.pessoa,
    periodo: a.periodo.replace(/\s*–\s*/, " a "),
    vicePessoa: a.vicePessoa && pessoa(a.vicePessoa) ? a.vicePessoa : null,
    viceNome: a.vice ?? null,
    fontes: a.fontes,
  }));
  for (const ano of ANOS_MUNICIPAIS) {
    const v = chapas(ano).find((c) => c.titular.resultado === "Eleito");
    if (!v) continue;
    const viceTse = v.vice?.nome && v.vice.nome !== "Nome não informado no arquivo" ? v.vice : null;
    const galeria = VICE_GALERIA[ano];
    lista.push({
      pessoa: v.titular.pessoa,
      nome: pessoa(v.titular.pessoa)?.nome ?? v.titular.nome,
      periodo: periodoTexto(ano),
      vicePessoa: viceTse ? viceTse.pessoa : galeria?.pessoa ?? null,
      viceNome: viceTse ? pessoa(viceTse.pessoa)?.nome ?? viceTse.nome : galeria?.nome ?? null,
      fontes: [`tse-candidatos-${ano}`, ...(galeria && !viceTse ? [galeria.fonte] : [])],
    });
  }
  cache = lista;
  return lista;
}
