// Gráficos da Câmara eleita (semicírculo de cadeiras por partido) para as eleições sem gráfico no Wikimedia Commons,
// feitos a partir dos eleitos registrados pelo TSE (dados/tse.json). Gera public/imagens/proprias/camara-eleita-AAAA.svg
// e dados/imagens-proprias.json, lido por src/lib/imagens.ts como as demais imagens de página.
// Rode com: npm run gerar:graficos
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const raiz = path.resolve(import.meta.dirname, "..");
const ANOS = [1996, 2020, 2024];
const tse = JSON.parse(readFileSync(path.join(raiz, "dados", "tse.json"), "utf8"));
const pasta = path.join(raiz, "public", "imagens", "proprias");
mkdirSync(pasta, { recursive: true });

// Cores só para distinguir os partidos no gráfico (não são as cores oficiais).
const CORES = {
  PT: "#c4161c", PSDB: "#0b4f9c", PTB: "#2e7d32", PSB: "#e8a33d", PMDB: "#3a8f3a", MDB: "#3a8f3a", PSDC: "#5d4037", PDT: "#d84315",
  PFL: "#1e88e5", DEM: "#1e88e5", "UNIÃO": "#1565c0", PP: "#4fc3f7", PL: "#283593", PATRIOTA: "#5e35b1", REPUBLICANOS: "#00695c",
  PSD: "#f9a825", AVANTE: "#ef6c00", PODE: "#9ccc65", REDE: "#26a69a", PSOL: "#ffb300", PRD: "#6a1b9a", "PC do B": "#b71c1c", AGIR: "#8d6e63",
};
const RESERVA = ["#546e7a", "#7e57c2", "#ec407a", "#9ccc65", "#8d6e63", "#26c6da"];

// Posições das cadeiras num semicírculo, em fileiras, da esquerda para a direita.
function cadeiras(n) {
  const fileiras = n <= 25 ? 2 : 3;
  const raios = Array.from({ length: fileiras }, (_, i) => 1 - i * 0.27);
  const soma = raios.reduce((a, b) => a + b, 0);
  const porFileira = raios.map((r) => Math.round((n * r) / soma));
  porFileira[0] += n - porFileira.reduce((a, b) => a + b, 0);
  const pontos = [];
  raios.forEach((r, i) => {
    const k = porFileira[i];
    for (let j = 0; j < k; j++) {
      const ang = Math.PI - (Math.PI * (j + 0.5)) / k;
      pontos.push({ x: r * Math.cos(ang), y: r * Math.sin(ang), ang });
    }
  });
  return pontos.sort((a, b) => b.ang - a.ang);
}

const entradas = [];
for (const ano of ANOS) {
  const porPartido = new Map();
  for (const p of tse.pessoas)
    for (const c of p.candidaturas)
      if (c.ano === ano && c.cargo === "Vereador" && c.local === "Osasco" && c.resultado === "Eleito")
        porPartido.set(c.partido, (porPartido.get(c.partido) ?? 0) + 1);
  const partidos = [...porPartido].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const total = partidos.reduce((s, [, n]) => s + n, 0);
  let reserva = 0;
  const cor = new Map(partidos.map(([p]) => [p, CORES[p] ?? RESERVA[reserva++ % RESERVA.length]]));
  const seq = partidos.flatMap(([p, n]) => Array(n).fill(p));
  const L = 600, A = 300, cx = L / 2, cy = 270, R = 240, raio = 23;
  const circulos = cadeiras(total)
    .map((pt, i) => `<circle cx="${(cx + pt.x * R).toFixed(1)}" cy="${(cy - pt.y * R).toFixed(1)}" r="${raio}" fill="${cor.get(seq[i])}"/>`)
    .join("");
  const colunas = 3;
  const legenda = partidos
    .map(([p, n], i) => {
      const x = 30 + (i % colunas) * 190;
      const y = A + 30 + Math.floor(i / colunas) * 30;
      return `<rect x="${x}" y="${y - 14}" width="18" height="18" rx="3" fill="${cor.get(p)}"/><text x="${x + 26}" y="${y}" font-size="17">${p} (${n})</text>`;
    })
    .join("");
  const altura = A + 40 + Math.ceil(partidos.length / colunas) * 30;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${altura}" width="${L}" height="${altura}" font-family="Arial, Helvetica, sans-serif"><rect width="100%" height="100%" fill="#fff"/>${circulos}<text x="${cx}" y="${cy - 10}" font-size="44" font-weight="bold" text-anchor="middle">${total}</text>${legenda}</svg>\n`;
  const arquivo = `camara-eleita-${ano}.svg`;
  writeFileSync(path.join(pasta, arquivo), svg);
  for (const chave of [`eleicoes/${ano}`, `legislaturas/${ano + 1}-${ano + 4}`])
    entradas.push({
      chave,
      arquivo: `Câmara eleita em ${ano} (gráfico da OZpédia)`,
      legenda: `Vereadores eleitos em ${ano}, por partido, segundo o resultado da apuração no TSE`,
      autor: "OZpédia, com dados do Tribunal Superior Eleitoral",
      licenca: "domínio público",
      licencaUrl: null,
      pagina: "https://dadosabertos.tse.jus.br/",
      data: null,
      caminho: `/imagens/proprias/${arquivo}`,
    });
  console.log(ano, total, partidos.map(([p, n]) => `${p} ${n}`).join(", "));
}
writeFileSync(path.join(raiz, "dados", "imagens-proprias.json"), JSON.stringify({ paginas: entradas }, null, 1) + "\n");
