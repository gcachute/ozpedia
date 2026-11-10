// Histórico da Câmara Municipal de Osasco, da página oficial "Todas as Legislaturas"
// (https://www.osasco.sp.leg.br/vereadores/legislaturas): as 16 legislaturas desde 1962, com início e fim, todos os
// vereadores que exerceram mandato (inclusive suplentes) e a Mesa Diretora de cada sessão legislativa.
//
// Os nomes são os nomes completos publicados pela Câmara. Para ligar cada um à pessoa dos dados do TSE (que usa o nome
// de urna), o nome é comparado com o nome civil das candidaturas a vereador em Osasco nos arquivos do TSE (cópia do
// De Olho em OZ); o nome civil do TSE só serve para essa comparação e não é gravado.
// Rode com: npm run importar:camara-historico
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const URL_PAGINA = "https://www.osasco.sp.leg.br/vereadores/legislaturas";
const HTML = "cache/camara/legislaturas.html";
const CACHE_TSE = process.env.CACHE ?? "../avalia-osasco/data/cache/tse";

if (!existsSync(HTML)) {
  mkdirSync("cache/camara", { recursive: true });
  const r = await fetch(URL_PAGINA, { headers: { "User-Agent": "Mozilla/5.0 (OZpedia)" } });
  if (!r.ok) throw new Error(`A Câmara recusou a página (${r.status})`);
  writeFileSync(HTML, await r.text());
}
const html = readFileSync(HTML, "utf8");

