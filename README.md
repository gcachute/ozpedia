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
  - `npm run importar:partidos` lê os arquivos `consulta_cand_<ano>.zip` em `../avalia-osasco/data/cache/tse` (precisa do `unzip`).
- `dados/partidos-tse-registro.json` foi transcrito à mão da página do TSE de partidos registrados, fusões, incorporações e mudanças de nome.
- **Texto (escrito à mão):** `conteudo/`, em Markdown. Ver `conteudo/LEIAME.md`. Fontes em `conteudo/fontes.yml`.

Só o nome de urna é publicado; CPF, data de nascimento e nome civil não entram nos dados.

## Código

- `src/lib/dados.ts`: pessoas, partidos, eleições e legislaturas.
- `src/lib/fontes.ts`: fontes e numeração das referências de cada página.
- `src/lib/markdown.ts`: links internos `[[...]]` e chamadas de fonte `[@...]`.
- `src/app/`: uma pasta por tipo de página.
