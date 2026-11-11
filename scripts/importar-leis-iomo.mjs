// Leis municipais publicadas na Imprensa Oficial do Município de Osasco (IOMO), o diário oficial da Prefeitura.
// Rode com: npm run importar:leis
//
// 1. Lê a lista de edições da página https://osasco.sp.gov.br/imprensa-oficial/ (variável DOCS da página).
// 2. Baixa cada edição que ainda não está em cache/iomo/, tira o texto com o programa pdftotext e guarda só o texto
//    (cache/iomo/<número>.txt.gz). O PDF é apagado. Edições antigas digitalizadas como imagem não têm texto.
//    Só as edições de 2015 em diante: as anteriores são em colunas e o texto sai misturado.
// 3. Acha cada lei pelo cabeçalho ("LEI Nº 5.448, DE 07 DE JANEIRO DE 2026.") e guarda: número, data, ementa,
//    projeto de origem e autoria (quando a publicação traz), quem sancionou ou promulgou, a edição e o texto.
//    Lei publicada mais de uma vez (republicação, retificação) fica com a primeira publicação.
// Grava dados/leis-iomo.json. SEM_DOWNLOAD=1 usa só o que já está em cache.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..");
const CACHE = process.env.IOMO_CACHE ?? path.join(raiz, "cache", "iomo");
mkdirSync(CACHE, { recursive: true });
const UA = "Mozilla/5.0 (OZpediaArquivo/0.1; arquivo historico)";
const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));

// ---------- 1 e 2: edições ----------
async function edicoes() {
  const html = await (await fetch("https://osasco.sp.gov.br/imprensa-oficial/", { headers: { "User-Agent": UA } })).text();
  const m = html.match(/var DOCS = (\[.*?\]);/s);
  if (!m) throw new Error("lista de edições não encontrada na página da Imprensa Oficial");
  return JSON.parse(m[1]);
}
// Cada edição é guardada pelo nome do arquivo no site (há títulos repetidos na lista, como "IOMO 2060" para duas edições).
const nomeEdicao = (d) => path.basename(new URL(d.url).pathname).replace(/\.pdf$/i, "");
// Número da edição: o do nome do arquivo ("iomo-2160.pdf"); se o arquivo não tiver número, o do título.
const numeroEdicao = (d) => path.basename(d.url).match(/^iomo-?(\d+)/i)?.[1] ?? d.title.replace(/IOMO/i, "").trim();

// Até 2014 as edições são em colunas: o texto sai de scripts/iomo-colunas.py (lê coluna por coluna) e vai para
// <arquivo>.col.txt.gz; de 2015 em diante, do pdftotext com o layout da página.
const emColunas = (d) => Number(d.year) < 2015;
const arquivoCache = (d) => path.join(CACHE, `${nomeEdicao(d)}${emColunas(d) ? ".col" : ""}.txt.gz`);

async function baixar(d) {
  if (!d.url) return;
  const destino = arquivoCache(d);
  if (existsSync(destino) || process.env.SEM_DOWNLOAD) return;
  const pdf = path.join(CACHE, "tmp.pdf");
  for (let t = 0; t < 3; t++) {
    try {
      const r = await fetch(d.url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(120000) });
      if (!r.ok) throw new Error(String(r.status));
      writeFileSync(pdf, Buffer.from(await r.arrayBuffer()));
      const texto = emColunas(d)
        ? execFileSync("python", ["-X", "utf8", path.join(raiz, "scripts", "iomo-colunas.py"), pdf], { maxBuffer: 1 << 28 })
        : execFileSync("pdftotext", ["-layout", "-enc", "UTF-8", pdf, "-"], { maxBuffer: 1 << 28 });
      writeFileSync(destino, gzipSync(Buffer.concat([Buffer.from(JSON.stringify({ doc: d }) + "\n"), texto])));
      unlinkSync(pdf);
      await espera(500);
      return;
    } catch (e) {
      await espera(10000 * (t + 1));
    }
  }
  console.warn("não baixou:", d.title, d.url);
}

