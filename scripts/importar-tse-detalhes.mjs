// Detalhes das eleições municipais de Osasco, dos arquivos do TSE:
//   - consulta_cand_<ano>: data da eleição, coligação, federação, ocupação e grau de instrução declarados, município de
//     nascimento e se concorria à reeleição, de cada candidatura (lidos da cópia já baixada pelo De Olho em OZ);
//   - consulta_vagas_<ano>: vagas e data da posse;
//   - detalhe_votacao_munzona_<ano>: eleitorado apto, comparecimento, abstenções, votos válidos, brancos e nulos;
//   - votacao_partido_munzona_<ano>: votos de cada partido para a Câmara (nominais e de legenda).
// Os três últimos são baixados para cache/tse/ (fora do repositório). Precisa do programa unzip.
// Do cadastro não entram CPF, e-mail, data de nascimento, título de eleitor, estado civil, cor ou raça e gênero.
// Rode com: npm run importar:detalhes
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const ANOS = [1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024];
const CACHE_AVALIA = process.env.CACHE ?? "../avalia-osasco/data/cache/tse";
const CACHE = "cache/tse";
const TSE = "https://cdn.tse.jus.br/estatistica/sead/odsele/";

const dobra = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .trim();
const vazio = (s) => !s || /^#/.test(s) || /^-\d$/.test(s) || /^(NAO DIVULGAVEL|DADO INEXISTENTE|NAO INFORMADO)$/.test(dobra(s));
const valor = (s) => (vazio(s) ? null : s.trim());
const n = (s) => Number(s) || 0;
const iso = (s) => (/^\d{2}\/\d{2}\/\d{4}$/.test(s ?? "") ? s.split("/").reverse().join("-") : null);
const cargo = (s) => ({ PREFEITO: "Prefeito", "VICE-PREFEITO": "Vice-prefeito", VEREADOR: "Vereador" })[dobra(s)] ?? null;

async function baixa(tipo, ano) {
  const arq = `${CACHE}/${tipo}_${ano}.zip`;
  if (!existsSync(arq)) {
    mkdirSync(CACHE, { recursive: true });
    const r = await fetch(`${TSE}${tipo}/${tipo}_${ano}.zip`);
    if (!r.ok) throw new Error(`TSE recusou ${tipo}_${ano} (${r.status})`);
    writeFileSync(arq, Buffer.from(await r.arrayBuffer()));
  }
  return arq;
}

// Linhas de Osasco do arquivo de São Paulo dentro do zip, como função campo → valor.
async function* linhas(zip, membro, filtro = (v) => dobra(v("NM_UE")) === "OSASCO") {
  const unzip = spawn("unzip", ["-p", zip, membro]);
  unzip.stdout.setEncoding("latin1");
  let cab = null;
  for await (const l of createInterface({ input: unzip.stdout })) {
    const c = l.split(";").map((x) => x.replace(/^"|"$/g, ""));
    if (!cab) {
      cab = Object.fromEntries(c.map((k, i) => [k, i]));
      continue;
    }
    const v = (k) => c[cab[k]];
    if (filtro(v)) yield v;
  }
}

