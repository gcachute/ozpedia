// Fotos de candidatura do Portal de Dados Abertos do TSE (licença CC BY 4.0), para quem não tem foto do Commons.
// O código de cada candidatura (SQ_CANDIDATO) está em dados/tse-sq.json. Os arquivos de fotos do TSE são um .zip
// por eleição e estado, de centenas de MB a 2,7 GB; o script lê só o índice do .zip e os trechos das fotos que
// interessam, por pedidos parciais (Range), sem baixar o arquivo inteiro.
// Grava public/imagens/tse/<pessoa>.jpg e dados/imagens-tse.json (pasta própria, para não se misturar com as do Commons).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { inflateRawSync } from "node:zlib";

const raiz = path.resolve(import.meta.dirname, "..");
const UA = "OZpediaArquivo/0.1 (arquivo historico local)";
const zipDe = (ano) => `https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes${ano}/fotos/foto_cand${ano}_SP_div.zip`;
const portal = (ano) => `https://dadosabertos.tse.jus.br/dataset/candidatos-${ano}`;

async function trecho(url, ini, fim) {
  for (let t = 0; ; t++) {
    const r = await fetch(url, { headers: { "User-Agent": UA, Range: `bytes=${ini}-${fim}` } });
    if (r.status === 206) return Buffer.from(await r.arrayBuffer());
    if (t >= 3) throw new Error(`TSE respondeu ${r.status} para ${url}`);
    await new Promise((ok) => setTimeout(ok, 5000 * (t + 1)));
  }
}

async function tamanho(url) {
  const r = await fetch(url, { method: "HEAD", headers: { "User-Agent": UA } });
  return Number(r.headers.get("content-length"));
}

// Índice (diretório central) do .zip: nome -> {pos, comp, metodo, tamComp}.
async function indice(url) {
  const total = await tamanho(url);
  const fim = await trecho(url, Math.max(0, total - 65536), total - 1);
  let e = fim.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (e < 0) throw new Error("fim do zip não achado");
  let tamDir = fim.readUInt32LE(e + 12);
  let posDir = fim.readUInt32LE(e + 16);
  if (posDir === 0xffffffff || tamDir === 0xffffffff) {
    const l = fim.lastIndexOf(Buffer.from([0x50, 0x4b, 0x06, 0x07]));
    const pos64 = Number(fim.readBigUInt64LE(l + 8));
    const r64 = await trecho(url, pos64, pos64 + 55);
    tamDir = Number(r64.readBigUInt64LE(40));
    posDir = Number(r64.readBigUInt64LE(48));
  }
  const dir = await trecho(url, posDir, posDir + tamDir - 1);
  const mapa = new Map();
  for (let p = 0; p + 46 <= dir.length && dir.readUInt32LE(p) === 0x02014b50; ) {
    const metodo = dir.readUInt16LE(p + 10);
    let tamComp = dir.readUInt32LE(p + 20);
    const nl = dir.readUInt16LE(p + 28), xl = dir.readUInt16LE(p + 30), cl = dir.readUInt16LE(p + 32);
    let pos = dir.readUInt32LE(p + 42);
    const nome = dir.subarray(p + 46, p + 46 + nl).toString("latin1");
    if (pos === 0xffffffff || tamComp === 0xffffffff) {
      // Campo extra zip64: tamanho original, tamanho comprimido, posição (só os que estão em 0xffffffff, nessa ordem).
      const x = dir.subarray(p + 46 + nl, p + 46 + nl + xl);
      for (let q = 0; q + 4 <= x.length; ) {
        const id = x.readUInt16LE(q), sz = x.readUInt16LE(q + 2);
        if (id === 1) {
          let k = q + 4;
          if (dir.readUInt32LE(p + 24) === 0xffffffff) k += 8;
          if (tamComp === 0xffffffff) { tamComp = Number(x.readBigUInt64LE(k)); k += 8; }
          if (pos === 0xffffffff) pos = Number(x.readBigUInt64LE(k));
        }
        q += 4 + sz;
      }
    }
    mapa.set(path.basename(nome).toUpperCase(), { pos, metodo, tamComp });
    p += 46 + nl + xl + cl;
  }
  return mapa;
}