const MESES = { janeiro: 1, fevereiro: 2, marco: 3, março: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12 };
const data = (s) => {
  const m = /(\d{1,2}) de (\S+) de (\d{4})/i.exec(s);
  if (!m) return null;
  const mes = MESES[m[2].toLowerCase()];
  return `${m[3]}-${String(mes).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
};
const entidades = (s) => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');
const linhasDe = (trecho) =>
  entidades(trecho.replace(/<[^>]+>/g, "\n"))
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

const legislaturas = [];
const re = /aria-controls="(collapse-\d+)">\s*([^<]+?)\s*<i/g;
let m;
while ((m = re.exec(html))) {
  const titulo = m[2].replace(/\s+/g, " ").trim();
  const t = /(\d+)ª Legislatura\s+-\s+(\d{4})\/(\d{4})/.exec(titulo);
  if (!t) continue;
  const ini = html.indexOf(`id="${m[1]}"`);
  // O bloco termina no próximo painel ou, no último, antes do rodapé do site ("ACESSO RÁPIDO").
  const fins = [html.indexOf('<section class="panel', ini), html.indexOf("ACESSO R", ini)].filter((x) => x > 0);
  const linhas = linhasDe(html.slice(ini, fins.length ? Math.min(...fins) : undefined));
  const leg = { numero: Number(t[1]), titulo, inicio: null, fim: null, vereadores: [], sessoes: [] };
  let parte = "";
  let sessao = null;
  let cargoPendente = null;
  for (const l of linhas) {
    if (/^Início da Legislatura/.test(l)) {
      const [a, b] = l.split(" e término ");
      leg.inicio = data(a);
      leg.fim = data(b);
    } else if (l === "Vereadores") parte = "vereadores";
    else if (/^\d+ª Sessão Legislativa$/.test(l)) {
      parte = "mesa";
      sessao = { numero: parseInt(l, 10), inicio: null, fim: null, mesa: [] };
      leg.sessoes.push(sessao);
    } else if (parte === "mesa" && /^Início em/.test(l)) {
      const [a, b] = l.split(" e término ");
      sessao.inicio = data(a);
      sessao.fim = data(b);
    } else if (parte === "mesa" && /^(\d+º )?(\d+º )?(Presidente|Vice-Presidente|Secretário|\d+º Vice-Presidente|\d+º Secretário)[^:]*:/.test(l)) {
      // "Presidente: Fulano" numa linha só, ou "Presidente:" numa linha e o nome na seguinte.
      const [cargo, ...resto] = l.split(":");
      const nome = resto.join(":").trim();
      if (nome) sessao.mesa.push({ cargo: cargo.trim(), nome: nome.replace(/\s*\(Suplente\)\s*/, "") });
      else cargoPendente = cargo.trim();
    } else if (parte === "mesa" && cargoPendente) {
      sessao.mesa.push({ cargo: cargoPendente, nome: l.replace(/\s*\(Suplente\)\s*/, "") });
      cargoPendente = null;
    } else if (parte === "vereadores" && !/^\d/.test(l)) {
      const v = /^(.*?)(\s*\(Suplente\))?(?:\s*-\s*(\d+)\s*votos)?$/.exec(l);
      leg.vereadores.push({ nome: v[1].trim(), suplente: !!v[2], votos: v[3] ? Number(v[3]) : null });
    }
  }
  legislaturas.push(leg);
}
legislaturas.sort((a, b) => a.numero - b.numero);

// Liga o nome oficial à pessoa do TSE pelo nome civil das candidaturas a vereador em Osasco (1996 a 2024).
const dobra = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const tse = JSON.parse(readFileSync("dados/tse.json", "utf8"));
const porCandidatura = new Map();
// O mesmo número pode aparecer em mais de uma pessoa (titular e vice da mesma chapa, candidatura repetida no arquivo):
// nesse caso, desempata pelo nome de urna.
for (const p of tse.pessoas)
  for (const c of p.candidaturas) {
    if (c.local !== "Osasco") continue;
    const k = `${c.ano}|${c.cargo}|${c.numero}`;
    if (!porCandidatura.has(k)) porCandidatura.set(k, []);
    porCandidatura.get(k).push({ id: p.id, urna: dobra(c.urna ?? p.urna) });
  }
const porNome = new Map();
for (const ano of [1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024]) {
  const zip = `${CACHE_TSE}/consulta_cand_${ano}.zip`;
  if (!existsSync(zip)) continue;
  const unzip = spawn("unzip", ["-p", zip, `consulta_cand_${ano}_SP.csv`]);
  unzip.stdout.setEncoding("latin1");
  let cab = null;
  for await (const l of createInterface({ input: unzip.stdout })) {
    const c = l.split(";").map((x) => x.replace(/^"|"$/g, ""));
    if (!cab) {
      cab = Object.fromEntries(c.map((k, i) => [k, i]));
      continue;
    }
    if (dobra(c[cab.NM_UE]) !== "OSASCO") continue;
    const cargo = { VEREADOR: "Vereador", PREFEITO: "Prefeito", "VICE PREFEITO": "Vice-prefeito" }[dobra(c[cab.DS_CARGO])];
    const opcoes = (cargo && porCandidatura.get(`${ano}|${cargo}|${c[cab.NR_CANDIDATO]}`)) || [];
    const certas = opcoes.length > 1 ? opcoes.filter((o) => o.urna === dobra(c[cab.NM_URNA_CANDIDATO])) : opcoes;
    if (new Set(certas.map((o) => o.id)).size !== 1) continue;
    const id = certas[0].id;
    const k = dobra(c[cab.NM_CANDIDATO]);
    porNome.set(k, porNome.has(k) && porNome.get(k) !== id ? null : id);
  }
}
let ligados = 0;
const nomes = new Set();
for (const leg of legislaturas)
  for (const v of leg.vereadores) {
    v.pessoa = porNome.get(dobra(v.nome)) ?? null;
    nomes.add(v.nome);
    if (v.pessoa) ligados++;
  }
for (const leg of legislaturas) for (const s of leg.sessoes) for (const x of s.mesa) x.pessoa = porNome.get(dobra(x.nome)) ?? null;

writeFileSync(
  "dados/camara-legislaturas.json",
  `${JSON.stringify({ fonte: "Câmara Municipal de Osasco, Todas as Legislaturas", url: URL_PAGINA, coletadoEm: new Date().toISOString().slice(0, 10), legislaturas }, null, 1)}\n`,
);
console.log(`${legislaturas.length} legislaturas, ${nomes.size} nomes, ${ligados} mandatos ligados a pessoas do TSE`);
for (const l of legislaturas) console.log(`${l.numero}ª ${l.inicio}–${l.fim}: ${l.vereadores.length} vereadores, ${l.sessoes.length} sessões, ${l.vereadores.filter((v) => v.pessoa).length} ligados`);
