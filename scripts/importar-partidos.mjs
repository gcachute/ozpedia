// Nome completo de cada partido, como o TSE o escreve no cadastro de candidaturas de cada eleição municipal
// (coluna NM_PARTIDO de consulta_cand_<ano>_SP.csv), só das candidaturas de Osasco.
// Lê os arquivos do TSE que o De Olho em OZ já baixou (só leitura). Precisa do programa unzip.
// Rode com: npm run importar:partidos   (ou: CACHE=caminho/para/cache/tse npm run importar:partidos)
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const CACHE = process.env.CACHE ?? "../avalia-osasco/data/cache/tse";
const ANOS = [1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024];

const nomes = {};
for (const ano of ANOS) {
  const zip = `${CACHE}/consulta_cand_${ano}.zip`;
  if (!existsSync(zip)) {
    console.log(`${ano}: arquivo não encontrado (${zip})`);
    continue;
  }
  const unzip = spawn("unzip", ["-p", zip, `consulta_cand_${ano}_SP.csv`]);
  unzip.stdout.setEncoding("latin1");
  let cab = null;
  for await (const linha of createInterface({ input: unzip.stdout })) {
    const c = linha.split(";").map((x) => x.replace(/^"|"$/g, ""));
    if (!cab) {
      cab = Object.fromEntries(c.map((k, i) => [k, i]));
      continue;
    }
    if (c[cab.NM_UE]?.toUpperCase() !== "OSASCO") continue;
    const sigla = c[cab.SG_PARTIDO];
    const nome = c[cab.NM_PARTIDO];
    if (!sigla || !nome || nome.startsWith("#")) continue;
    (nomes[sigla] ??= {})[ano] = nome;
  }
  console.log(`${ano}: ok`);
}

mkdirSync("dados", { recursive: true });
writeFileSync(
  "dados/partidos-tse.json",
  `${JSON.stringify({ fonte: "Tribunal Superior Eleitoral, dados abertos: candidaturas (consulta_cand), coluna NM_PARTIDO", url: "https://dadosabertos.tse.jus.br/", nomes }, null, 1)}\n`,
);
console.log(`${Object.keys(nomes).length} siglas gravadas em dados/partidos-tse.json`);
