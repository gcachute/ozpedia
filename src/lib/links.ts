// Endereço e título de cada página do arquivo, a partir do caminho curto usado nos links internos
// ("pessoas/emidio", "partidos/pt", "eleicoes/1962", "legislaturas/2025-2028", "fatos/emancipacao-de-osasco").
import { escrita, escritas } from "./conteudo";
import { CAMARA, idLei, tituloLei } from "./camara";
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
      return l ? `${l.numero}ª Legislatura (${l.periodo})` : null;
    }
    case "fatos":
      return escrita(tipo, id)?.cab.titulo ?? null;
    case "leis":
      if (!id) return "Leis e projetos";
      return tituloLei(id) ?? escrita("leis", id)?.cab.titulo ?? null;
    case "projetos":
      return "Proposições da legislatura 2025–2028";
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
  for (const l of legislaturas()) lista.push({ caminho: `legislaturas/${l.id}`, titulo: `${l.numero}ª Legislatura (${l.periodo})`, tipo: "Legislatura" });
  for (const f of escritas("fatos")) lista.push({ caminho: `fatos/${f.id}`, titulo: f.cab.titulo ?? f.id, tipo: "Fato" });
  const leis = new Set([...CAMARA.leis.map(idLei), ...escritas("leis").map((f) => f.id)]);
  for (const id of leis) lista.push({ caminho: `leis/${id}`, titulo: titulo(`leis/${id}`) ?? id, tipo: "Lei" });
  lista.push({ caminho: "camara", titulo: "Câmara Municipal de Osasco", tipo: "Instituição" });
  lista.push({ caminho: "prefeitura", titulo: "Prefeitura de Osasco", tipo: "Instituição" });
  return lista;
}

export const tiposComTexto = () => ({ fatos: escritas("fatos").length, leis: escritas("leis").length });
