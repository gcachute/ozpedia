// Suplentes convocados para assumir uma vaga na Câmara Municipal, pelos atos da Presidência da Câmara publicados na
// Imprensa Oficial do Município de Osasco (IOMO). Rode depois de `npm run importar:leis`, que baixa as edições para
// cache/iomo/. Rode com: npm run importar:convocacoes
//
// Cada ato diz: "Fica convocado o senhor FULANO, a fim de assumir o cargo de Vereador da Câmara Municipal de Osasco,
// [a partir de DATA,] em virtude de o senhor CICRANO encontrar-se licenciado por N dias | para exercer o cargo de
// Secretário... | da renúncia do vereador... | dos motivos apresentados pelo senhor X, que o impedem de assumir...".
// Guarda: quem foi convocado, no lugar de quem, o motivo (licença, licença para cargo no Executivo, renúncia,
// impedimento do suplente anterior, decisão judicial), a data de início quando o ato traz, o número do ato e a edição.
// O artigo da Lei Orgânica citado no ato (que distingue licença por doença de licença por interesse particular) não é
// guardado. Grava dados/convocacoes-iomo.json.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..");
const CACHE = process.env.IOMO_CACHE ?? path.join(raiz, "cache", "iomo");
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const dobra = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const NUMEROS = { trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, noventa: 90, "cento e vinte": 120 };

