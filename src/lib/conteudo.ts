// Páginas escritas à mão: arquivos Markdown em conteudo/<tipo>/<identificador>.md, com um cabeçalho (entre ---) para
// os dados da página e o texto embaixo. Ver conteudo/LEIAME.md.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type Tipo = "pessoas" | "partidos" | "eleicoes" | "legislaturas" | "fatos" | "leis" | "instituicoes";

// Um cargo citado à mão (o que não vem dos dados do TSE), sempre com a fonte.
export type CargoEscrito = { cargo: string; eleicao?: number; periodo?: string; fonte: string };

export type Cabecalho = {
  titulo?: string;
  resumo?: string;
  // pessoas
  cargos?: CargoEscrito[];
  // eleições escritas à mão (antes dos dados abertos do TSE)
  data?: string;
  fonteData?: string;
  eleitos?: { cargo: string; pessoa: string; partido?: string; fonte: string }[];
  // fatos
  quando?: string;
  fonteQuando?: string;
  relacionados?: string[];
};

export type Escrita = { tipo: Tipo; id: string; cab: Cabecalho; corpo: string; arquivo: string };

const RAIZ = path.join(process.cwd(), "conteudo");
const cache = new Map<Tipo, Escrita[]>();

export function escritas(tipo: Tipo): Escrita[] {
  const ja = cache.get(tipo);
  if (ja) return ja;
  const pasta = path.join(RAIZ, tipo);
  const lista = !existsSync(pasta)
    ? []
    : readdirSync(pasta)
        .filter((f) => f.endsWith(".md") && !f.startsWith("_"))
        .map((f) => {
          const arquivo = path.join(pasta, f);
          const { data, content } = matter(readFileSync(arquivo, "utf8"));
          // Datas no cabeçalho ficam como texto ("1962-02-04"), não como objeto de data.
          for (const [k, v] of Object.entries(data)) if (v instanceof Date) data[k] = v.toISOString().slice(0, 10);
          return { tipo, id: f.replace(/\.md$/, ""), cab: data as Cabecalho, corpo: content.trim(), arquivo };
        });
  cache.set(tipo, lista);
  return lista;
}

export const escrita = (tipo: Tipo, id: string) => escritas(tipo).find((e) => e.id === id) ?? null;
