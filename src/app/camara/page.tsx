import type { Metadata } from "next";
import { Artigo, Cita, LinkPagina, NomePessoa, Secao, imagemParaQuadro, Quadro } from "@/components/artigo";
import { legislaturas, pessoa, pessoaDoNome } from "@/lib/dados";
import { Referencias } from "@/lib/fontes";
import { imagemPagina } from "@/lib/imagens";
import { dataPorExtenso, listaE } from "@/lib/texto";
import { Autoria } from "@/components/camara";
import { autoresDe, fonteEdicao, idLeiIomo, leisIomo } from "@/lib/leis";

export const metadata: Metadata = { title: "Câmara Municipal de Osasco" };

export default function Camara() {
  const refs = new Referencias();
  const imgPagina = imagemPagina("camara", undefined);
  const imagemQ = imgPagina ? imagemParaQuadro(refs, imgPagina, imgPagina.legenda) : null;
  const nHist = refs.cita("camara-historico");
  const nLeg = refs.cita("camara-legislaturas");
  const nCf = refs.cita("cf-1988-art-29");
  const lista = legislaturas();
  // Presidentes, do mais recente ao mais antigo, com os anos de cada um.
  const presidentes: { nome: string; pessoa: string | null; anos: string[] }[] = [];
  for (const l of lista)
    for (const s of [...l.leg.sessoes].reverse())
      for (const m of s.mesa.filter((x) => x.cargo === "Presidente")) {
        const ultimo = presidentes.at(-1);
        const ano = s.inicio.slice(0, 4);
        if (ultimo && ultimo.nome === m.nome) {
          if (!ultimo.anos.includes(ano)) ultimo.anos.unshift(ano);
        } else presidentes.push({ nome: m.nome, pessoa: m.pessoa, anos: [ano] });
      }
  const total = new Set(lista.flatMap((l) => l.leg.vereadores.map((v) => pessoaDoNome(v.nome, v.pessoa) ?? v.nome))).size;
  const Nome = ({ nome, id }: { nome: string; id: string | null }) => {
    const p = pessoaDoNome(nome, id);
    return p && pessoa(p) ? <NomePessoa id={p} nome={nome} /> : <>{nome}</>;
  };
  return (
    <Artigo tipo="Instituição" titulo="Câmara Municipal de Osasco" refs={refs} quadro={<Quadro titulo="Câmara Municipal de Osasco" linhas={[]} imagem={imagemQ} />}>
      <div className="prosa">
        <p>
          A <strong>Câmara Municipal de Osasco</strong> é o Poder Legislativo do município. Os 23 primeiros vereadores tomaram posse em 19 de fevereiro de 1962, junto com o
          primeiro prefeito e o primeiro vice-prefeito.
          <Cita n={nHist} /> Desde então houve {lista.length} legislaturas, com {total} pessoas no cargo de vereador, contando os suplentes que assumiram.
          <Cita n={nLeg} /> Pela Constituição de 1988, os vereadores são eleitos para mandato de quatro anos, na mesma eleição de prefeito e vice.
          <Cita n={nCf} />
        </p>
        <h2>Primeira legislatura</h2>
        <p>
          Segundo o histórico publicado pela Câmara, a primeira legislatura aprovou o orçamento e criou o quadro de funcionários do Legislativo e do Executivo; a Câmara
          funcionou de início num parque infantil. Foram criadas por lei a Biblioteca Municipal Monteiro Lobato e a Juventude Cívica de Osasco (JUCO), e aprovada a
          concorrência para a telefonia automática da cidade, vencida pela Companhia Telefônica Suburbana Paulista (COTESPA). As leis 130 e 131 aprovaram a incorporação a
          Osasco do Centro Industrial do Jaguaré, da Vila Jaguara, da Vila Piauí e dos altos da Vila dos Remédios.
          <Cita n={nHist} />
        </p>
        <p>
          Ainda segundo esse histórico, em fevereiro de 1966 a cidade sofreu intervenção federal; o prefeito e os vereadores foram presos e perderam os mandatos, e o
          vice-prefeito Marino Pedro Nicoletti foi nomeado interventor, exercendo as funções do Executivo e do Legislativo. O primeiro presidente da Câmara foi Orlando
          Calasans.
          <Cita n={nHist} />
        </p>
      </div>
      <Secao titulo="Legislaturas">
        <div className="overflow-x-auto">
          <table className="tabela">
            <thead>
              <tr>
                <th>Legislatura</th>
                <th>Período</th>
                <th className="num">Vereadores</th>
                <th>Presidência</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((l) => {
                const pres = [...new Map(l.leg.sessoes.flatMap((s) => s.mesa.filter((m) => m.cargo === "Presidente").map((m) => [m.nome, m] as const))).values()];
                return (
                  <tr key={l.id}>
                    <td>
                      <LinkPagina caminho={`legislaturas/${l.id}`}>{`${l.numero}ª`}</LinkPagina>
                    </td>
                    <td className="whitespace-nowrap">{l.periodo}</td>
                    <td className="num">{l.leg.vereadores.length}</td>
                    <td>
                      {pres.map((m, k) => (
                        <span key={m.nome}>
                          {k > 0 && ", "}
                          <Nome nome={m.nome} id={m.pessoa} />
                        </span>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-tinta-suave">
          Fonte: Câmara Municipal de Osasco.
          <Cita n={nLeg} />
        </p>
      </Secao>
      <p className="prosa mt-4">
        Os atos de convocação de suplentes publicados na Imprensa Oficial do Município estão em <LinkPagina caminho="camara/suplentes" />.
      </p>
      <Secao titulo="Contas da Câmara no Tribunal de Contas">
        <div className="prosa">
          <p>
            As contas anuais da própria Câmara são julgadas pelo Tribunal de Contas do Estado. Julgamentos achados nas publicações do Tribunal:
          </p>
          <ul>
            <li>
              <strong>2007:</strong> julgadas irregulares pela Segunda Câmara do Tribunal em 27 de novembro de 2012, com a condenação do presidente da Câmara à
              época, <NomePessoa id="osvaldo-verginio" nome="Osvaldo Vergínio da Silva" />, a devolver R$ 3.711.200,20: R$ 425.187,81 pagos a mais aos vereadores, pelo
              reajuste dos subsídios vinculado ao dos deputados estaduais, e R$ 3.286.012,39 de verba de representação. Em 22 de junho de 2016, o Tribunal Pleno
              negou o recurso, com voto da conselheira Cristiana de Castro Moraes; o voto diz que o reajuste automático durante a legislatura ofendeu os princípios
              da anterioridade e da economicidade e que a distribuição de verbas a cada gabinete contrariou o princípio do caixa único.
              <Cita n={[refs.cita("tce-2016-06-22-voto-contas-camara-2007"), refs.cita("tce-2016-07-01-contas-camara-2007")]} />
            </li>
            <li>
              <strong>2011:</strong> julgadas irregulares em setembro de 2014, com relatoria do conselheiro Dimas Ramalho. Dos 510 cargos ocupados, 466 eram em
              comissão (91,37%) e 44 efetivos; 47 cargos em comissão tinham sido criados por resolução, sem previsão na Lei de Diretrizes Orçamentárias. O presidente
              da Câmara à época foi multado em 200 Ufesps, e o caso foi enviado ao Ministério Público. Em março de 2016, o Tribunal negou o recurso da Câmara.
              <Cita n={[refs.cita("tce-2014-09-11-contas-camara-2011"), refs.cita("tce-2016-03-21-contas-camara-2011-recurso")]} />
            </li>
            <li>
              <strong>Exercícios com contas da Câmara julgadas irregulares e decisão definitiva (trânsito em julgado) até 1º de agosto de 2025</strong>, segundo a
              relação publicada pelo Tribunal:{" "}
              {([["1998", "4902/026/98", "29/03/2004"], ["2000", "2608/026/12", "15/05/2006"], ["2002", "194/026/02", "27/08/2007"], ["2003", "1188/026/03", "08/12/2008"], ["2004", "2179/026/04", "13/10/2009"], ["2005", "1036/026/05", "23/03/2010"], ["2006", "1489/026/06", "21/09/2010"], ["2007", "3219/026/07", "07/11/2016"], ["2008", "126/026/08", "25/11/2016"], ["2009", "770/026/09", "22/05/2017"], ["2011", "2538/026/11", "25/05/2016"], ["2012", "2229/026/12", "06/05/2016"], ["2013", "126/026/13", "23/01/2017"], ["2015", "695/026/15", "14/03/2019"]] as const).map(([ex, proc, data], k, todos) => (
                <span key={ex}>
                  {ex} (processo TC-{proc}, em {data}){k < todos.length - 1 ? (k === todos.length - 2 ? " e " : ", ") : ""}
                </span>
              ))}
              .<Cita n={refs.cita("tce-2025-08-01-contas-irregulares")} />
            </li>
            <li>
              <strong>2020 a 2023:</strong> segundo o resumo da sessão de 4 de junho de 2024 da Segunda Câmara do Tribunal, &ldquo;a prestação de contas da Câmara de
              Osasco, referente a 2020, 2021, 2022, 2023, foi julgada irregular, com aplicação de multa&rdquo;.
              <Cita n={refs.cita("tce-2024-06-07-sessoes")} />
            </li>
          </ul>
        </div>
      </Secao>
      <Secao titulo="Vetos rejeitados">
        <p className="mb-3">
          Leis publicadas na Imprensa Oficial do Município em que o texto diz que a Câmara rejeitou o veto da Prefeitura ao projeto e a Presidência da Câmara
          promulgou a lei:
        </p>
        <ul className="prosa">
          {leisIomo()
            .filter((l) => l.vetoRejeitado)
            .map((l) => (
              <li key={l.key}>
                <LinkPagina caminho={`leis/${idLeiIomo(l)}`}>{l.lei}</LinkPagina>, de {dataPorExtenso(l.data)}: {l.ementa.replace(/\.$/, "")}
                {autoresDe(l).length > 0 && (
                  <>
                    {" "}
                    (autoria: <Autoria autores={autoresDe(l)} />)
                  </>
                )}
                .<Cita n={refs.cita(fonteEdicao(l))} />
              </li>
            ))}
        </ul>
      </Secao>
      <Secao titulo="Presidentes">
        <ol className="prosa">
          {presidentes.map((p, k) => (
            <li key={p.nome + k}>
              <Nome nome={p.nome} id={p.pessoa} /> ({listaE(p.anos)})
            </li>
          ))}
        </ol>
        <p className="mt-2 text-sm text-tinta-suave">
          Do mais recente ao mais antigo, pelas Mesas de cada sessão legislativa publicadas pela Câmara.
          <Cita n={[nLeg, refs.cita("camara-presidentes")]} />
        </p>
      </Secao>
    </Artigo>
  );
}
