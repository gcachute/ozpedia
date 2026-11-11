// Traz da coleta do De Olho em OZ (só leitura) o que a Câmara Municipal publicou na legislatura atual:
// sessões, leis sancionadas e vetos lidos nas sessões, projetos apresentados e o perfil oficial de cada vereador.
// Rode com: npm run importar:camara   (ou: ORIGEM=caminho/para/dados.json npm run importar:camara)
//
// Do perfil oficial ficam só nome completo, naturalidade, ocupação e instrução, como a Câmara publica.
// Telefone, e-mail, redes e biografia não entram.
import { readFileSync, writeFileSync } from "node:fs";

const ORIGEM = process.env.ORIGEM ?? "../avalia-osasco/src/data/dados.json";
const d = JSON.parse(readFileSync(ORIGEM, "utf8"));
const tse = JSON.parse(readFileSync("dados/tse.json", "utf8"));

const dobra = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();

// Vereador do De Olho em OZ → pessoa da OZpédia: o nome usado lá igual a um nome de urna de 2020 em diante (nome que
// aponta para mais de uma pessoa não serve); senão, o mesmo identificador, se a pessoa disputou a Câmara de 2020 em diante.
const porUrna = new Map();
for (const p of tse.pessoas)
  for (const c of p.candidaturas)
    if (c.ano >= 2020 && c.urna) {
      const k = dobra(c.urna);
      porUrna.set(k, porUrna.has(k) && porUrna.get(k) !== p.id ? null : p.id);
    }
const recentes = new Set(tse.pessoas.filter((p) => p.candidaturas.some((c) => c.ano >= 2020 && c.cargo === "Vereador" && c.local === "Osasco")).map((p) => p.id));
// Ligações feitas à mão, quando o nome de urna é outro. André Luís Alves Pereira: suplente do Republicanos, chamado de
// "Andrezinho" nas planilhas das sessões; no TSE, "ANDREZINHO", suplente do Republicanos em 2024.
const MANUAL = { "andre-luis-alves-pereira": "andrezinho" };
const pessoaDe = {};
const semPar = [];
for (const v of d.vereadores) {
  const id = MANUAL[v.id] ?? porUrna.get(dobra(v.nome)) ?? (recentes.has(v.id) ? v.id : null);
  if (id) pessoaDe[v.id] = id;
  else semPar.push(v.nome);
}
// Projeto do Executivo tem a Prefeitura como autora (autorTexto), não a pessoa do prefeito.
const autores = (lista) => (lista ?? []).map((a) => pessoaDe[a] ?? null).filter(Boolean);
const unicos = (itens) => [...new Map(itens.map((x) => [x.key, x])).values()];

const leis = unicos(d.vereadores.flatMap((v) => v.leis)).map((l) => ({
  key: l.key,
  lei: l.lei,
  data: l.data,
  autores: autores(l.autores),
  resumo: l.resumo,
  sessao: l.sessao,
}));
const vetos = unicos([...d.vereadores.flatMap((v) => v.vetos), ...(d.prefeito.vetos ?? [])]).map((x) => ({
  key: x.key,
  tipo: x.tipo,
  numero: x.numero,
  projeto: x.projeto,
  autores: autores(x.autores),
  resumo: x.resumo,
  sessao: x.sessao,
}));
const projetos = unicos([...d.vereadores.flatMap((v) => v.proposicoes), ...(d.prefeito.projetos ?? [])]).map((p) => ({
  key: p.key,
  tipo: p.tipo,
  numero: p.numero,
  ano: p.ano,
  autores: autores(p.autores),
  autorTexto: p.autores?.includes("prefeito") ? "Prefeitura" : null,
  ementa: p.ementa,
  sessao: p.sessao,
}));
const vereadores = d.vereadores
  .filter((v) => pessoaDe[v.id])
  .map((v) => ({
    pessoa: pessoaDe[v.id],
    nome: v.nome,
    perfilOficial: v.perfilOficial,
    emExercicio: v.emExercicio,
    perfil: {
      // O perfil da Câmara traz "(Suplente)" junto do nome; a situação já aparece nas tabelas.
      nomeCompleto: v.perfil?.nomeCompleto?.replace(/\s*\(suplente\)\s*$/i, "") ?? null,
      naturalidade: v.perfil?.naturalidade ?? null,
      ocupacao: v.perfil?.ocupacao ?? null,
      instrucao: v.perfil?.instrucao ?? null,
    },
  }));

writeFileSync(
  "dados/camara.json",
  `${JSON.stringify(
    {
      fonte: "Câmara Municipal de Osasco: planilhas de votação e expediente das sessões e perfis dos vereadores (coleta do De Olho em OZ)",
      periodo: d.periodo,
      coletadoEm: d.geradoEm.slice(0, 10),
      sessoes: d.sessoes.map(({ id, numero, tipo, data, url }) => ({ id, numero, tipo, data, url })),
      leis,
      vetos,
      projetos,
      vereadores,
    },
    null,
    0,
  )}\n`,
);
console.log(`${leis.length} leis, ${vetos.length} vetos, ${projetos.length} projetos, ${vereadores.length} perfis, ${d.sessoes.length} sessões`);
if (semPar.length) console.log(`Sem página correspondente: ${semPar.join(", ")}`);
