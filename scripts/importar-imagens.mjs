// Imagens das páginas de pessoa, todas do Wikimedia Commons (licença livre).
// 1. Escolhas à mão em conteudo/imagens.yml (pessoas) e conteudo/imagens-paginas.yml (demais páginas).
// 2. Fotos de candidatura do TSE que estão no Commons ("AAAA NOME CANDIDATO PREFEITO SP OSASCO TSE (n).jpg"),
//    ligadas à pessoa pelo ano, pelo cargo e pelo nome de urna; vale a mais recente.
// Para cada imagem: baixa uma miniatura para public/imagens/<pessoa>.jpg e grava autor, licença e página do arquivo
// em dados/imagens.json, de onde o site monta a legenda e a referência.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { load } from "js-yaml";

const raiz = path.resolve(import.meta.dirname, "..");
const UA = "OZpediaArquivo/0.1 (arquivo historico local)";
const API = "https://commons.wikimedia.org/w/api.php";

const slug = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const semHtml = (s) => String(s ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

async function api(params) {
  const url = API + "?" + new URLSearchParams({ format: "json", ...params });
  for (let tentativa = 0; ; tentativa++) {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (r.ok) return r.json();
    if (r.status !== 429 || tentativa >= 5) throw new Error(`Commons respondeu ${r.status}`);
    await new Promise((ok) => setTimeout(ok, 60000 * (tentativa + 1)));
  }
}

const tse = JSON.parse(readFileSync(path.join(raiz, "dados", "tse.json"), "utf8"));
const manual = load(readFileSync(path.join(raiz, "conteudo", "imagens.yml"), "utf8")) ?? [];
const escolha = new Map(manual.map((m) => [m.pessoa, { arquivo: m.arquivo.replace(/ /g, "_"), legenda: m.legenda, autor: m.autor, ano: 9999 }]));

// Fotos de candidatura do TSE no Commons.
const achados = [];
let offset = 0;
for (;;) {
  const d = await api({ action: "query", list: "search", srnamespace: "6", srlimit: "500", sroffset: String(offset), srsearch: 'intitle:"SP OSASCO TSE"' });
  achados.push(...d.query.search.map((x) => x.title.replace(/^File:/, "")));
  if (!d.continue) break;
  offset = d.continue.sroffset;
}
const CARGO = { PREFEITO: "Prefeito", "VICE-PREFEITO": "Vice-prefeito", VEREADOR: "Vereador" };
for (const arq of achados) {
  const m = arq.match(/^(\d{4}) (.+) CANDIDATO (VICE-PREFEITO|PREFEITO|VEREADOR) SP OSASCO TSE/);
  if (!m) continue;
  const [, anoS, nome, cargoTse] = m;
  const ano = Number(anoS);
  const cargo = CARGO[cargoTse];
  const quem = tse.pessoas.filter((p) =>
    p.candidaturas.some((c) => c.ano === ano && c.cargo === cargo && c.local === "Osasco" && slug(c.urna ?? p.urna) === slug(nome)),
  );
  if (quem.length !== 1) continue;
  const id = quem[0].id;
  const atual = escolha.get(id);
  if (atual && atual.ano >= ano) continue;
  const papel = cargo === "Prefeito" ? "a prefeito" : cargo === "Vice-prefeito" ? "a vice-prefeito" : "a vereador";
  escolha.set(id, { arquivo: arq.replace(/ /g, "_"), legenda: `Foto da candidatura ${papel} em ${ano}, enviada ao Tribunal Superior Eleitoral`, ano });
}

// Imagens das demais páginas (conteudo/imagens-paginas.yml).
const paginas = (load(readFileSync(path.join(raiz, "conteudo", "imagens-paginas.yml"), "utf8")) ?? []).map((p) => ({
  ...p,
  arquivo: p.arquivo.replace(/ /g, "_"),
}));

// Autor, licença e miniatura de cada arquivo.
const lista = [...escolha.entries()];
const arquivos = [...new Set([...lista.map(([, e]) => e.arquivo), ...paginas.map((p) => p.arquivo)])];
const info = new Map();
for (let i = 0; i < arquivos.length; i += 40) {
  const titulos = arquivos.slice(i, i + 40).map((a) => "File:" + a);
  const d = await api({ action: "query", prop: "imageinfo", iiprop: "url|extmetadata", iiurlwidth: "400", titles: titulos.join("|") });
  const norm = new Map((d.query.normalized ?? []).map((n) => [n.to, n.from]));
  for (const p of Object.values(d.query.pages)) {
    if (!p.imageinfo) continue;
    const ii = p.imageinfo[0];
    const m = ii.extmetadata ?? {};
    const v = (k) => semHtml(m[k]?.value);
    const titulo = (norm.get(p.title) ?? p.title).replace(/^File:/, "").replace(/ /g, "_");
    info.set(titulo, {
      autor: v("Artist")
        .replace(/^(Unknown author)+/i, "autor desconhecido")
        .replace(/^(autor desconhecido)+/, "autor desconhecido")
        .replace(/\s*\(government press official\)/i, " (imprensa oficial do governo)"),
      licenca: v("LicenseShortName").replace(/^Public domain$/i, "domínio público"),
      licencaUrl: m.LicenseUrl?.value ?? null,
      pagina: ii.descriptionurl,
      miniatura: ii.thumburl,
      // Data: AAAA-MM-DD do Commons; se vier em texto ("5 July 2009", "Dezembro de 1976"), só o ano; "Unknown date" fica sem data.
      data: /^\d{4}(-\d{2}){0,2}/.test(v("DateTimeOriginal")) ? v("DateTimeOriginal").slice(0, 10) : (v("DateTimeOriginal").match(/(1[89]|20)\d{2}/)?.[0] ?? null),
    });
  }
}
const dadosDe = (arquivo, quem) => {
  const i = info.get(arquivo) ?? info.get(arquivo.replace(/_/g, " "));
  if (!i || !i.miniatura) return console.warn("sem dados no Commons:", quem, arquivo), null;
  if (!/^(CC BY|CC0|domínio público|Attribution)/i.test(i.licenca)) return console.warn("licença não reconhecida, ignorado:", quem, i.licenca), null;
  return i;
};

// O servidor de arquivos do Commons limita a frequência: espaço entre downloads e nova tentativa se recusar.
async function baixar(url, destino, quem) {
  if (existsSync(destino)) return true;
  if (process.env.SEM_DOWNLOAD) return false;
  let r;
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(60000) }).catch(() => ({ ok: false, status: "sem resposta" }));
    if (r.status !== 429) break;
    await new Promise((ok) => setTimeout(ok, 30000 * (tentativa + 1)));
  }
  await new Promise((ok) => setTimeout(ok, 8000));
  if (!r.ok) return console.warn("download falhou:", quem, r.status), false;
  writeFileSync(destino, Buffer.from(await r.arrayBuffer()));
  return true;
}

