// Endereço e título de cada página do arquivo, a partir do caminho curto usado nos links internos
// ("pessoas/emidio", "partidos/pt", "eleicoes/1962", "legislaturas/2025-2028", "fatos/emancipacao-de-osasco").
import { escrita, escritas } from "./conteudo";
import { eleicoes, legislaturas, partidoPorId, partidos, pessoa, pessoas, periodoTexto, siglaExibida, temPaginaPartido } from "./dados";

export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function titulo(caminho: string): string | null {
  const [tipo, id] = caminho.split("/");
  switch (tipo) {
    case "pessoas":
      return pessoa(id)?.nome ?? null;
    case "partidos": {
      const p = partidoPorId(id);
      return p && temPaginaPartido(p) ? siglaExibida(p) : null;
    }
    case "eleicoes":
      return eleicoes().some((e) => String(e.ano) === id) ? `Eleição municipal de ${id}` : null;
    case "legislaturas": {
      const l = legislaturas().find((x) => x.id === id);
      return l ? `Legislatura ${periodoTexto(l.ano)}` : null;
    }
    case "fatos":
    case "leis":
      return escrita(tipo, id)?.cab.titulo ?? null;
    case "camara":
      return "Câmara Municipal de Osasco";
    case "prefeitura":
      return "Prefeitura de Osasco";
    default:
      return null;
  }
}

// Caminho dentro do site (sem o prefixo /arquivo; o <Link> do Next põe o prefixo sozinho).
export const href = (caminho: string) => `/${caminho.replace(/^\/|\/$/g, "")}/`;

// Todas as páginas, para a busca e para a conferência de links.
export type Pagina = { caminho: string; titulo: string; tipo: string };
export function todasAsPaginas(): Pagina[] {
  const lista: Pagina[] = [];
  for (const p of pessoas().values()) lista.push({ caminho: `pessoas/${p.id}`, titulo: p.nome, tipo: "Pessoa" });
  for (const p of partidos().values())
    if (temPaginaPartido(p)) lista.push({ caminho: `partidos/${p.id}`, titulo: `${siglaExibida(p)}${p.nome && p.nome.toUpperCase() !== p.sigla.toUpperCase() ? ` (${p.nome})` : ""}`, tipo: "Partido" });
  for (const e of eleicoes()) lista.push({ caminho: `eleicoes/${e.ano}`, titulo: `Eleição municipal de ${e.ano}`, tipo: "Eleição" });
  for (const l of legislaturas()) lista.push({ caminho: `legislaturas/${l.id}`, titulo: `Legislatura ${periodoTexto(l.ano)}`, tipo: "Legislatura" });
  for (const f of escritas("fatos")) lista.push({ caminho: `fatos/${f.id}`, titulo: f.cab.titulo ?? f.id, tipo: "Fato" });
  for (const f of escritas("leis")) lista.push({ caminho: `leis/${f.id}`, titulo: f.cab.titulo ?? f.id, tipo: "Lei ou projeto" });
  lista.push({ caminho: "camara", titulo: "Câmara Municipal de Osasco", tipo: "Instituição" });
  lista.push({ caminho: "prefeitura", titulo: "Prefeitura de Osasco", tipo: "Instituição" });
  return lista;
}

export const tiposComTexto = () => ({ fatos: escritas("fatos").length, leis: escritas("leis").length });
