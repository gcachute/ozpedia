// Traz dos Dados Abertos da Câmara dos Deputados (https://dadosabertos.camara.leg.br) a atuação dos deputados federais
// ligados a Osasco: mandatos (posses, licenças, renúncias, troca de partido), comissões e outros órgãos, proposições em
// que aparecem entre os autores e, desde 2008, o uso da cota parlamentar somado por ano e por tipo de despesa.
// Rode com: npm run importar:deputados
//
// Não entram: nomes de fornecedores da cota (podem ser pessoas físicas), e-mail, telefone e CPF.
import { writeFileSync } from "node:fs";

const API = "https://dadosabertos.camara.leg.br/api/v2";

// Deputado na Câmara → pessoa da OZpédia (os identificadores da Câmara são os das biografias já citadas em fontes.yml).
const DEPUTADOS = {
  "joao-paulo-cunha": 73534,
  "celso-giglio": 74703,
  "francisco-rossi": 139212,
  "guacu-piteri": 131509,
  "humberto-parro": 73974,
  "valmir-prascidelli": 113247,
  "fabio-teruel": 220653,
  "ribamar-silva": 175765,
};

// Tipos de proposição listados um a um; os demais (requerimentos, indicações, emendas...) entram só na contagem.
const PRINCIPAIS = new Set(["PL", "PLP", "PEC", "PDC", "PDL", "PRC", "MPV"]);

const inicioLeg = (n) => 1995 + (n - 50) * 4; // 50ª legislatura: 1995–1999
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function pega(url, tentativas = 5) {
  for (let t = 1; ; t++) {
    try {
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      if (r.ok) return await r.json();
      if (t >= tentativas) throw new Error(`${r.status} em ${url}`);
    } catch (e) {
      if (t >= tentativas) throw e;
    }
    await espera(1500 * t);
  }
}
// Percorre todas as páginas de uma consulta.
async function todas(url) {
  const lista = [];
  let prox = url;
  while (prox) {
    const j = await pega(prox);
    lista.push(...j.dados);
    prox = j.links?.find((l) => l.rel === "next")?.href ?? null;
    await espera(150);
  }
  return lista;
}

// Nome de cada tipo de proposição, como a Câmara publica (PL: Projeto de Lei...). A mesma sigla aparece em vários
// subtipos ("Requerimento de Urgência", "Requerimento de Voto de pesar"...); fica o primeiro, que é o nome geral.
const tipos = {};
for (const t of (await pega(`${API}/referencias/proposicoes/siglaTipo`)).dados) tipos[t.sigla.trim()] ??= t.nome.trim();

const saida = [];
for (const [pessoa, id] of Object.entries(DEPUTADOS)) {
  const d = (await pega(`${API}/deputados/${id}`)).dados;
  const historico = (await todas(`${API}/deputados/${id}/historico`))
    // A Câmara repete, com data de 2023, um registro de "nome e partido no início da legislatura" para cada legislatura antiga.
    .filter((h) => h.situacao || h.condicaoEleitoral)
    .map((h) => ({
      data: h.dataHora,
      legislatura: h.idLegislatura,
      partido: h.siglaPartido,
      situacao: h.situacao,
      condicao: h.condicaoEleitoral,
      descricao: h.descricaoStatus,
    }))
    .sort((a, b) => a.data.localeCompare(b.data));
  // Legislaturas em que exerceu mandato; a que ainda não começou (eleito em 2026, posse em 2027) fica de fora.
  const legislaturas = [...new Set((await todas(`${API}/deputados/${id}/historico`)).map((h) => h.idLegislatura))]
    .filter((n) => inicioLeg(n) <= new Date().getFullYear())
    .sort((a, b) => a - b);

  const orgaos = (await todas(`${API}/deputados/${id}/orgaos?dataInicio=1950-01-01&dataFim=2030-12-31&itens=100`)).map((o) => ({
    sigla: o.siglaOrgao,
    nome: o.nomePublicacao || o.nomeOrgao,
    cargo: o.titulo,
    inicio: o.dataInicio?.slice(0, 10) ?? null,
    fim: o.dataFim?.slice(0, 10) ?? null,
    id: o.idOrgao,
  }));

  // Proposições: ano a ano, nos anos de cada legislatura (e no ano seguinte ao fim, que a API às vezes registra).
  const anos = [...new Set(legislaturas.flatMap((n) => [0, 1, 2, 3, 4].map((k) => inicioLeg(n) + k)))].filter((a) => a <= 2026);
  const props = new Map();
  for (const ano of anos)
    for (const p of await todas(`${API}/proposicoes?idDeputadoAutor=${id}&ano=${ano}&itens=100&ordem=ASC&ordenarPor=id`))
      props.set(p.id, { id: p.id, tipo: p.siglaTipo, numero: p.numero, ano: p.ano, ementa: p.ementa?.trim() ?? "", data: p.dataApresentacao?.slice(0, 10) ?? null });
  const proposicoes = [...props.values()].sort((a, b) => (a.data ?? "").localeCompare(b.data ?? "") || a.id - b.id);
  const porTipo = {};
  for (const p of proposicoes) porTipo[p.tipo] = (porTipo[p.tipo] ?? 0) + 1;

  // Cota parlamentar (a Câmara publica desde 2008): só totais, sem fornecedores. O valor de cada documento é o valor
  // apresentado menos a glosa (a parte não reembolsada); o campo valorLiquido da API vem com o sinal trocado em parte dos itens.
  const cota = { porAno: {}, porTipo: {} };
  for (const n of legislaturas)
    for (const ano of [0, 1, 2, 3, 4].map((k) => inicioLeg(n) + k).filter((a) => a >= 2008 && a <= 2026)) {
    const ds = await todas(`${API}/deputados/${id}/despesas?idLegislatura=${n}&ano=${ano}&itens=100`);
    for (const x of ds) {
      const v = (Number(x.valorDocumento) || 0) - (Number(x.valorGlosa) || 0);
      cota.porAno[x.ano] = Math.round(((cota.porAno[x.ano] ?? 0) + v) * 100) / 100;
      const t = x.tipoDespesa.trim();
      cota.porTipo[t] = Math.round(((cota.porTipo[t] ?? 0) + v) * 100) / 100;
    }
  }

  const frentes = (await todas(`${API}/deputados/${id}/frentes`)).map((f) => ({ titulo: f.titulo.trim(), legislatura: f.idLegislatura, id: f.id }));

  saida.push({
    pessoa,
    id,
    nome: d.ultimoStatus?.nomeEleitoral ?? d.ultimoStatus?.nome,
    legislaturas,
    historico,
    orgaos,
    proposicoes: proposicoes.filter((p) => PRINCIPAIS.has(p.tipo)),
    // Qualquer tipo (requerimento, indicação, emenda...) cuja ementa cita Osasco.
    osasco: proposicoes.filter((p) => !PRINCIPAIS.has(p.tipo) && /osasco/i.test(p.ementa)),
    porTipo,
    cota,
    frentes,
  });
  console.log(`${pessoa}: legislaturas ${legislaturas.join(", ")}; ${orgaos.length} órgãos; ${proposicoes.length} proposições; ${frentes.length} frentes`);
}

writeFileSync(
  "dados/deputados-camara.json",
  JSON.stringify({ fonte: "Câmara dos Deputados, Dados Abertos", url: "https://dadosabertos.camara.leg.br", coletadoEm: new Date().toISOString().slice(0, 10), tipos, deputados: saida }, null, 1) + "\n",
);
