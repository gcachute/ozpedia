# Como escrever uma página

Cada página escrita à mão é um arquivo Markdown numa destas pastas:

| Pasta | Endereço no site | Nome do arquivo |
|---|---|---|
| `pessoas/` | `/arquivo/pessoas/<id>/` | o id da pessoa (o mesmo do endereço, ex.: `emidio.md`); para quem não está nos dados do TSE, um id novo (ex.: `hirant-sanazar.md`) |
| `partidos/` | `/arquivo/partidos/<id>/` | o id do partido (ex.: `pt.md`, `pl-antigo.md`) |
| `eleicoes/` | `/arquivo/eleicoes/<ano>/` | o ano (ex.: `1962.md`) |
| `legislaturas/` | `/arquivo/legislaturas/<período>/` | o período (ex.: `2025-2028.md`) |
| `fatos/` | `/arquivo/fatos/<id>/` | um id curto, sem acento (ex.: `emancipacao-de-osasco.md`) |

Se a página já existe com os dados do TSE (pessoas, partidos e eleições de 1996 em diante), o texto escrito entra no lugar da frase automática, e as tabelas continuam embaixo.

## Cabeçalho

Entre as linhas `---` no começo do arquivo:

- `titulo`: nome da página (para pessoas, só quando não vem do TSE).
- Pessoas: `cargos`, lista de cargos que não estão nos dados do TSE, cada um com `cargo`, `eleicao` (ano) e `fonte`.
- Eleições: `data` (AAAA-MM-DD) e `fonteData`; `eleitos`, lista com `cargo` (`Prefeitura`, `Vice-prefeitura`...), `pessoa` (id) e `fonte`.
- Fatos: `quando` (AAAA-MM-DD), `fonteQuando` e `relacionados` (lista de páginas, ex.: `pessoas/hirant-sanazar`).

## Texto

- Link para outra página: `[[pessoas/hirant-sanazar]]` ou `[[eleicoes/1962|eleição de 1962]]`.
- Fonte: `[@ibge-historico-osasco]`, logo depois da frase. A fonte precisa estar em `fontes.yml`.
- Toda frase com informação leva fonte. Sem opinião, sem conclusão, sem adjetivo de avaliação.
- Nada de CPF, endereço, telefone ou outro dado pessoal.

Link para página que não existe, ou fonte que não está em `fontes.yml`, faz a montagem do site parar com o nome do problema.
