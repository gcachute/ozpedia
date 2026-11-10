# OZpédia

Arquivo, no estilo enciclopédia, da política de Osasco (SP) desde a emancipação (1962): pessoas, partidos, eleições, legislaturas, mandatos, leis e fatos, ligados entre si e com a fonte de cada informação. Vai morar em `deolhoemoz.com.br/arquivo`, como parte do De Olho em OZ.

## Rodar na máquina

```bash
npm install
npm run dev
```

Abre em http://localhost:3300/arquivo/ (a porta 3200 é do video-eleicao).

`npm run build` gera o site estático em `out/`, com todos os endereços começando por `/arquivo`.

## Como o conteúdo é montado

- **Dados (gerados):** `dados/tse.json` (candidaturas de 1996 a 2026) e `dados/partidos-tse.json` (nome dos partidos em cada eleição) vêm da coleta do TSE já feita no repositório `avalia-osasco`, que é só lido:
  - `npm run importar:tse` lê `../avalia-osasco/data/tse/trajetorias.json`;
  - `npm run importar:camara` lê `../avalia-osasco/src/data/dados.json` e grava `dados/camara.json` (sessões, leis, vetos, proposições e perfis dos vereadores da legislatura atual; sem telefone, e-mail nem biografia);
  - `npm run importar:detalhes` grava `dados/eleicoes-tse.json` (datas, vagas, comparecimento, votos por partido, coligações, ocupação e escolaridade declaradas; contas e bens de 2024, só totais). Baixa do TSE os arquivos pequenos para `cache/tse/` (fora do repositório);
  - `npm run importar:camara-historico` grava `dados/camara-legislaturas.json`, da página oficial "Todas as Legislaturas" da Câmara (16 legislaturas, vereadores e Mesas desde 1962);
  - `npm run importar:partidos` lê os arquivos `consulta_cand_<ano>.zip` em `../avalia-osasco/data/cache/tse` (precisa do `unzip`).
- `dados/partidos-tse-registro.json` foi transcrito à mão da página do TSE de partidos registrados, fusões, incorporações e mudanças de nome.
- **Texto (escrito à mão):** `conteudo/`, em Markdown. Ver `conteudo/LEIAME.md`. Fontes em `conteudo/fontes.yml`.

Só o nome de urna é publicado; CPF, data de nascimento e nome civil não entram nos dados.

## Código

- `src/lib/dados.ts`: pessoas, partidos, eleições e legislaturas.
- `src/lib/fontes.ts`: fontes e numeração das referências de cada página.
- `src/lib/markdown.ts`: links internos `[[...]]` e chamadas de fonte `[@...]`.
- `src/app/`: uma pasta por tipo de página.
