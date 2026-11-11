// Tabela "Sanções de Leis" da Câmara Municipal (scripts/importar-sancoes-camara.mjs, dados/sancoes-camara.json): para
// cada autógrafo enviado à Prefeitura, o projeto, o autor, o número e a data da lei e o veto, de 1996 em diante.
// Serve para três coisas:
// 1. completar as leis lidas na Imprensa Oficial com o autor e o veto parcial que a Câmara registra;
// 2. dar página às leis que não aparecem nas edições lidas, quando a linha da Câmara passa pela conferência
//    (número sem repetição com outro assunto e data ou ano coerente com as leis vizinhas já lidas);
// 3. listar os projetos vetados.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { EXERCERAM, LEGISLATURAS, pessoaDoNome } from "./dados";
import { CAMARA } from "./camara";
import { convocacoesEntre, pessoasConvocadas } from "./convocacoes";
import { acharPessoa, autoresDe, dobra, idLeiIomo, leisIomo, variantes, vereadores, type LeiIomo } from "./leis";

export type Sancao = {
  tipo: "lei" | "complementar";
  autografo: string | null;
  projeto: string | null;
  autor: string | null;
  dataEnvio: string | null;
  lei: number | null;
  dataLei: string | null;
  veto: string | null;
  assunto: string;
  pagina: string;
};
type Arquivo = { fonte: string; url: string; coletadoEm: string; itens: Sancao[] };
const ARQ = path.join(process.cwd(), "dados", "sancoes-camara.json");
let _dados: Arquivo | null = null;
export function dadosSancoes(): Arquivo {
  if (!_dados) _dados = existsSync(ARQ) ? (JSON.parse(readFileSync(ARQ, "utf8")) as Arquivo) : { fonte: "", url: "", coletadoEm: "", itens: [] };
  return _dados;
}
// Linhas sem conteúdo ("Número Pulado", "--x--") ficam de fora.
export const sancoes = () => dadosSancoes().itens.filter((s) => !/^(-+x*-+|n[úu]mero pulado)$/i.test(s.assunto.trim()));
export const FONTE_SANCOES = "camara-sancoes";

// ---------- Ano e veto ----------
// "18/20" → 2020; "112/2019" → 2019.
const anoDoNumero = (s: string | null) => {
  const m = s?.match(/\/\s*(\d{2}|\d{4})\b/);
  if (!m) return null;
  const a = Number(m[1]);
  return m[1].length === 2 ? a + (a >= 60 ? 1900 : 2000) : a;
};
export const anoSancao = (s: Sancao) => Number((s.dataLei ?? s.dataEnvio)?.slice(0, 4)) || anoDoNumero(s.autografo);

export type Veto = { tipo: "total" | "parcial" | "sem tipo"; rejeitado: boolean; andamento: boolean };
export function vetoDe(s: Sancao): Veto | null {
  const v = s.veto ?? "";
  if (!v || /^[-x\s]+$/i.test(v) || /retirado/i.test(v)) return null;
  const rejeitado = /rejeitad|promulg|CMO|C\.M\.O/i.test(v);
  const andamento = /andamento/i.test(v);
  const tipo = /parcial/i.test(v) ? "parcial" : /total/i.test(v) ? "total" : "sem tipo";
  if (!rejeitado && !/vet|total|parcial|sim/i.test(v)) return null;
  return { tipo, rejeitado, andamento };
}
export const textoVeto = (v: Veto) =>
  `${v.tipo === "sem tipo" ? "Veto" : v.tipo === "total" ? "Veto total" : "Veto parcial"}${v.rejeitado ? " rejeitado pela Câmara" : v.andamento ? " em andamento" : ""}`;

// ---------- Semelhança de ementas ----------
const palavras = (s: string) => new Set(dobra(s).split(" ").filter((w) => w.length > 3));
export function parecido(a: string, b: string) {
  const A = palavras(a);
  const B = palavras(b);
  let i = 0;
  for (const w of A) if (B.has(w)) i++;
  return i / Math.max(1, new Set([...A, ...B]).size);
}

