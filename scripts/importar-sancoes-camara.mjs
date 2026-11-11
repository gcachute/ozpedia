// Sanções de leis publicadas pela Câmara Municipal de Osasco: uma tabela por página, com o autógrafo, o projeto de lei,
// o autor, as datas de envio e do prazo de sanção, o número e a data da lei, o veto (quando houve) e o assunto.
// Páginas: https://www.osasco.sp.leg.br/sancoes-de-leis (1996 em diante), .../sancoes-de-leis-complementares e as
// páginas por ano (.../sancoes-de-leis-2017 a 2026), que trazem anos que faltam na página geral.
// Rode com: npm run importar:sancoes. Grava dados/sancoes-camara.json.
import { writeFileSync } from "node:fs";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..");
const UA = "Mozilla/5.0 (OZpediaArquivo/0.1; arquivo historico)";
const BASE = "https://www.osasco.sp.leg.br/";
const ANO_ATUAL = new Date().getFullYear();
const PAGINAS = [
  { pagina: "sancoes-de-leis", tipo: "lei" },
  { pagina: "sancoes-de-leis-complementares", tipo: "complementar" },
  ...Array.from({ length: ANO_ATUAL - 2016 }, (_, i) => ({ pagina: `sancoes-de-leis-${2017 + i}`, tipo: "lei" })),
];

const ENTIDADES = { nbsp: " ", amp: "&", quot: '"', lt: "<", gt: ">", ordm: "º", ordf: "ª", deg: "°", ndash: "–", mdash: "—", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’" };
// Entidades de letra acentuada ("&oacute;" → "ó", "&Atilde;" → "Ã").
const MARCAS = { acute: "́", grave: "̀", tilde: "̃", circ: "̂", cedil: "̧", uml: "̈" };
const acento = (n) => {
  const m = n.match(/^([a-zA-Z])(acute|grave|tilde|circ|cedil|uml)$/);
  return m ? (m[1] + MARCAS[m[2]]).normalize("NFC") : null;
};
const texto = (h) =>
  h
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTIDADES[n] ?? ENTIDADES[n.toLowerCase()] ?? acento(n) ?? m)
    .replace(/\s+/g, " ")
    .trim();

// "28/01/26" → "2026-01-28"; "03/03/1997" → "1997-03-03"; o resto → null.
function data(s) {
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (!m) return null;
  let ano = Number(m[3]);
  if (m[3].length === 2) ano += ano >= 60 ? 1900 : 2000;
  if (ano < 1962 || ano > ANO_ATUAL) return null;
  const mes = Number(m[2]);
  const dia = Number(m[1]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > new Date(ano, mes, 0).getDate()) return null; // "40/04/08", "15/16/15"
  return `${ano}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}
const numero = (s) => (/^\d[\d.]*$/.test(s) ? Number(s.replace(/\./g, "")) : null);

async function baixar(pagina) {
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(BASE + pagina, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(60000) });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(String(r.status));
      return await r.text();
    } catch {
      await new Promise((ok) => setTimeout(ok, 5000 * (t + 1)));
    }
  }
  console.warn("não baixou:", pagina);
  return null;
}

const itens = [];
for (const { pagina, tipo } of PAGINAS) {
  const html = await baixar(pagina);
  if (!html) continue;
  let colunas = null;
  let n = 0;
  for (const tr of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const celulas = [...tr[1].matchAll(/<t([dh])[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => texto(c[2]));
    if (celulas.some((c) => /^Autógrafo/i.test(c)) && celulas.some((c) => /^Assunto/i.test(c))) {
      colunas = celulas.map((c) => c.toLowerCase());
      continue;
    }
    if (!colunas || celulas.length !== colunas.length) continue;
    const col = (nome) => celulas[colunas.findIndex((c) => c.startsWith(nome))] ?? "";
    const assunto = col("assunto");
    if (!assunto) continue;
    const veto = col("veto");
    itens.push({
      tipo,
      autografo: col("autógrafo") || null,
      projeto: col("projeto") || null,
      autor: col("autor") || null,
      dataEnvio: data(col("data de envio")),
      lei: numero(col("lei")),
      dataLei: data(col("data da lei")),
      veto: veto && !/^-+$/.test(veto) ? veto : null,
      assunto,
      pagina: BASE + pagina,
    });
    n++;
  }
  console.log(pagina, n);
}

// A mesma linha aparece na página geral e na do ano: fica uma só (mesmo tipo, autógrafo, projeto e lei).
const vistos = new Set();
const unicos = itens.filter((i) => {
  const k = `${i.tipo}|${i.autografo}|${i.projeto}|${i.lei}|${i.assunto.slice(0, 40)}`;
  if (vistos.has(k)) return false;
  vistos.add(k);
  return true;
});

writeFileSync(
  path.join(raiz, "dados", "sancoes-camara.json"),
  JSON.stringify({ fonte: "Câmara Municipal de Osasco, Sanções de Leis", url: BASE + "sancoes-de-leis", coletadoEm: new Date().toISOString().slice(0, 10), itens: unicos }, null, 0) + "\n",
);
console.log(`${unicos.length} linhas (${itens.length} lidas)`);
