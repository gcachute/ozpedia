// Pequenas regras de escrita usadas em todo o site.

export const slugify = (s: string) =>
  String(s)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const MINUSCULAS = new Set(["de", "da", "do", "das", "dos", "e", "di", "du", "del"]);

// O TSE escreve o nome de urna em maiúsculas ("DR. MÁRCIO LINDOSO"); no site ele aparece como nome ("Dr. Márcio Lindoso").
export function nomeProprio(s: string): string {
  return s
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((p, i) => {
      if (!p.trim() || p === "-") return p;
      if (i > 0 && MINUSCULAS.has(p)) return p;
      return p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join("");
}

export const numero = (n: number | null | undefined) => (n == null ? "" : n.toLocaleString("pt-BR"));

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

// "2026-11-09" → "9 de novembro de 2026"; "2004" fica "2004".
export function dataPorExtenso(iso: string | number | undefined | null): string {
  if (iso == null) return "";
  const s = String(iso);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return s;
  return `${Number(m[3])}${m[3] === "01" ? "º" : ""} de ${MESES[Number(m[2]) - 1]} de ${m[1]}`;
}

export const dataCurta = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

// Lista em português: "a", "a e b", "a, b e c".
export function listaE(itens: string[]): string {
  if (itens.length <= 1) return itens.join("");
  return `${itens.slice(0, -1).join(", ")} e ${itens.at(-1)}`;
}