const anos = {};
const candidaturas = {};
for (const ano of ANOS) {
  const a = (anos[ano] = { datas: {}, posse: null, vagas: {}, zonas: 0, turnos: {}, partidosCamara: [], coligacoes: [] });

  // Candidaturas.
  const zipCand = `${CACHE_AVALIA}/consulta_cand_${ano}.zip`;
  if (!existsSync(zipCand)) throw new Error(`Falta ${zipCand}`);
  const coligacoes = new Map();
  for await (const v of linhas(zipCand, `consulta_cand_${ano}_SP.csv`)) {
    const c = cargo(v("DS_CARGO"));
    if (!c) continue;
    const turno = n(v("NR_TURNO")) || 1;
    if (iso(v("DT_ELEICAO"))) a.datas[turno] = iso(v("DT_ELEICAO"));
    const municipio = valor(v("NM_MUNICIPIO_NASCIMENTO"));
    const uf = valor(v("SG_UF_NASCIMENTO"));
    const reg = {
      ocupacao: valor(v("DS_OCUPACAO")),
      instrucao: valor(v("DS_GRAU_INSTRUCAO")),
      naturalidade: municipio ? `${municipio}${uf ? `/${uf}` : ""}` : null,
      coligacao: valor(v("NM_COLIGACAO")),
      composicao: valor(v("DS_COMPOSICAO_COLIGACAO")),
      federacao: valor(v("NM_FEDERACAO")),
      composicaoFederacao: valor(v("DS_COMPOSICAO_FEDERACAO")),
      reeleicao: v("ST_REELEICAO") === "S" ? true : v("ST_REELEICAO") === "N" ? false : null,
    };
    candidaturas[`${ano}|${c}|${v("NR_CANDIDATO")}`] = reg;
    if (c === "Prefeito" && reg.composicao) coligacoes.set(v("NR_CANDIDATO"), { numero: v("NR_CANDIDATO"), nome: reg.coligacao, composicao: reg.composicao });
  }
  a.coligacoes = [...coligacoes.values()];

  // Vagas e posse.
  for await (const v of linhas(await baixa("consulta_vagas", ano), `consulta_vagas_${ano}_SP.csv`)) {
    const c = cargo(v("DS_CARGO"));
    if (c) a.vagas[c] = n(v("QT_VAGA") ?? v("QT_VAGAS"));
    if (iso(v("DT_POSSE"))) a.posse = iso(v("DT_POSSE"));
  }

  // Comparecimento, brancos e nulos, somados nas zonas.
  const zonas = new Set();
  for await (const v of linhas(await baixa("detalhe_votacao_munzona", ano), `detalhe_votacao_munzona_${ano}_SP.csv`, (v) => dobra(v("NM_MUNICIPIO")) === "OSASCO")) {
    const c = cargo(v("DS_CARGO"));
    if (!c || c === "Vice-prefeito") continue;
    zonas.add(v("NR_ZONA"));
    const k = `${c}|${n(v("NR_TURNO")) || 1}`;
    const t = (a.turnos[k] ??= { aptos: 0, comparecimento: 0, abstencoes: 0, nominais: 0, legenda: 0, brancos: 0, nulos: 0, secoes: 0 });
    t.aptos += n(v("QT_APTOS"));
    t.comparecimento += n(v("QT_COMPARECIMENTO"));
    t.abstencoes += n(v("QT_ABSTENCOES"));
    t.nominais += n(v("QT_VOTOS_NOMINAIS_VALIDOS"));
    t.legenda += n(v("QT_TOTAL_VOTOS_LEG_VALIDOS"));
    t.brancos += n(v("QT_VOTOS_BRANCOS"));
    t.nulos += n(v("QT_TOTAL_VOTOS_NULOS"));
    t.secoes += n(v("QT_TOTAL_SECOES"));
  }
  a.zonas = zonas.size;
  // Válidos = nominais + legenda (em 2000 o campo de válidos do TSE deixa a legenda de fora). Em 1996 o arquivo não traz
  // nulos nem seções: ficam como null.
  for (const t of Object.values(a.turnos)) {
    t.validos = t.nominais + t.legenda;
    if (ano === 1996) {
      t.nulos = null;
      t.secoes = null;
    }
  }

  // Votos de cada partido para a Câmara.
  const partidos = new Map();
  for await (const v of linhas(await baixa("votacao_partido_munzona", ano), `votacao_partido_munzona_${ano}_SP.csv`, (v) => dobra(v("NM_MUNICIPIO")) === "OSASCO")) {
    if (cargo(v("DS_CARGO")) !== "Vereador") continue;
    const sigla = v("SG_PARTIDO");
    const p = partidos.get(sigla) ?? {
      sigla,
      nome: valor(v("NM_PARTIDO")),
      numero: v("NR_PARTIDO"),
      coligacao: valor(v("NM_COLIGACAO")),
      composicao: valor(v("DS_COMPOSICAO_COLIGACAO")),
      federacao: valor(v("NM_FEDERACAO")),
      nominais: 0,
      legenda: 0,
    };
    p.nominais += n(v("QT_VOTOS_NOMINAIS_VALIDOS") ?? v("QT_VOTOS_NOMINAIS"));
    p.legenda += n(v("QT_VOTOS_LEGENDA_VALIDOS") ?? v("QT_VOTOS_LEGENDA"));
    partidos.set(sigla, p);
  }
  a.partidosCamara = [...partidos.values()].sort((x, y) => y.nominais + y.legenda - (x.nominais + x.legenda));
  console.log(`${ano}: ${Object.keys(a.turnos).join(", ")}; ${a.partidosCamara.length} partidos; ${a.coligacoes.length} coligações à Prefeitura; vagas ${JSON.stringify(a.vagas)}`);
}

// Campanha de 2024 (prestação de contas e bens declarados), da coleta do De Olho em OZ. Ficam só os totais:
// a lista de fornecedores e doadores fica de fora (nome de microempreendedor pode trazer CPF).
const campanhas = {};
const arqCampanhas = process.env.CAMPANHAS ?? "../avalia-osasco/data/campanhas.json";
if (existsSync(arqCampanhas)) {
  const { default: c } = await import(new URL(`file:///${process.cwd().replace(/\\/g, "/")}/${arqCampanhas}`).href, { with: { type: "json" } });
  for (const x of c.candidatos) {
    const k = `2024|${cargo(x.cargo) ?? x.cargo}|${x.numero}`;
    const tipos = Object.entries(x.despesas?.porTipo ?? {}).sort((a, b) => b[1] - a[1]);
    campanhas[k] = {
      receitas: x.receitas?.total ?? null,
      receitasPorOrigem: x.receitas?.porOrigem ?? {},
      despesas: x.despesas?.contratado ?? null,
      maioresDespesas: tipos.slice(0, 3),
      bens: x.bens?.total ?? null,
    };
  }
}

writeFileSync(
  "dados/eleicoes-tse.json",
  `${JSON.stringify({ fonte: "Tribunal Superior Eleitoral, dados abertos", coletadoEm: new Date().toISOString().slice(0, 10), anos, candidaturas, campanhas2024: campanhas }, null, 0)}\n`,
);
console.log(`${Object.keys(candidaturas).length} candidaturas, ${Object.keys(campanhas).length} campanhas de 2024`);
