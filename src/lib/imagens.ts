// Imagens das páginas.
// Pessoas: Wikimedia Commons (scripts/importar-imagens.mjs, dados/imagens.json) e, para quem não tem foto lá, fotos de
// candidatura do Portal de Dados Abertos do TSE (scripts/importar-fotos-tse.mjs, dados/imagens-tse.json).
// Demais páginas: Wikimedia Commons, escolhidas em conteudo/imagens-paginas.yml (campo "paginas" de dados/imagens.json).
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type Imagem = {
  arquivo: string;
  legenda: string;
  autor: string;
  licenca: string;
  licencaUrl: string | null;
  pagina: string;
  data: string | null;
  caminho: string;
  /** Id da fonte (em fontes.ts) que dá o crédito da imagem. */
  fonteId: string;
};

type Lido = Omit<Imagem, "fonteId">;

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function ler(nome: string): { imagens?: (Lido & { pessoa: string })[]; paginas?: (Lido & { chave: string })[] } {
  const arq = path.join(process.cwd(), "dados", nome);
  return existsSync(arq) ? JSON.parse(readFileSync(arq, "utf8")) : {};
}

let cachePessoas: Map<string, Imagem> | null = null;
let cachePaginas: Map<string, Imagem> | null = null;

export function imagens(): Map<string, Imagem> {
  if (cachePessoas) return cachePessoas;
  // O Commons tem prioridade: entra por último e substitui.
  const lista = [...(ler("imagens-tse.json").imagens ?? []), ...(ler("imagens.json").imagens ?? [])];
  cachePessoas = new Map(lista.map((i) => [i.pessoa, { ...i, fonteId: `imagem-${i.pessoa}` }]));
  return cachePessoas;
}

export function imagensDePagina(): Map<string, Imagem> {
  if (cachePaginas) return cachePaginas;
  const lista = ler("imagens.json").paginas ?? [];
  cachePaginas = new Map(lista.map((i) => [i.chave, { ...i, fonteId: `imagem-arquivo-${slug(i.arquivo)}` }]));
  return cachePaginas;
}

export const imagemDe = (pessoa: string) => imagens().get(pessoa) ?? null;

/** Imagem de uma página (chave = endereço, como "partidos/pt"); sem imagem própria, a padrão do tipo. */
export function imagemPagina(chave: string, tipo?: string): Imagem | null {
  const m = imagensDePagina();
  return m.get(chave) ?? (tipo ? m.get(`padrao/${tipo}`) : undefined) ?? null;
}

/** Fontes de crédito: uma por foto de pessoa e uma por arquivo usado nas demais páginas. */
export function fontesDeImagens(): { id: string; img: Imagem }[] {
  const porId = new Map<string, Imagem>();
  for (const i of imagens().values()) porId.set(i.fonteId, i);
  for (const i of imagensDePagina().values()) porId.set(i.fonteId, i);
  return [...porId.entries()].map(([id, img]) => ({ id, img }));
}