// "28 / 04 / 2025" → "2025-04-28"
const dataDoc = (d) => {
  const m = d.date?.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : `${d.year}-01-01`;
};
// O mesmo número de edição de scripts/importar-leis-iomo.mjs (as fontes são uma por edição).
const numeroEdicao = (d) => path.basename(d.url).match(/^iomo-?(\d+)/i)?.[1] ?? d.title.replace(/IOMO/i, "").trim();
const dataExtenso = (s) => {
  const m = s?.match(/(\d{1,2})[º°]?\s+de\s+(\p{L}+)\s+de\s+(\d{4})/u);
  if (!m) return null;
  const mes = MESES.indexOf(dobra(m[2]).replace("marco", "março"));
  return mes < 0 ? null : `${m[3]}-${String(mes + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
};
// Nome como publicado: "JOSÉ CARLOS FERREIRA SILVA (ZE CARLOS SANTA MARIA)" → nome e apelido; capitalizado.
const PEQUENAS = new Set(["de", "da", "do", "das", "dos", "e"]);
const capitaliza = (s) =>
  s
    .toLocaleLowerCase("pt-BR")
    .split(/\s+/)
    .map((w, i) => (i > 0 && PEQUENAS.has(w) ? w : w.charAt(0).toLocaleUpperCase("pt-BR") + w.slice(1)))
    .join(" ");
const limpaNome = (s) => {
  const t = s
    .replace(/^(?:o|a|e)\s+/i, "")
    .replace(/^(?:senhor|senhora|sr\.?|sra\.?|vereador|vereadora)\s+/i, "")
    .replace(/^(?:senhor|senhora)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const ap = t.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  const nome = ap ? ap[1] : t;
  if (!/^[\p{L}][\p{L}\p{M} .'’-]{4,70}$/u.test(nome)) return null;
  return { nome: /\p{Ll}/u.test(nome) ? nome.trim() : capitaliza(nome.trim()), apelido: ap ? capitaliza(ap[2].replace(/-\s+/g, "")) : null };
};

const CONVOCA = /Fica\s+convocad[oa]\s+(?:o|a|e)?\s*((?:Senhor|Senhora|Sr\.?|Sra\.?)\s+)?([^,]{5,90}?)\s*,?\s*(?:para comparecer nesta Edilidade,\s*)?a\s+fim\s+de\s+assumir\s+o\s+cargo\s+de\s+Vereador(?:a)?\s+(?:da|à)\s+C[âa]mara(?:\s+Municipal)?\s+(?:de\s+Vereadores\s+do\s+Munic[íi]pio\s+)?de\s+Osasco\s*,?\s*(.{0,600}?)(?:Art(?:igo)?\.?\s*2|Publique-se|$)/giu;

function convocacoesDoTexto(doc, bruto) {
  const t = bruto
    .replace(/\f/g, " ")
    .replace(/(\p{Ll})-\s*\n\s*(\p{Ll})/gu, "$1$2")
    .replace(/\s+/g, " ")
    .replace(/(\p{Ll})- (\p{Ll})/gu, "$1$2");
  const saida = [];
  for (const m of t.matchAll(CONVOCA)) {
    const convocado = limpaNome(m[2]);
    if (!convocado) continue;
    const resto = m[3].replace(/Secret[áa]r\s*i\s*o/g, "Secretário");
    const antes = t.slice(Math.max(0, m.index - 900), m.index);
    const ato = [...antes.matchAll(/ATO(?:\s+DA\s+PRESID[ÊE]NCIA)?\s+N[º°o.]*\s*(\d{1,3})\s*\/\s*(\d{2,4})/giu)].at(-1);
    const aPartir = resto.match(/a\s+partir\s+(?:do\s+dia\s+|de\s+|da\s+data\s+de\s+)?(\d{1,2}[º°]?\s+de\s+\p{L}+\s+de\s+\d{4})/u);
    const dias = resto.match(/licenciad[oa]\s+por\s+(\d+)\s*\(([^)]+)\)\s*dias/i);
    const cargo = resto.match(/licenciad[oa]\s+para\s+exercer\s+o\s+cargo\s+de\s+(Secret[áa]ri[oa][\p{L} ]+?)(?:,|\s+nos\s+termos)/iu);
    const PESSOA = String.raw`(?:d[oa]s?\s+|de\s+(?:o|a)\s+)(?:(?:Senhor|Senhora|Sr\.?|Sra\.?|vereador|vereadora)\s+)+([\p{L}\p{M} .'’-]{5,80}?)`;
    let motivo = null;
    let titular = null;
    let impedido = null;
    let r;
    if ((r = resto.match(new RegExp(String.raw`em\s+virtude\s+dos\s+motivos\s+apresentados\s+pel[oa]\s+(?:Senhor|Senhora|Sr\.?|Sra\.?)\s+([\p{L}\p{M} .'’-]{5,80}?),?\s+que\s+(?:o|a)\s+impedem.*?licen[çc]a\s+${PESSOA}(?:[,.]|\s+licenciad|$)`, "iu")))) {
      motivo = "impedimento";
      impedido = limpaNome(r[1]);
      titular = limpaNome(r[2]);
    } else if ((r = resto.match(new RegExp(String.raw`em\s+virtude\s+da\s+ren[úu]ncia\s+(?:ao\s+mandato\s+de\s+Vereador\s+)?${PESSOA}(?:[,.]|\s+nos\s+termos|\s+conforme|$)`, "iu")))) {
      motivo = "renuncia";
      titular = limpaNome(r[1]);
    } else if ((r = resto.match(new RegExp(String.raw`em\s+virtude\s+${PESSOA},?\s+encontrar-?\s*se\s+licenciad`, "iu")))) {
      motivo = cargo ? "cargo" : "licenca";
      titular = limpaNome(r[1]);
    } else if (/determina[çc][ãa]o\s+judicial/i.test(resto)) {
      motivo = "judicial";
      const cassado = antes.match(/cancelamento\s+da\s+diploma[çc][ãa]o\s+de\s+([\p{Lu}\p{M} .'’-]{5,80}?)\s*,/u);
      titular = cassado ? limpaNome(cassado[1]) : null;
    }
    if (!motivo) {
      console.warn("motivo não reconhecido:", doc.title, convocado.nome, "|", resto.slice(0, 200));
      continue;
    }
    saida.push({
      convocado: convocado.nome,
      apelido: convocado.apelido,
      titular: titular?.nome ?? null,
      motivo,
      dias: dias ? Number(dias[1]) : null,
      diasExtenso: dias ? dias[2].trim() : null,
      cargo: cargo ? cargo[1].replace(/\s+/g, " ").replace(/Secret[áa]r\s*i\s*o/, "Secretário").trim() : null,
      impedido: impedido?.nome ?? null,
      aPartirDe: dataExtenso(aPartir?.[1]),
      ato: ato ? `${Number(ato[1])}/${ato[2].length === 2 ? `20${ato[2]}` : ato[2]}` : null,
      edicao: { numero: numeroEdicao(doc), data: dataDoc(doc), url: doc.url },
    });
  }
  return saida;
}

const todas = [];
for (const f of readdirSync(CACHE).filter((f) => f.endsWith(".txt.gz"))) {
  let txt;
  try {
    txt = gunzipSync(readFileSync(path.join(CACHE, f))).toString("utf8");
  } catch {
    continue;
  }
  const quebra = txt.indexOf("\n");
  const doc = JSON.parse(txt.slice(0, quebra)).doc;
  todas.push(...convocacoesDoTexto(doc, txt.slice(quebra + 1)));
}

// O mesmo ato aparece de novo na ata da sessão em que foi lido, ou republicado: fica a primeira publicação.
const chave = (c) => `${dobra(c.convocado).replace(/[^a-z]/g, "")}|${c.aPartirDe ?? c.ato ?? c.edicao.data.slice(0, 7)}`;
todas.sort((a, b) => a.edicao.data.localeCompare(b.edicao.data) || Number(a.edicao.numero) - Number(b.edicao.numero));
const vistas = new Map();
for (const c of todas) {
  const k = chave(c);
  const ja = vistas.get(k);
  if (!ja) vistas.set(k, c);
  else {
    // Completa com o que a outra publicação traz (a ata às vezes cita o ato com mais detalhes).
    for (const campo of ["apelido", "dias", "diasExtenso", "cargo", "aPartirDe", "ato", "impedido"]) ja[campo] ??= c[campo];
  }
}
// Duas publicações do mesmo ato com grafias diferentes (ata × ato): mesmo número de ato e mesmo titular.
const final = [];
for (const c of vistas.values()) {
  const dup = final.find((o) => o.ato && o.ato === c.ato && dobra(o.titular ?? "") === dobra(c.titular ?? "") && o.motivo === c.motivo);
  if (dup) continue;
  if (c.cargo && c.motivo === "licenca") c.motivo = "cargo";
  final.push(c);
}

// ---------- Nomes → pessoas ----------
// 1. Nome completo igual ao da lista oficial de legislaturas da Câmara (dados/camara-legislaturas.json) ou ao do perfil
//    da Câmara (dados/camara.json), que já estão ligados às pessoas.
// 2. Senão, candidatura a vereador em Osasco na eleição que formou a legislatura: todas as palavras do nome de urna estão
//    no nome publicado (ex.: urna "RODOLFO CARA" × "Rodolfo Rodrigues Cara"), e só uma candidatura bate.
// 3. Grafias que não batem, conferidas à mão (MANUAL).
// Conferidas pelo partido ou coligação do titular e pela ordem dos suplentes na eleição.
const MANUAL = {
  "jose carlos ferreira silva": "ze-carlos-do-santa-maria",
  "rogerio lins wanderlei": "rogerio-lins",
  "francisco de paula oliveira leite": "de-paula-2012",
  "manoel edvan mane cerqueira": "mane",
  "joao candal de lima": "professor-candal",
  "francisca jenilucia ribeiro soares": "lucia-da-saude",
  "gilson menek": "gilsao",
  "carlos roberto de almeida": "carlos-roberto",
  "floriza pinheiro martins": "floriza",
  "wilians vieira santos": "wilians-da-farmacia",
  "luiz carlos garcia": "luiz-garcia-da-locadora",
  "antonio renato bonin": "dr-renato-bonin",
  "altair soares": "altair-da-padaria",
  "nestor ferreira dos santos": "nestor-do-algodao-doce",
};
const lerJson = (f) => JSON.parse(readFileSync(path.join(raiz, "dados", f), "utf8"));
const fraca = new Set(["de", "da", "do", "das", "dos", "e"]);
const chaveNome = (s) =>
  dobra(s)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const fichas = (s) => chaveNome(s).split(" ").filter((w) => w && !fraca.has(w));
const porNomeCivil = new Map();
const poeCivil = (nome, id) => {
  if (!nome || !id) return;
  const k = chaveNome(nome);
  porNomeCivil.set(k, porNomeCivil.has(k) && porNomeCivil.get(k) !== id ? null : id);
};
for (const l of lerJson("camara-legislaturas.json").legislaturas) for (const v of l.vereadores) poeCivil(v.nome, v.pessoa);
for (const v of lerJson("camara.json").vereadores) {
  poeCivil(v.perfil?.nomeCompleto?.replace(/\s*\(suplente\)\s*$/i, ""), v.pessoa);
  poeCivil(v.nome, v.pessoa);
}
const tse = lerJson("tse.json").pessoas;
const eleicaoDe = (data) => {
  const a = Number(data.slice(0, 4));
  return a - ((a - 1997) % 4) - 1; // 2017–2020 → 2016
};
function pessoaDe(nome, data) {
  if (!nome) return null;
  const k = chaveNome(nome);
  if (MANUAL[k]) return MANUAL[k];
  if (porNomeCivil.get(k)) return porNomeCivil.get(k);
  const ano = eleicaoDe(data);
  const fs = new Set(fichas(nome));
  const achados = tse.filter((p) =>
    p.candidaturas.some((c) => c.ano === ano && c.cargo === "Vereador" && c.local === "Osasco" && c.urna && fichas(c.urna).length >= 2 && fichas(c.urna).every((w) => fs.has(w))),
  );
  return achados.length === 1 ? achados[0].id : null;
}
for (const c of final) {
  c.pessoaConvocado = pessoaDe(c.convocado, c.aPartirDe ?? c.edicao.data);
  c.pessoaTitular = pessoaDe(c.titular, c.aPartirDe ?? c.edicao.data);
  c.pessoaImpedido = pessoaDe(c.impedido, c.aPartirDe ?? c.edicao.data);
}
for (const c of final)
  for (const [campo, id] of [["convocado", c.pessoaConvocado], ["titular", c.pessoaTitular], ["impedido", c.pessoaImpedido]])
    if (c[campo] && !id) console.warn(`sem pessoa (${campo}):`, c[campo], c.edicao.data);

writeFileSync(
  path.join(raiz, "dados", "convocacoes-iomo.json"),
  JSON.stringify(
    {
      fonte: "Imprensa Oficial do Município de Osasco (atos da Presidência da Câmara Municipal)",
      url: "https://osasco.sp.gov.br/imprensa-oficial/",
      coletadoEm: new Date().toISOString().slice(0, 10),
      convocacoes: final,
    },
    null,
    1,
  ) + "\n",
);
console.log(`${final.length} convocações (${todas.length} trechos lidos)`);