async function extrair(url, ent) {
  const cab = await trecho(url, ent.pos, ent.pos + 29);
  const ini = ent.pos + 30 + cab.readUInt16LE(26) + cab.readUInt16LE(28);
  const dados = await trecho(url, ini, ini + ent.tamComp - 1);
  return ent.metodo === 0 ? dados : inflateRawSync(dados);
}

const sq = JSON.parse(readFileSync(path.join(raiz, "dados", "tse-sq.json"), "utf8")).candidaturas;
const commons = path.join(raiz, "dados", "imagens.json");
const jaTem = new Set(existsSync(commons) ? JSON.parse(readFileSync(commons, "utf8")).imagens.map((i) => i.pessoa) : []);

const porAno = new Map();
for (const [pessoa, c] of Object.entries(sq)) {
  if (jaTem.has(pessoa) || (process.env.PULAR ?? "").split(",").includes(pessoa)) continue;
  if (!porAno.has(c.ano)) porAno.set(c.ano, []);
  porAno.get(c.ano).push({ pessoa, ...c });
}

mkdirSync(path.join(raiz, "public", "imagens", "tse"), { recursive: true });
const saida = [];
for (const [ano, lista] of [...porAno.entries()].sort()) {
  const url = zipDe(ano);
  const idx = await indice(url);
  console.log(`${ano}: ${idx.size} fotos no arquivo do TSE, ${lista.length} procuradas`);
  for (const c of lista) {
    // Nomes nos arquivos: FSP<código>_div.jpg (2008, 2016 em diante), SP<código>_div.jpg (2012),
    // FSP67890_<código com 5 dígitos>_div.png (2004; 67890 é o código de Osasco no TSE).
    const prefixos = [`FSP${c.sq}_`, `SP${c.sq}_`, `FSP67890_${String(c.sq).padStart(5, "0")}_`];
    const nome = [...idx.keys()].find((k) => prefixos.some((p) => k.startsWith(p)));
    if (!nome) {
      console.warn("sem foto no arquivo do TSE:", c.pessoa, ano, c.sq);
      continue;
    }
    // A extensão vem do conteúdo: há arquivos .png no TSE que são JPEG por dentro.
    const pasta = path.join(raiz, "public", "imagens", "tse");
    let ext = ["jpg", "png"].find((e) => existsSync(path.join(pasta, `${c.pessoa}.${e}`)));
    if (!ext) {
      const foto = await extrair(url, idx.get(nome));
      ext = foto[0] === 0x89 && foto[1] === 0x50 ? "png" : "jpg";
      writeFileSync(path.join(pasta, `${c.pessoa}.${ext}`), foto);
    }
    saida.push({
      pessoa: c.pessoa,
      arquivo: `${nome} (fotos de candidatos de ${ano}, São Paulo)`,
      legenda: `Foto da candidatura em ${ano}, enviada ao Tribunal Superior Eleitoral`,
      autor: "Portal de Dados Abertos do Tribunal Superior Eleitoral",
      licenca: "CC BY 4.0",
      licencaUrl: "https://creativecommons.org/licenses/by/4.0/",
      pagina: portal(ano),
      data: String(ano),
      caminho: `/imagens/tse/${c.pessoa}.${ext}`,
    });
  }
}
saida.sort((a, b) => a.pessoa.localeCompare(b.pessoa));
writeFileSync(
  path.join(raiz, "dados", "imagens-tse.json"),
  JSON.stringify({ fonte: "Portal de Dados Abertos do TSE", coletadoEm: new Date().toISOString().slice(0, 10), imagens: saida }, null, 1),
);
console.log(`${saida.length} fotos do TSE gravadas`);