// ---------- 3: leis ----------
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const dobra = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const CABECALHO = /^\s{0,80}LEI\s+(COMPLEMENTAR\s+)?N[º°o.]*\s*([\d.]+)\s*,?\s*DE\s+(\d{1,2})[º°]?\s+DE\s+([A-ZÇa-zç]+)\s+DE\s+(\d{4})\s*\.?\s*$/i;
const RODAPE = /^(\s*IMPRENSA OFICIAL DO MUNIC|.*Imprensa Oficial do Munic[íi]pio de Osasco\s+P[áa]gina|.*Fax:.*CEP|\s*\d{4} – (Fax|CEP)|\s*P[áa]gina \d+\s*$|\s*Av\. L[áa]zaro de Mello Brand[ãa]o|\s*CEP: |\s*Home Page:|\s*@ ?PrefeituradeOsasco\s*$)/i;
const CARGO_ASSINATURA = /^(Secret[áa]ri[oa]|Prefeit[oa]|Procurador|Controlador|Chefe de Gabinete|Presidente|Vice-Prefeit)/i;
const NOME = /^[\p{L}][\p{L}\p{M} .'’-]{4,70}$/u;
const FECHO = /^\s*Osasco,\s*\d{1,2}[º°]?\s+de\s+\p{L}+\s+de\s+\d{4}\.?\s*$/u;
const FORMULA = /^\s*([\p{Lu}][\p{Lu}\p{M} .'-]+?)\s*,\s*(Prefeit[oa](?: Municipal)?(?: em [Ee]xerc[íi]cio)?|Presidente da Câmara Municipal)/u;
// Lei promulgada pela Câmara (veto rejeitado ou sanção tácita): "O Presidente [em Exercício] da Câmara de Vereadores do
// Município de Osasco, faço saber que a Câmara Municipal rejeitou o veto... promulgo a seguinte Lei". O nome vem depois do fecho.
const FORMULA_CAMARA = /^\s*O\s+Presidente(\s+em\s+Exerc[íi]cio)?\s+da\s+C[âa]mara/i;
const ORIGEM = /Projeto de Lei(?:\s+Complementar)?\s+n[º°o.]*\s*([\d.]+)\s*\/\s*(\d{2,4})(.*)/i;

// Começo de outro ato publicado na mesma edição.
const OUTRO_ATO = /^\s*(PORTARIA|DECRETO|EDITAL|EXTRATO|RESOLUÇÃO|COMUNICADO|ATO\s+N|AVISO|ERRATA|RETIFICAÇÃO)\b/;
// Cabeçalho da página que, nas edições em colunas, cai no meio do texto.
const CABECALHO_PAGINA = /^\s*(DISTRIBUI.{1,3}O\s+GRATUITA|GRATUITA|do Município de Osasco|Imprensa Oficial|EDIÇÃO Nº.*ANO.*|OSASCO, \d{1,2} DE \p{L}+ (DE )?\d{4}|PODER\s+EXECUTIVO|GABINETE\s+DO|PREFEITO|LEIS|DECRET|OS)\s*$/iu;
// Dados pessoais que às vezes aparecem em leis (homenagens, anexos): documentos, datas de nascimento e e-mails saem.
const semDadosPessoais = (t) =>
  t
    .replace(/\b(RG|R\.G\.|CPF|C\.P\.F\.)\s*(n[º°o.]*)?\s*:?\s*[\dXx./-]{6,}/g, "$1 [omitido]")
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "[omitido]")
    .replace(/(nascid[oa]\s+(?:em|no dia|aos?)\s+)(\d{1,2}[º°]?\s+de\s+\p{L}+\s+de\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/giu, "$1[data omitida]")
    .replace(/[\w.%+-]+@[\w.-]+\.[a-z]{2,}/gi, "")
    .split("\n")
    .filter((l) => !/Home Page:|www\.osasco\.sp\.gov\.br\s*$/i.test(l))
    .join("\n");

function leisDaEdicao(doc, texto) {
  const linhas = texto
    .split("\n")
    .filter((l) => !RODAPE.test(l) && !CABECALHO_PAGINA.test(l))
    .map((l) => l.replace(/\f/g, "").replace(/\s*@ ?PrefeituradeOsasco\s*$/i, ""));
  // Colunas estreitas: o cabeçalho "LEI Nº 4.283, de 27 de / novembro de 2008." pode vir em duas linhas.
  for (let i = 0; i + 1 < linhas.length; i++)
    if (/^\s*LEI\s+(COMPLEMENTAR\s+)?N[º°o.]*\s*[\d.]+/i.test(linhas[i]) && !CABECALHO.test(linhas[i]) && CABECALHO.test(`${linhas[i].trimEnd()} ${linhas[i + 1].trim()}`)) {
      linhas[i] = `${linhas[i].trimEnd()} ${linhas[i + 1].trim()}`;
      linhas[i + 1] = "";
    }
  const achadas = [];
  for (let i = 0; i < linhas.length; i++) {
    const m = linhas[i].match(CABECALHO);
    if (!m) continue;
    const mes = MESES.indexOf(dobra(m[4]).replace("marco", "março"));
    if (mes < 0) continue;
    const data = `${m[5]}-${String(mes + 1).padStart(2, "0")}-${m[3].padStart(2, "0")}`;
    // Ementa e origem: o que vem entre o cabeçalho e a fórmula de sanção ("FULANO, Prefeito do Município...").
    const ementa = [];
    let origem = null;
    let entreParenteses = false; // "(PROJETO DE LEI Nº 118/2021)" / "(ZÉ CARLOS SANTA MARIA)" antes da ementa
    let assinatura = null;
    let j = i + 1;
    for (; j < Math.min(linhas.length, i + 40); j++) {
      const f = linhas[j].match(FORMULA);
      if (f) {
        const emExercicio = !/exerc/i.test(f[2]) && /(^|\s)em\s*$/i.test(linhas[j]) && /^\s*exerc/i.test((linhas[j + 1] ?? "").normalize("NFC"));
        assinatura = { nome: f[1].trim(), cargo: emExercicio ? `${f[2]} em exercício` : f[2] };
        break;
      }
      const fc = linhas[j].match(FORMULA_CAMARA);
      if (fc) {
        assinatura = { nome: null, cargo: fc[1] ? "Presidente da Câmara Municipal em exercício" : "Presidente da Câmara Municipal" };
        break;
      }
      if (CABECALHO.test(linhas[j])) break;
      const t = linhas[j].trim();
      if (!t) continue;
      if (!origem && ORIGEM.test(t) && /^\(/.test(t)) {
        origem = t;
        entreParenteses = true;
      } else if (entreParenteses && (/^\(/.test(t) || /^[^()]{3,80}\)$/.test(t) || origem.split("(").length > origem.split(")").length)) origem += " " + t;
      else if (!entreParenteses && (origem || ORIGEM.test(t))) origem = (origem ? origem + " " : "") + t;
      else ementa.push(t);
    }
    if (!assinatura) continue; // cabeçalho citado no meio de outro texto
    // Decreto com cabeçalho lido como lei (nas edições em colunas): a fórmula de lei diz "FAZ SABER", a de decreto, "DECRETA".
    const inicio = linhas.slice(j, j + 12).join(" ");
    if (/DECRETA\s*:/.test(inicio) && !/FAZ\s+SABER|sanciona|promulg/i.test(inicio)) continue;
    // Texto: da fórmula até o fecho "Osasco, 7 de janeiro de 2026." (no máximo 400 linhas).
    const corpo = [];
    let k = j;
    for (; k < Math.min(linhas.length, j + 400); k++) {
      if (k > j && (CABECALHO.test(linhas[k]) || OUTRO_ATO.test(linhas[k]))) break;
      corpo.push(linhas[k].trim());
      if (FECHO.test(linhas[k])) break;
    }
    // Lei promulgada pela Câmara: o nome de quem promulgou é a primeira linha depois do fecho.
    if (!assinatura.nome) {
      if (!FECHO.test(linhas[k] ?? "")) continue;
      const nome = linhas.slice(k + 1, k + 6).map((l) => l.trim()).find((l) => l && NOME.test(l) && !CARGO_ASSINATURA.test(l));
      if (!nome) continue;
      assinatura.nome = nome.replace(/\s+/g, " ");
    }
    // "rejeitou o veto total aposto ao Projeto de Lei..." → "total"
    const vetoRejeitado = linhas.slice(j, j + 4).join(" ").match(/rejeitou\s+o\s+veto\s*(total|parcial)?/i)?.[1]?.toLowerCase() ?? (/rejeitou\s+o\s+veto/i.test(linhas.slice(j, j + 4).join(" ")) ? "sim" : null);
    // Assinaturas depois do fecho: pares "nome" / "cargo" (secretários que referendam a lei, além de quem sanciona).
    const referendos = [];
    if (FECHO.test(linhas[k] ?? "")) {
      const ls = [];
      for (let x = k + 1; x < Math.min(linhas.length, k + 40); x++) {
        if (CABECALHO.test(linhas[x])) break;
        const t = linhas[x].trim();
        if (t) ls.push(t);
      }
      for (let x = 0; x + 1 < ls.length; x++) {
        if (NOME.test(ls[x]) && !CARGO_ASSINATURA.test(ls[x]) && CARGO_ASSINATURA.test(ls[x + 1]) && ls[x + 1].length < 120) {
          if (/^(Secret[áa]ri[oa]|Procurador)/.test(ls[x + 1]) && !/PREFEITURA|SECRETARIA|PROCURADORIA|MUNIC[ÍI]PIO/.test(ls[x])) referendos.push({ nome: ls[x].replace(/\s+/g, " "), cargo: ls[x + 1].replace(/\s+/g, " ") });
          x++;
        } else if (x > 3) break;
      }
    }
    const o = origem?.match(ORIGEM);
    // Ano do cabeçalho diferente do ano do fecho, com o mesmo dia e mês ("LEI Nº 4.933, de 26 de novembro de 2016." numa
    // edição de 2018 que termina em "Osasco, 26 de novembro de 2018."): a data do fecho fica guardada e, no fim, a numeração
    // das leis vizinhas decide qual das duas vale.
    const f = (corpo.at(-1) ?? "").match(/(\d{1,2})[º°]?\s+de\s+(\p{L}+)\s+de\s+(\d{4})/u);
    const mesF = f ? MESES.indexOf(dobra(f[2]).replace("marco", "março")) : -1;
    const dataFecho = f && mesF >= 0 && FECHO.test(corpo.at(-1)) ? `${f[3]}-${String(mesF + 1).padStart(2, "0")}-${f[1].padStart(2, "0")}` : null;
    const corrigida = dataFecho && dataFecho.slice(5) === data.slice(5) && dataFecho.slice(0, 4) !== data.slice(0, 4) ? dataFecho : null;
    achadas.push({
      lei: `Lei${m[1] ? " Complementar" : ""} nº ${Number(m[2].replace(/\./g, "")).toLocaleString("pt-BR")}`,
      complementar: !!m[1],
      numero: Number(m[2].replace(/\./g, "")),
      data,
      ...(corrigida ? { dataFecho: corrigida } : {}),
      ementa: ementa
        .join(" ")
        .replace(/\s+/g, " ")
        .replace(/- (\p{Ll})/gu, "$1")
        .trim()
        .replace(/^[“"”]\s*/, "")
        .replace(/\s*[”"“]\s*\.?$/, "")
        .trim(),
      projeto: o ? { numero: Number(o[1].replace(/\./g, "")), ano: o[2].length === 2 ? 2000 + Number(o[2]) : Number(o[2]) } : null,
      autoriaTexto: o
        ? origem
            .replace(/\s+/g, " ")
            .replace(/(\p{L})- (\p{Ll})/gu, "$1$2") // "auto- ria", "Roma- no": palavra partida no fim da linha
            .replace(/(Vereador(?:a)?)(?=\p{Lu})/gu, "$1 ")
            .replace(/(?<!PROJETO DE)\s+(DECRETO|PORTARIA|LEI)\s+N[º°].*$/, "")
            .replace(/^.*?n[º°o.]*\s*[\d.]+\s*\/\s*\d{2,4}\s*[,–-]?\s*/i, "")
            .replace(/^\)\s*/, "")
            .replace(/^\((.*)\)$/, "$1")
            .replace(/^([^(]*)\)$/, "$1")
            .replace(/^(de\s+)?autoria\s+d[oa]s?\s+/i, "")
            .replace(/^(de\s+)?autoria$/i, "")
            .replace(/[.\s]+$/, "") || null
        : null,
      assinatura,
      ...(vetoRejeitado ? { vetoRejeitado } : {}),
      referendos,
      edicao: { numero: numeroEdicao(doc), data: doc.date.replace(/\s/g, "").split("/").reverse().join("-"), url: doc.url },
      // Sem o fecho "Osasco, <data>.", o texto pode ter emendado em outro ato da edição: fica sem transcrição.
      texto: FECHO.test(corpo.at(-1) ?? "") ? semDadosPessoais(corpo.join("\n")).replace(/\n{3,}/g, "\n\n").trim() : "",
    });
  }
  return achadas;
}

const docs = await edicoes();
console.log(`${docs.length} edições na lista`);
for (const d of docs) await baixar(d);

const porLei = new Map();
const arquivos = docs.filter((d) => d.url && existsSync(arquivoCache(d))).map((d) => path.basename(arquivoCache(d)));
for (const f of arquivos) {
  let bruto;
  try {
    bruto = gunzipSync(readFileSync(path.join(CACHE, f))).toString("utf8");
  } catch {
    console.warn("arquivo incompleto, ignorado:", f);
    continue;
  }
  const quebra = bruto.indexOf("\n");
  const { doc } = JSON.parse(bruto.slice(0, quebra));
  for (const l of leisDaEdicao(doc, bruto.slice(quebra + 1))) {
    // Data da lei incompatível com a da edição (erro de digitação na publicação, como "2924", ou lei antiga citada).
    // Se o fecho tem o mesmo dia e mês num ano possível, vale o fecho.
    const possivel = (d) => Number(d.slice(0, 4)) <= Number(doc.year) && Number(d.slice(0, 4)) >= Number(doc.year) - 3;
    if (l.dataFecho && !possivel(l.data) && possivel(l.dataFecho)) {
      l.dataCabecalho = l.data;
      l.data = l.dataFecho;
      delete l.dataFecho;
    }
    const anoLei = Number(l.data.slice(0, 4));
    if (anoLei > Number(doc.year) || anoLei < Number(doc.year) - 3) continue;
    const chave = `${l.complementar ? "LC" : "L"}-${l.numero}`;
    const atual = porLei.get(chave);
    if (!atual || l.edicao.data < atual.edicao.data) porLei.set(chave, { key: chave, ...l });
  }
}
// Cabeçalho e fecho com anos diferentes: vale o ano das leis de número vizinho (a numeração segue a ordem das datas).
const doTipo = (c) => [...porLei.values()].filter((x) => x.complementar === c && !x.dataFecho).sort((a, b) => a.numero - b.numero);
for (const l of porLei.values()) {
  if (!l.dataFecho) continue;
  const lista = doTipo(l.complementar);
  const antes = lista.filter((x) => x.numero < l.numero).at(-1);
  const depois = lista.find((x) => x.numero > l.numero);
  const cabe = (d) => (!antes || antes.data <= d) && (!depois || d <= depois.data);
  if (!cabe(l.data) && cabe(l.dataFecho)) {
    l.dataCabecalho = l.data;
    l.data = l.dataFecho;
  }
  delete l.dataFecho;
}
const leis = [...porLei.values()].sort((a, b) => b.data.localeCompare(a.data) || b.numero - a.numero);
writeFileSync(
  path.join(raiz, "dados", "leis-iomo.json"),
  JSON.stringify({ fonte: "Imprensa Oficial do Município de Osasco", url: "https://osasco.sp.gov.br/imprensa-oficial/", coletadoEm: new Date().toISOString().slice(0, 10), edicoesLidas: arquivos.length, leis }),
);
console.log(`${leis.length} leis em ${arquivos.length} edições`);
