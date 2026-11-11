// Decretos do Executivo publicados na Imprensa Oficial do Município de Osasco (IOMO), lidos nas edições já guardadas em
// cache/iomo/ por scripts/importar-leis-iomo.mjs. Rode com: npm run importar:decretos
//
// De cada decreto ficam o número, a data, a ementa, quem assinou e a edição. O texto não é guardado.
// Ficam de fora os decretos sobre pessoas ou bens de particulares: nomeação, exoneração, designação, aposentadoria,
// pensão, servidor, cargo, e os de utilidade pública para desapropriação (trazem nomes de proprietários). Também os de
// crédito adicional ou suplementar (remanejamento de orçamento, centenas por ano).
// Grava dados/decretos-iomo.json.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..");
const CACHE = process.env.IOMO_CACHE ?? path.join(raiz, "cache", "iomo");
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const dobra = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const CABECALHO = /^\s{0,80}DECRETO\s+N[º°o.]*\s*([\d.]+)\s*,?\s*DE\s+(\d{1,2})[º°]?\s+DE\s+([A-ZÇa-zç]+)\s+DE\s+(\d{4})\s*\.?\s*$/i;
const FORMULA = /^\s*([\p{Lu}][\p{Lu}\p{M} .'-]+?)\s*,\s*(Prefeit[oa](?: Municipal)?(?: em [Ee]xerc[íi]cio)?)/u;
const FORA = /nomea|nomeia|exonera|designa|aposenta|pens[ãa]o|servidor|cargo|fun[çc][ãa]o gratificada|desapropria|utilidade p[úu]blica|cr[ée]dito (adicional|suplementar|especial)|abre cr[ée]dito|remaneja|transposi|reconhec\w+ (de )?d[ií]vida|readapta|licen[çc]a|f[ée]rias|gratifica|quinq|sexta[- ]parte|enquadra/i;
const numeroEdicao = (d) => path.basename(d.url).match(/^iomo-?(\d+)/i)?.[1] ?? d.title.replace(/IOMO/i, "").trim();

function decretosDaEdicao(doc, texto) {
  const linhas = texto.split("\n").map((l) => l.replace(/\f/g, ""));
  for (let i = 0; i + 1 < linhas.length; i++)
    if (/^\s*DECRETO\s+N[º°o.]*\s*[\d.]+/i.test(linhas[i]) && !CABECALHO.test(linhas[i]) && CABECALHO.test(`${linhas[i].trimEnd()} ${linhas[i + 1].trim()}`)) {
      linhas[i] = `${linhas[i].trimEnd()} ${linhas[i + 1].trim()}`;
      linhas[i + 1] = "";
    }
  const achados = [];
  for (let i = 0; i < linhas.length; i++) {
    const m = linhas[i].match(CABECALHO);
    if (!m) continue;
    const mes = MESES.indexOf(dobra(m[3]).replace("marco", "março"));
    if (mes < 0) continue;
    const data = `${m[4]}-${String(mes + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
    const ementa = [];
    let assinatura = null;
    for (let j = i + 1; j < Math.min(linhas.length, i + 25); j++) {
      const f = linhas[j].match(FORMULA);
      if (f) {
        const prox = linhas.slice(j, j + 8).join(" ");
        if (!/DECRETA/i.test(prox)) break; // fórmula de lei, não de decreto
        const emExercicio = /exerc/i.test(f[2]) || (/(^|\s)em\s*$/i.test(linhas[j]) && /^\s*exerc/i.test(linhas[j + 1] ?? ""));
        assinatura = { nome: f[1].trim(), cargo: emExercicio && !/exerc/i.test(f[2]) ? `${f[2]} em exercício` : f[2] };
        break;
      }
      if (CABECALHO.test(linhas[j])) break;
      const t = linhas[j].trim();
      if (t) ementa.push(t);
    }
    if (!assinatura) continue;
    const e = ementa
      .join(" ")
      .replace(/\s+/g, " ")
      .replace(/(\p{Ll})- (\p{Ll})/gu, "$1$2")
      .replace(/^[“"”]\s*/, "")
      .replace(/\s*[”"“]\s*\.?$/, "")
      .trim();
    if (!e || e.length < 12 || e.length > 600 || FORA.test(e)) continue;
    // Ementa misturada com o expediente ou o rodapé da página (edições em colunas).
    if (/IMPRESSO EM OFICINAS|EXPEDIENTE\s*-|Jornalista Respons|e-mail:|DISTRIBUI[ÇC][ÃA]O GRATUITA/i.test(e)) continue;
    // Ato sobre uma pessoa física ("box outorgada ao Sr. ...", "ponto de táxi da Sra. ..."); luto oficial fica.
    if ((/(^|\s)Sra?\.\s/.test(e) || /t[áa]xi d[ao] Sra?\./i.test(e)) && !/Luto Oficial/i.test(e)) continue;
    achados.push({
      numero: Number(m[1].replace(/\./g, "")),
      data,
      ementa: e,
      assinatura,
      edicao: { numero: numeroEdicao(doc), data: doc.date.replace(/\s/g, "").split("/").reverse().join("-"), url: doc.url },
    });
  }
  return achados;
}

const porNumero = new Map();
let lidas = 0;
for (const f of readdirSync(CACHE).filter((f) => f.endsWith(".txt.gz"))) {
  let txt;
  try {
    txt = gunzipSync(readFileSync(path.join(CACHE, f))).toString("utf8");
  } catch {
    continue;
  }
  lidas++;
  const q = txt.indexOf("\n");
  const doc = JSON.parse(txt.slice(0, q)).doc;
  for (const d of decretosDaEdicao(doc, txt.slice(q + 1))) {
    const ano = Number(d.data.slice(0, 4));
    if (ano > Number(doc.year) || ano < Number(doc.year) - 1) continue; // data incompatível com a edição (decreto citado)
    const atual = porNumero.get(d.numero);
    if (!atual || d.edicao.data < atual.edicao.data) porNumero.set(d.numero, d);
  }
}
const decretos = [...porNumero.values()].sort((a, b) => b.data.localeCompare(a.data) || b.numero - a.numero);
writeFileSync(
  path.join(raiz, "dados", "decretos-iomo.json"),
  JSON.stringify({ fonte: "Imprensa Oficial do Município de Osasco", url: "https://osasco.sp.gov.br/imprensa-oficial/", coletadoEm: new Date().toISOString().slice(0, 10), decretos }) + "\n",
);
console.log(`${decretos.length} decretos em ${lidas} arquivos`);