mkdirSync(path.join(raiz, "public", "imagens", "commons"), { recursive: true });
const saida = [];
for (const [pessoa, e] of lista.sort((a, b) => a[0].localeCompare(b[0]))) {
  const i = dadosDe(e.arquivo, pessoa);
  if (!i) continue;
  // Foto de candidatura achada no Commons: se a mesma pessoa já tem foto tirada direto do TSE, fica a do TSE.
  const temTse = ["jpg", "png"].some((x) => existsSync(path.join(raiz, "public", "imagens", "tse", `${pessoa}.${x}`)));
  const destino = path.join(raiz, "public", "imagens", `${pessoa}.jpg`);
  if (e.ano !== 9999 && temTse && !existsSync(destino)) continue;
  if (!(await baixar(i.miniatura, destino, pessoa))) continue;
  saida.push({ pessoa, arquivo: e.arquivo.replace(/_/g, " "), legenda: e.legenda, ...i, ...(e.autor ? { autor: e.autor } : {}), caminho: `/imagens/${pessoa}.jpg` });
}

// Imagens de página: um arquivo por imagem do Commons, usado por quantas páginas quiserem.
const saidaPaginas = [];
for (const p of paginas) {
  const i = dadosDe(p.arquivo, p.chave);
  if (!i) continue;
  const ext = path.extname(new URL(i.miniatura).pathname).toLowerCase() === ".png" ? "png" : "jpg";
  const nome = `${slug(p.arquivo.replace(/\.[a-z]+$/i, ""))}.${ext}`;
  if (!(await baixar(i.miniatura, path.join(raiz, "public", "imagens", "commons", nome), p.chave))) continue;
  saidaPaginas.push({ chave: p.chave, arquivo: p.arquivo.replace(/_/g, " "), legenda: p.legenda, ...i, ...(p.autor ? { autor: p.autor } : {}), caminho: `/imagens/commons/${nome}` });
}

writeFileSync(
  path.join(raiz, "dados", "imagens.json"),
  JSON.stringify({ fonte: "Wikimedia Commons", coletadoEm: new Date().toISOString().slice(0, 10), imagens: saida, paginas: saidaPaginas }, null, 1),
);
console.log(`${saida.length} fotos de pessoa e ${saidaPaginas.length} imagens de página (${achados.length} fotos do TSE de Osasco achadas no Commons)`);
