import type { Metadata } from "next";
import { Artigo, Cita, LinkPagina, NomePessoa, Secao, SiglaPartido, imagemParaQuadro, Quadro } from "@/components/artigo";
import { VICE_GALERIA, prefeitosAntigos } from "@/lib/prefeitos";
import { ANOS_MUNICIPAIS, chapas, periodoTexto, pessoa } from "@/lib/dados";
import { Referencias } from "@/lib/fontes";
import { imagemPagina } from "@/lib/imagens";
import { TabelaProjetos } from "@/components/camara";
import { CAMARA, projetosDoExecutivo } from "@/lib/camara";
import { dataPorExtenso, numero } from "@/lib/texto";

export const metadata: Metadata = { title: "Prefeitura de Osasco" };

export default function Prefeitura() {
  const refs = new Referencias();
  const imgPagina = imagemPagina("prefeitura", undefined);
  const imagemQ = imgPagina ? imagemParaQuadro(refs, imgPagina, imgPagina.legenda) : null;
  const nInst = refs.cita("ibge-historico-osasco");
  const nCf = refs.cita("cf-1988-art-29");

  // Eleições com dados do TSE: a chapa que venceu. Antes delas, as eleições escritas à mão que dizem quem venceu.
  const linhas: { ano: number; titular: React.ReactNode; vice: React.ReactNode; partido: React.ReactNode; mandato: string; cita: number[] }[] = [];
  for (const ano of [...ANOS_MUNICIPAIS].reverse()) {
    const v = chapas(ano).find((c) => c.titular.resultado === "Eleito");
    if (!v) continue;
    linhas.push({
      ano,
      titular: <NomePessoa id={v.titular.pessoa} nome={pessoa(v.titular.pessoa)?.nome ?? v.titular.nome} />,
      vice:
        v.vice?.nome && v.vice.nome !== "Nome não informado no arquivo" ? (
          <NomePessoa id={v.vice.pessoa} nome={pessoa(v.vice.pessoa)?.nome ?? v.vice.nome} />
        ) : VICE_GALERIA[ano] ? (
          <>
            {VICE_GALERIA[ano].pessoa ? <NomePessoa id={VICE_GALERIA[ano].pessoa!} nome={VICE_GALERIA[ano].nome} /> : VICE_GALERIA[ano].nome}
            <Cita n={refs.cita(VICE_GALERIA[ano].fonte)} />
          </>
        ) : (
          "sem registro no arquivo do TSE"
        ),
      partido: <SiglaPartido sigla={v.titular.partido} ano={ano} />,
      mandato: periodoTexto(ano),
      cita: [refs.cita(`tse-candidatos-${ano}`), nCf],
    });
  }
  // Antes de 1997: a lista escrita à mão em conteudo/prefeitos-antes-de-1997.yml, só com quem tem fonte.
  const antigos = prefeitosAntigos();
  const linhasAntigas = antigos
    .slice()
    .reverse()
    .map((a) => ({
      ...a,
      nome: pessoa(a.pessoa) ? <NomePessoa id={a.pessoa} nome={pessoa(a.pessoa)!.nome} /> : a.pessoa,
      viceNome: a.vice ? a.vicePessoa && pessoa(a.vicePessoa) ? <NomePessoa id={a.vicePessoa} nome={a.vice} /> : a.vice : "",
      cita: a.fontes.map((f) => refs.cita(f)),
    }));

  const executivo = projetosDoExecutivo();
  return (
    <Artigo tipo="Instituição" titulo="Prefeitura de Osasco" refs={refs} quadro={<Quadro titulo="Prefeitura de Osasco" linhas={[]} imagem={imagemQ} />}>
      <p className="prosa">
        O município de Osasco foi instalado em 19 de fevereiro de 1962, depois da eleição para a primeira administração, em 4 de fevereiro de 1962
        <Cita n={nInst} /> (ver <LinkPagina caminho="fatos/emancipacao-de-osasco" />). Desde a Constituição de 1988, prefeito e vice são eleitos
        para mandato de quatro anos e tomam posse em 1º de janeiro do ano seguinte ao da eleição.
        <Cita n={nCf} />
      </p>
      <Secao titulo="Quem venceu cada eleição">
        <div className="overflow-x-auto">
          <table className="tabela">
            <thead>
              <tr>
                <th>Eleição</th>
                <th>Prefeitura</th>
                <th>Vice</th>
                <th>Partido</th>
                <th>Mandato</th>
                <th>Fonte</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.ano}>
                  <td>
                    <LinkPagina caminho={`eleicoes/${l.ano}`}>{l.ano}</LinkPagina>
                  </td>
                  <td>{l.titular}</td>
                  <td>{l.vice}</td>
                  <td>{l.partido}</td>
                  <td>{l.mandato}</td>
                  <td>
                    <Cita n={l.cita} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-tinta-suave">
          É a chapa que venceu cada eleição. Afastamentos, cassações e substituições durante o mandato ainda não estão nesta tabela. Os mandatos
          anteriores estão na tabela seguinte.
        </p>
      </Secao>
      <Secao titulo="Prefeitos antes de 1997">
        <div className="overflow-x-auto">
          <table className="tabela">
            <thead>
              <tr>
                <th>Período</th>
                <th>Prefeitura</th>
                <th>Vice</th>
                <th>Partido</th>
                <th>Fonte</th>
              </tr>
            </thead>
            <tbody>
              {linhasAntigas.map((a, k) => (
                <tr key={k}>
                  <td className="whitespace-nowrap">{a.periodo}</td>
                  <td>
                    {a.nome}
                    {a.nota && <span className="block text-sm text-tinta-suave">{a.nota}</span>}
                  </td>
                  <td>{a.viceNome}</td>
                  <td>{a.partido ?? ""}</td>
                  <td>
                    {a.cita.map((n) => (
                      <Cita key={n} n={n} />
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-tinta-suave">
          Datas e vices como registrados na Galeria de Prefeitos da Prefeitura de Osasco; o partido, quando a biografia da Câmara dos Deputados o
          informa. Ver também <LinkPagina caminho="camara" />.
        </p>
      </Secao>

      <Secao titulo="Projetos enviados à Câmara, legislatura 2025–2028">
        <p className="mb-3">
          Nas sessões realizadas entre {dataPorExtenso(CAMARA.periodo.inicio)} e {dataPorExtenso(CAMARA.periodo.fim)}, foram lidos {numero(executivo.length)} projetos
          enviados pela Prefeitura.
          <Cita n={refs.cita("camara-sessoes")} />
        </p>
        <TabelaProjetos projetos={executivo} comAutoria={false} />
      </Secao>
    </Artigo>
  );
}
