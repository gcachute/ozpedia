// Fontes: as escritas à mão em conteudo/fontes.yml e as dos dados do TSE, montadas aqui para cada eleição.
import { readFileSync } from "node:fs";
import path from "node:path";
import { load as lerYaml } from "js-yaml";
import tse from "../../dados/tse.json";

export type Fonte = {
  id: string;
  titulo: string;
  autor: string;
  url?: string;
  data?: string;
  consultado?: string;
  nota?: string;
};

const ANOS_TSE = [1996, 1998, 2000, 2002, 2004, 2006, 2008, 2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024, 2026];

function geradas(): Fonte[] {
  const coleta = tse.coletadoEm;
  const lista: Fonte[] = [];
  for (const ano of ANOS_TSE) {
    lista.push({
      id: `tse-candidatos-${ano}`,
      titulo: `Candidatos ${ano}: arquivo consulta_cand_${ano} (São Paulo)`,
      autor: "Tribunal Superior Eleitoral, Portal de Dados Abertos",
      url: `https://dadosabertos.tse.jus.br/dataset/candidatos-${ano}`,
      consultado: coleta,
      nota: "Cargo, partido, número, situação da candidatura e resultado.",
    });
    lista.push({
      id: `tse-resultados-${ano}`,
      titulo: `Resultados ${ano}: votação nominal por município e zona, arquivo votacao_candidato_munzona_${ano} (São Paulo)`,
      autor: "Tribunal Superior Eleitoral, Portal de Dados Abertos",
      url: `https://dadosabertos.tse.jus.br/dataset/resultados-${ano}`,
      consultado: coleta,
      nota: "Votos somados nas zonas de Osasco.",
    });
  }
  lista.push({
    id: "tse-trajetorias",
    titulo: "Candidaturas de 1996 a 2026 (arquivos consulta_cand e votacao_candidato_munzona de cada eleição)",
    autor: "Tribunal Superior Eleitoral, Portal de Dados Abertos",
    url: "https://dadosabertos.tse.jus.br/",
    consultado: coleta,
    nota:
      "A mesma pessoa é reconhecida de uma eleição para outra pelos dados do próprio TSE. Votos só em Osasco; nas eleições estaduais e federais, só o resultado.",
  });
  lista.push({
    id: "tse-partidos-candidaturas",
    titulo: "Nome do partido em cada eleição municipal (coluna NM_PARTIDO dos arquivos consulta_cand, candidaturas de Osasco)",
    autor: "Tribunal Superior Eleitoral, Portal de Dados Abertos",
    url: "https://dadosabertos.tse.jus.br/",
    consultado: coleta,
  });
  return lista;
}

let todas: Map<string, Fonte> | null = null;
export function fontes(): Map<string, Fonte> {
  if (todas) return todas;
  const escritas = lerYaml(readFileSync(path.join(process.cwd(), "conteudo", "fontes.yml"), "utf8")) as Record<string, Omit<Fonte, "id">>;
  todas = new Map();
  for (const [id, f] of Object.entries(escritas ?? {})) todas.set(id, { id, ...f, consultado: f.consultado ? String(f.consultado) : undefined, data: f.data ? String(f.data) : undefined });
  for (const f of geradas()) todas.set(f.id, f);
  return todas;
}

export function fonte(id: string): Fonte {
  const f = fontes().get(id);
  if (!f) throw new Error(`Fonte "${id}" não existe em conteudo/fontes.yml`);
  return f;
}

// Referências de uma página: cada fonte citada ganha um número, na ordem em que aparece pela primeira vez.
export class Referencias {
  ids: string[] = [];
  cita(id: string): number {
    fonte(id); // confere que existe
    const i = this.ids.indexOf(id);
    if (i >= 0) return i + 1;
    this.ids.push(id);
    return this.ids.length;
  }
}
