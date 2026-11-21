// Traz dos Dados Abertos da Assembleia Legislativa de São Paulo (https://dadosabertos.al.sp.gov.br) a atuação dos
// deputados estaduais ligados a Osasco: proposituras de que são autores (projetos, indicações, moções, requerimentos),
// as que citam Osasco, a verba de gabinete somada por ano e por tipo, e as comissões permanentes atuais.
// Rode com: npm run importar:alesp
//
// Os arquivos completos da Assembleia (cerca de 300 MB) ficam em cache/alesp, fora do repositório; apague a pasta para
// baixar de novo. Não entram: nomes de fornecedores da verba de gabinete (podem ser pessoas físicas), CPF, telefone, e-mail.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const BASE = "https://www3.al.sp.gov.br/repositorio/dados-abertos/output/json";
const CACHE = "cache/alesp";
const ARQUIVOS = ["autores", "proposituras", "naturezas-documento", "despesas", "membros-comissoes", "comissoes"];
const NOME_NO_SITE = { comissoes: "comissoes_permanentes" };

// Deputado na Assembleia (matrícula, o idAutor dos arquivos) → pessoa da OZpédia.
const DEPUTADOS = {
  "guacu-piteri": 299464,
  "joao-paulo-cunha": 300258,
  "willians-rafael": 300387,
  "emidio": 300395,
  "celso-giglio": 300227,
  "marcos-martins": 300455,
  "gerson-pessoa": 300671,
  "rogerio-santos": 300683,
};

// Naturezas listadas uma a uma; as demais (indicações, requerimentos...) entram na contagem e, se citam Osasco, na lista de Osasco.
const PRINCIPAIS = new Set(["Projeto de Lei", "Projeto de Lei Complementar", "Proposta de Emenda à Constituição", "Projeto de Decreto Legislativo", "Projeto de Resolução"]);

mkdirSync(CACHE, { recursive: true });
for (const a of ARQUIVOS) {
  const f = `${CACHE}/${a}.json`;
  if (existsSync(f)) continue;
  const r = await fetch(`${BASE}/${NOME_NO_SITE[a] ?? a}.json`, { headers: { "User-Agent": "Mozilla/5.0 (OZpedia)" } });
  if (!r.ok) throw new Error(`${r.status} ao baixar ${a}`);
  writeFileSync(f, Buffer.from(await r.arrayBuffer()));
  console.log(`baixado ${a}`);
}
const ler = (a) => {
  const j = JSON.parse(readFileSync(`${CACHE}/${a}.json`, "utf8").replace(/^﻿/, ""));
  return Object.values(j)[0];
};

const naturezas = new Map(ler("naturezas-documento").map((n) => [String(n.idNatureza), n.nmNatureza.trim()]));
const docs = new Map(ler("proposituras").map((p) => [String(p.idDocumento), p]));
const autores = ler("autores");
const despesas = ler("despesas");
const comissoes = new Map(ler("comissoes").map((c) => [c.idComissao, c]));
const membros = ler("membros-comissoes");

const data = (s) => (s ? s.split("/").reverse().join("-") : null); // "23/11/2026" → "2026-11-23"
const ids = new Set(Object.values(DEPUTADOS));
const porAutor = new Map();
for (const a of autores) if (ids.has(a.idAutor)) (porAutor.get(a.idAutor) ?? porAutor.set(a.idAutor, []).get(a.idAutor)).push(a);

const saida = [];
for (const [pessoa, id] of Object.entries(DEPUTADOS)) {
  const lista = porAutor.get(id) ?? [];
  const nome = lista[0]?.nomeAutor ?? null;
  const vistos = new Set();
  const autoria = [];
  let apoio = 0;
  for (const a of lista) {
    // tipoAutoria "A": autor; "S": apoio (subscrição).
    if (a.tipoAutoria !== "A") {
      apoio++;
      continue;
    }
    const d = docs.get(String(a.idProcesso));
    if (!d || vistos.has(d.idDocumento)) continue;
    vistos.add(d.idDocumento);
    autoria.push({
      id: d.idDocumento,
      natureza: naturezas.get(String(d.idNatureza)) ?? "Outro",
      numero: d.nroLegislativo,
      ano: Number(d.anoLegislativo),
      ementa: (d.ementa ?? "").replace(/\s+/g, " ").trim(),
      data: data(d.dtPublicacao),
    });
  }
  autoria.sort((a, b) => (a.data ?? String(a.ano)).localeCompare(b.data ?? String(b.ano)) || a.id.localeCompare(b.id));
  const porNatureza = {};
  for (const p of autoria) porNatureza[p.natureza] = (porNatureza[p.natureza] ?? 0) + 1;

  const verba = { porAno: {}, porTipo: {} };
  for (const x of despesas) {
    if (x.matricula !== id) continue;
    const v = Number(x.valor) || 0;
    verba.porAno[x.ano] = Math.round(((verba.porAno[x.ano] ?? 0) + v) * 100) / 100;
    const t = String(x.tipo).replace(/^[A-Z]\s*-\s*/, "").trim();
    verba.porTipo[t] = Math.round(((verba.porTipo[t] ?? 0) + v) * 100) / 100;
  }

  const comissoesAtuais = membros
    .filter((m) => m.idMembro === id)
    .map((m) => ({
      sigla: m.siglaComissao,
      nome: comissoes.get(m.idComissao)?.nomeComissao ?? null,
      efetivo: m.efetivo === "E",
      inicio: m.dataInicio?.slice(0, 10) ?? null,
      fim: m.dataFim?.slice(0, 10) ?? null,
    }));

  saida.push({
    pessoa,
    id,
    nome,
    anos: autoria.length ? [autoria[0].ano, autoria.at(-1).ano] : null,
    porNatureza,
    apoio,
    proposituras: autoria.filter((p) => PRINCIPAIS.has(p.natureza)),
    osasco: autoria.filter((p) => !PRINCIPAIS.has(p.natureza) && /osasco/i.test(p.ementa)),
    verba,
    comissoes: comissoesAtuais,
  });
  console.log(`${pessoa}: ${autoria.length} de autoria (${autoria.filter((p) => /osasco/i.test(p.ementa)).length} citam Osasco); verba em ${Object.keys(verba.porAno).length} anos; ${comissoesAtuais.length} comissões`);
}

writeFileSync(
  "dados/deputados-alesp.json",
  JSON.stringify(
    { fonte: "Assembleia Legislativa do Estado de São Paulo, Dados Abertos", url: "https://dadosabertos.al.sp.gov.br", coletadoEm: new Date().toISOString().slice(0, 10), deputados: saida },
    null,
    1,
  ) + "\n",
);