// ---------- Autoria ----------
// Vereadores da legislatura do ano (lista oficial da Câmara, perfis atuais e suplentes convocados).
const _grupos = new Map<number, Set<string>>();
function grupoDoAno(ano: number) {
  if (!_grupos.has(ano)) {
    const g = new Set<string>();
    for (const l of LEGISLATURAS)
      if (Number(l.inicio.slice(0, 4)) <= ano && ano <= Number(l.fim.slice(0, 4)))
        for (const v of l.vereadores) {
          const id = pessoaDoNome(v.nome, v.pessoa);
          if (id) g.add(id);
        }
    if (ano >= 2025) for (const v of CAMARA.vereadores) g.add(v.pessoa);
    for (const e of EXERCERAM) {
      const [a, b] = e.legislatura.split("-").map(Number);
      if (a <= ano && ano <= b) g.add(e.pessoa);
    }
    // Suplentes convocados na mesma legislatura.
    for (const l of LEGISLATURAS)
      if (Number(l.inicio.slice(0, 4)) <= ano && ano <= Number(l.fim.slice(0, 4)))
        for (const c of convocacoesEntre(l.inicio, l.fim)) if (c.pessoaConvocado) g.add(c.pessoaConvocado);
    _grupos.set(ano, g);
  }
  return _grupos.get(ano)!;
}
// Nome abreviado ("ANDRÉ SAC.", "C. PITERI", "J. AMANDO", "Tinha"): cada pedaço é o começo de uma palavra diferente de um
// nome conhecido da pessoa, e só uma pessoa do grupo bate.
const PULAR = new Set(["dr", "dra", "ver", "prof", "profa", "professor", "professora", "de", "da", "do", "das", "dos", "e"]);
function porAbreviacao(texto: string, grupo: Iterable<string>): string | null {
  const pedacos = dobra(texto)
    .split(" ")
    .filter((w) => w && !PULAR.has(w));
  if (!pedacos.length || !pedacos.some((w) => w.length >= 4)) return null;
  const achados = new Set<string>();
  for (const id of grupo)
    for (const v of variantes().get(id) ?? []) {
      const ws = v.split(" ").filter((w) => w && !PULAR.has(w));
      const usados = new Set<number>();
      const ok = pedacos.every((p) => {
        const i = ws.findIndex((w, k) => !usados.has(k) && w.startsWith(p));
        if (i < 0) return false;
        usados.add(i);
        return true;
      });
      if (ok) achados.add(id);
    }
  return achados.size === 1 ? [...achados][0] : null;
}
let _todos: Set<string> | null = null;
const todos = () => (_todos ??= new Set([...vereadores(), ...pessoasConvocadas()]));
// Grafias da tabela da Câmara que não batem com nenhum nome conhecido, conferidas à mão.
const GRAFIAS: Record<string, string> = {
  "michel figueiredo": "michel-figueredo",
  "ze carlos sta maria": "ze-carlos-do-santa-maria",
  "ze calos santa maria": "ze-carlos-do-santa-maria",
  "ze carlos santa maria": "ze-carlos-do-santa-maria",
  "paulo jr": "pr-paulo-junior",
  "reginaldo didi": "didi",
  "luiz cuca": "cuca",
  "c piterii": "claudio-piteri",
};
export const ehPrefeitura = (s: Sancao) => /^(P\.?\s*M\.?\s*[O0]\.?$|PMO\b|Prefeit|Executivo|Poder Executivo)/i.test((s.autor ?? "").trim());
export const ehMesa = (s: Sancao) => /^(Mesa|CMO$|C\.M\.O)/i.test((s.autor ?? "").trim());
const _autores = new Map<Sancao, string[]>();
export function autoresSancao(s: Sancao): string[] {
  if (_autores.has(s)) return _autores.get(s)!;
  const ids: string[] = [];
  if (s.autor && !ehPrefeitura(s) && !ehMesa(s)) {
    const ano = anoSancao(s);
    const autor = s.autor
      .replace(/(\p{Ll})(?!Oz|OZ)(\p{Lu})(?=\p{Ll})/gu, "$1 $2") // "Ana PaulaRossi", "daJuco" (mas não "JuntOz", "AtivOz")
      .replace(/\s*e?\s*outros$/i, "") // "Ralfie outros"
      .replace(/["“”]/g, "");
    for (const parte of autor.split(/\s*(?:,|\/|;|\s+e\s+|\s+-\s+)\s*/)) {
      const p = parte.replace(/^(Ver\.|Vereador(a)?|Dr\.?|Dra\.?)\s+/i, "").trim();
      if (p.length < 3) continue;
      const id =
        GRAFIAS[dobra(p)] ??
        (ano ? acharPessoa(p, grupoDoAno(ano)) : null) ??
        (ano ? acharPessoa(parte.trim(), grupoDoAno(ano)) : null) ??
        (ano ? porAbreviacao(p, grupoDoAno(ano)) : null) ??
        acharPessoa(p, todos()) ??
        porAbreviacao(p, todos());
      if (id && !ids.includes(id)) ids.push(id);
    }
  }
  _autores.set(s, ids);
  return ids;
}

// ---------- Leis lidas na Imprensa Oficial × tabela da Câmara ----------
const chave = (complementar: boolean, n: number) => `${complementar ? "C" : "L"}${n}`;
let _porChave: Map<string, Sancao[]> | null = null;
const porChave = () => {
  if (!_porChave) {
    _porChave = new Map();
    for (const s of sancoes())
      if (s.lei) {
        const k = chave(s.tipo === "complementar", s.lei);
        _porChave.set(k, [...(_porChave.get(k) ?? []), s]);
      }
  }
  return _porChave;
};
// Linha da Câmara da mesma lei: mesmo número, e mesma data ou ementa parecida.
export function sancaoDaLei(l: LeiIomo): Sancao | null {
  const cands = porChave().get(chave(l.complementar, l.numero)) ?? [];
  return cands.find((s) => s.dataLei === l.data) ?? cands.find((s) => parecido(s.assunto, l.ementa) >= 0.3) ?? null;
}

// ---------- Leis que só a Câmara registra ----------
export type LeiCamara = {
  key: string;
  lei: string;
  complementar: boolean;
  numero: number;
  data: string | null;
  ano: number;
  ementa: string;
  sancao: Sancao;
};
export const idLeiCamara = (l: LeiCamara) => `lei-${l.complementar ? "complementar-" : ""}${l.numero}`;
let _soCamara: LeiCamara[] | null = null;
export function leisSoCamara(): LeiCamara[] {
  if (_soCamara) return _soCamara;
  const lidas = new Set(leisIomo().map((l) => chave(l.complementar, l.numero)));
  const referencia = (c: boolean) =>
    leisIomo()
      .filter((l) => l.complementar === c)
      .sort((a, b) => a.numero - b.numero);
  const refs = { true: referencia(true), false: referencia(false) };
  const datadasDe = (c: boolean) =>
    sancoes()
      .filter((x) => x.lei && x.dataLei && (x.tipo === "complementar") === c)
      .map((x) => ({ numero: x.lei!, data: x.dataLei! }));
  const datadas = { true: datadasDe(true), false: datadasDe(false) };
  const desloca = (d: string, dias: number) => {
    const t = Date.parse(d);
    return Number.isNaN(t) ? d : new Date(t + dias * 864e5).toISOString().slice(0, 10);
  };
  const menosUmMes = (d: string) => desloca(d, -31);
  const maisUmMes = (d: string) => desloca(d, 31);
  const lista: LeiCamara[] = [];
  for (const [k, linhas] of porChave()) {
    if (lidas.has(k)) continue;
    // Número repetido com outro assunto: a tabela tem erro de digitação em uma das linhas, e não dá para saber qual.
    if (linhas.some((s) => parecido(s.assunto, linhas[0].assunto) < 0.3)) continue;
    const s = linhas.find((x) => x.dataLei) ?? linhas[0];
    const complementar = s.tipo === "complementar";
    const ano = anoSancao(s);
    if (!ano || !s.lei) continue;
    // Coerência com as leis vizinhas (a numeração segue a ordem das datas): as lidas na Imprensa Oficial e as outras linhas
    // datadas da própria tabela. Tolerância de um mês, porque leis do mesmo período podem ser sancionadas fora de ordem.
    const r = refs[String(complementar) as "true" | "false"];
    const vizinhas = [
      ...r.map((x) => ({ numero: x.numero, data: x.data })),
      ...datadas[String(complementar) as "true" | "false"].filter((x) => x.numero !== s.lei),
    ].sort((a, b) => a.numero - b.numero);
    const antes = vizinhas.filter((x) => x.numero < s.lei!).at(-1);
    const depois = vizinhas.find((x) => x.numero > s.lei!);
    if (s.dataLei) {
      if (antes && s.dataLei < menosUmMes(antes.data)) continue;
      if (depois && s.dataLei > maisUmMes(depois.data)) continue;
    } else {
      if (antes && ano < Number(antes.data.slice(0, 4))) continue;
      if (depois && ano > Number(depois.data.slice(0, 4))) continue;
    }
    lista.push({
      key: k,
      lei: `Lei${complementar ? " Complementar" : ""} nº ${s.lei.toLocaleString("pt-BR")}`,
      complementar,
      numero: s.lei,
      data: s.dataLei,
      ano,
      ementa: s.assunto,
      sancao: s,
    });
  }
  _soCamara = lista.sort((a, b) => (b.data ?? `${b.ano}`).localeCompare(a.data ?? `${a.ano}`) || b.numero - a.numero);
  return _soCamara;
}
let _soPorId: Map<string, LeiCamara> | null = null;
export const leiSoCamara = (id: string) => (_soPorId ??= new Map(leisSoCamara().map((l) => [idLeiCamara(l), l]))).get(id) ?? null;
export const leisSoCamaraDoAno = (ano: number) => leisSoCamara().filter((l) => l.ano === ano);
export const leisSoCamaraDeAutoria = (id: string) => leisSoCamara().filter((l) => autoresSancao(l.sancao).includes(id));

// ---------- Projetos vetados ----------
// Linhas com veto e sem número de lei: o projeto não virou lei (veto mantido ou ainda em análise).
export const projetosVetados = () => sancoes().filter((s) => !s.lei && vetoDe(s) && !vetoDe(s)!.rejeitado);
export const vetadosDoAno = (ano: number) => projetosVetados().filter((s) => anoSancao(s) === ano);
export const vetadosDeAutoria = (id: string) => projetosVetados().filter((s) => autoresSancao(s).includes(id));

// ---------- Autoria de cada lei, juntando as duas fontes ----------
export type AutoriaLei = { ids: string[]; fonte: "iomo" | "camara" | null; prefeitura: boolean; mesa: boolean };
export function autoriaDaLei(l: LeiIomo): AutoriaLei {
  const io = autoresDe(l);
  if (io.length) return { ids: io, fonte: "iomo", prefeitura: false, mesa: false };
  const s = sancaoDaLei(l);
  if (!s) return { ids: [], fonte: null, prefeitura: false, mesa: false };
  return { ids: autoresSancao(s), fonte: "camara", prefeitura: ehPrefeitura(s), mesa: ehMesa(s) };
}
// Todas as leis de autoria da pessoa: as lidas na Imprensa Oficial (autoria publicada ou, se não houver, a da tabela da
// Câmara) e as que só a Câmara registra.
export type LeiDeAutoria = { id: string; lei: string; data: string | null; ano: number; ementa: string; fonte: "iomo" | "camara"; outros: string[] };
export function leisDeAutoriaTodas(id: string): LeiDeAutoria[] {
  const lista: LeiDeAutoria[] = [];
  for (const l of leisIomo()) {
    const a = autoriaDaLei(l);
    if (a.ids.includes(id)) lista.push({ id: idLeiIomo(l), lei: l.lei, data: l.data, ano: Number(l.data.slice(0, 4)), ementa: l.ementa, fonte: a.fonte!, outros: a.ids });
  }
  for (const l of leisSoCamaraDeAutoria(id))
    lista.push({ id: idLeiCamara(l), lei: l.lei, data: l.data, ano: l.ano, ementa: l.ementa, fonte: "camara", outros: autoresSancao(l.sancao) });
  return lista.sort((a, b) => (b.data ?? `${b.ano}`).localeCompare(a.data ?? `${a.ano}`));
}

// Números entre a primeira e a última lei do ano (Imprensa Oficial e tabela da Câmara) que não aparecem em nenhuma das duas.
export function numerosFaltandoTodas(ano: number, complementar: boolean): [number, number][] {
  const todos = new Set([
    ...leisIomo().filter((l) => l.complementar === complementar).map((l) => l.numero),
    ...leisSoCamara().filter((l) => l.complementar === complementar).map((l) => l.numero),
  ]);
  const doAno = [
    ...leisIomo().filter((l) => l.complementar === complementar && l.data.startsWith(String(ano))).map((l) => l.numero),
    ...leisSoCamaraDoAno(ano).filter((l) => l.complementar === complementar).map((l) => l.numero),
  ].sort((a, b) => a - b);
  const faixas: [number, number][] = [];
  if (!doAno.length) return faixas;
  for (let n = doAno[0]; n <= doAno.at(-1)!; n++) {
    if (todos.has(n)) continue;
    const ult = faixas.at(-1);
    if (ult && ult[1] === n - 1) ult[1] = n;
    else faixas.push([n, n]);
  }
  return faixas;
}
