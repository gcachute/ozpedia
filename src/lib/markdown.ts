// Texto escrito à mão (Markdown) com duas marcas a mais:
//   [[pessoas/emidio]] ou [[pessoas/emidio|Emídio]]  → link para outra página do arquivo
//   [@ibge-historico-osasco]                         → chamada de fonte, numerada como nas referências da página
// Link para página que não existe e fonte que não existe param a montagem do site, para nada sair quebrado.
import { Marked, type TokenizerAndRendererExtension } from "marked";
import { Referencias } from "./fontes";
import { BASE, href, titulo } from "./links";

const escapa = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function linkInterno(caminho: string, texto?: string): string {
  const t = titulo(caminho);
  if (t == null) throw new Error(`Link para página que não existe: [[${caminho}]]`);
  return `<a href="${BASE}${href(caminho)}">${escapa(texto ?? t)}</a>`;
}

export function chamada(n: number): string {
  return `<sup class="ref"><a href="#ref-${n}" id="cita-${n}">[${n}]</a></sup>`;
}

export function markdown(texto: string, refs: Referencias): string {
  const wiki: TokenizerAndRendererExtension = {
    name: "wiki",
    level: "inline",
    start: (src) => src.indexOf("[["),
    tokenizer(src) {
      const m = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/.exec(src);
      if (m) return { type: "wiki", raw: m[0], caminho: m[1].trim(), texto: m[2]?.trim() };
    },
    renderer: (t) => linkInterno(t.caminho, t.texto),
  };
  const cita: TokenizerAndRendererExtension = {
    name: "cita",
    level: "inline",
    start: (src) => src.indexOf("[@"),
    tokenizer(src) {
      const m = /^\[@([a-z0-9-]+)\]/.exec(src);
      if (m) return { type: "cita", raw: m[0], id: m[1] };
    },
    renderer: (t) => chamada(refs.cita(t.id)),
  };
  const md = new Marked({ extensions: [wiki, cita], gfm: true });
  // Tabelas com o mesmo estilo das tabelas geradas, dentro de uma caixa com rolagem lateral no celular.
  return (md.parse(texto, { async: false }) as string)
    .replace(/<table>/g, '<div class="overflow-x-auto"><table class="tabela">')
    .replace(/<\/table>/g, "</table></div>");
}
