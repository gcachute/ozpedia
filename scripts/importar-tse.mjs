// Traz as candidaturas do TSE já coletadas pelo De Olho em OZ (só leitura: o arquivo de lá não é alterado).
// Rode com: npm run importar:tse   (ou: ORIGEM=caminho/para/trajetorias.json npm run importar:tse)
//
// Cada pessoa ganha um identificador fixo (o "id"), tirado do nome de urna. Nome de urna repetido entre pessoas
// diferentes ganha o ano da primeira candidatura no fim (ex.: "jose-silva-2004"). Os ids que já existiam em
// dados/tse.json são mantidos, para os links das páginas escritas à mão não quebrarem numa nova importação.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";

const ORIGEM = process.env.ORIGEM ?? "../avalia-osasco/data/tse/trajetorias.json";
const DESTINO = "dados/tse.json";

const origem = JSON.parse(readFileSync(ORIGEM, "utf8"));
const anterior = existsSync(DESTINO) ? JSON.parse(readFileSync(DESTINO, "utf8")) : null;

const slug = (s) =>
  String(s)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Chave para reconhecer a mesma pessoa numa nova importação: nome de urna + primeira candidatura.
const chave = (p) => {
  const c = p.candidaturas[0];
  return `${p.urna}|${c.ano}|${c.cargo}|${c.numero}`;
};
const idsAnteriores = new Map((anterior?.pessoas ?? []).map((p) => [chave(p), p.id]));

// "#NE" e afins: o TSE não informou o nome de urna naquela linha (acontece com candidaturas a vice em 2000).
const valido = (u) => (u && !u.startsWith("#") ? u : null);
for (const p of origem.pessoas) {
  for (const c of p.candidaturas) c.urna = valido(c.urna);
  p.urna = [...p.candidaturas].reverse().find((c) => c.urna)?.urna ?? null;
}

const porSlug = new Map();
for (const p of origem.pessoas) {
  const s = slug(p.urna ?? "sem-nome");
  porSlug.set(s, (porSlug.get(s) ?? 0) + 1);
}
const usados = new Set(idsAnteriores.values());
const pessoas = origem.pessoas.map((p) => {
  let id = idsAnteriores.get(chave(p));
  if (!id) {
    const base = slug(p.urna ?? "sem-nome");
    id = porSlug.get(base) > 1 ? `${base}-${p.candidaturas[0].ano}` : base;
    let n = 2;
    while (usados.has(id)) id = `${base}-${p.candidaturas[0].ano}-${n++}`;
    usados.add(id);
  }
  // Só o que é público na urna: nome de urna, cargo, partido, número, situação, resultado e votos.
  return {
    id,
    urna: p.urna,
    candidaturas: p.candidaturas.map(({ ano, cargo, local, partido, numero, urna, situacao, resultado, votos, votos2turno }) => ({
      ano,
      cargo,
      local,
      partido,
      numero,
      urna,
      situacao,
      resultado,
      votos,
      ...(votos2turno != null ? { votos2turno } : {}),
    })),
  };
});

mkdirSync("dados", { recursive: true });
writeFileSync(
  DESTINO,
  `${JSON.stringify({ fonte: origem.fonte, url: origem.url, coletadoEm: origem.coletadoEm, pessoas }, null, 0)}\n`,
);
console.log(`${pessoas.length} pessoas gravadas em ${DESTINO} (coleta do TSE de ${origem.coletadoEm})`);
