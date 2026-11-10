# Como escrever uma página

Cada página escrita à mão é um arquivo Markdown numa destas pastas:

| Pasta | Endereço no site | Nome do arquivo |
|---|---|---|
| `pessoas/` | `/arquivo/pessoas/<id>/` | o id da pessoa (o mesmo do endereço, ex.: `emidio.md`); para quem não está nos dados do TSE, um id novo (ex.: `hirant-sanazar.md`) |
| `partidos/` | `/arquivo/partidos/<id>/` | o id do partido (ex.: `pt.md`, `pl-antigo.md`) |
| `eleicoes/` | `/arquivo/eleicoes/<ano>/` | o ano (ex.: `1962.md`) |
| `legislaturas/` | `/arquivo/legislaturas/<período>/` | o período (ex.: `2025-2028.md`) |
| `leis/` | `/arquivo/leis/<id>/` | o mesmo id do endereço da lei (ex.: `lei-5448.md`); para lei que ainda não está nos dados da Câmara, um id novo com `titulo` no cabeçalho |
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

## Modelo de verbete de pessoa

O modelo é o de um verbete biográfico de enciclopédia (como o de Luiza Erundina na Wikipédia): abertura curta e seções em ordem do tempo. Use só as seções que tiverem fatos com fonte, nesta ordem:

1. **Abertura** (sem título): quem é, em uma ou duas frases: cargo atual ou mais alto, período, partido, e o fato público mais conhecido.
2. `## Primeiros anos e formação`: onde nasceu, onde cresceu, estudos, profissão antes da política. Nada de família que não seja pública. Em verbete curto, esta seção e a seguinte podem ser uma só: `## Primeiros anos e carreira`.
3. `## Carreira política`: em ordem do tempo, com `###` para cada fase ou cargo (ex.: `### Vereador (2009–2016)`, `### Secretário de Esportes`, `### Deputado estadual`). Cada fase diz o que a pessoa fez nela: cargos na Mesa e em comissões, leis de autoria, projetos, obras e programas que dirigiu.
4. `## Prefeitura de Osasco (AAAA–AAAA)` para prefeitos: secretariado, quando houver fonte, e a gestão dividida por área com `###` (Educação, Saúde, Habitação, Transporte e mobilidade, Obras e infraestrutura, Assistência social, Cultura, Esporte, Meio ambiente, Segurança, Finanças). Cada item é um fato: o que foi feito, nome, quantidade e ano.
5. `## Atuação na Câmara` para vereadores: comissões e frentes que presidiu, leis aprovadas, projetos relevantes.
6. *(gerado pelo site)* tabelas da legislatura atual e **Desempenho eleitoral**.
7. `## Controvérsias`: investigações, processos, cassações e decisões, sempre com data, quem acusou, o que foi decidido e o desfecho mais recente conhecido. O site mostra esta seção depois do desempenho eleitoral.
8. `## Prêmios e honrarias`: títulos e medalhas, com quem concedeu e quando.

O que a própria pessoa (ou o perfil oficial dela, ou o partido dela) diz ter feito entra atribuído: "segundo seu perfil na Câmara…", "a Prefeitura atribui à gestão…". Números de balanço de campanha ou de partido só entram atribuídos. Nada de adjetivo, avaliação ou conclusão.
