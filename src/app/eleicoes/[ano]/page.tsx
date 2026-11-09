import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Artigo, Cita, LinkPagina, NomePessoa, Quadro, Secao, SiglaPartido, TextoEscrito, type LinhaQuadro } from "@/components/artigo";
import { escrita } from "@/lib/conteudo";
import { ANOS_MUNICIPAIS, candidaturasDe, chapas, chavePartido, eleicoes, eleitosCamara, periodo, periodoTexto, pessoa, rotuloResultado } from "@/lib/dados";
import { Referencias } from "@/lib/fontes";
import { markdown } from "@/lib/markdown";
import { dataPorExtenso, numero } from "@/lib/texto";

type Props = { params: Promise<{ ano: string }> };

export const generateStaticParams = () => eleicoes().map((e) => ({ ano: String(e.ano) }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Eleição municipal de ${(await params).ano}` };
}

export default async function PaginaEleicao({ params }: Props) {
  const ano = Number((await params).ano);
  const info = eleicoes().find((e) => e.ano === ano);
  if (!info) notFound();
  const e = escrita("eleicoes", String(ano));
  const refs = new Referencias();
  const linhas: LinhaQuadro[] = [];
  const anterior = eleicoes().find((x) => x.ano < ano);
  const seguinte = [...eleicoes()].reverse().find((x) => x.ano > ano);

  if (e?.cab.data) linhas.push({ rotulo: "Data", valor: dataPorExtenso(e.cab.data), cita: e.cab.fonteData ? refs.cita(e.cab.fonteData) : undefined });

  let nCand = 0;
  let nRes = 0;
  const tse = ANOS_MUNICIPAIS.includes(ano);
  const ch = tse ? chapas(ano) : [];
  const eleitos = tse ? eleitosCamara(ano) : [];
  const vereadores = tse ? candidaturasDe(ano).filter((c) => c.cargo === "Vereador") : [];
  if (tse) {
    nCand = refs.cita(`tse-candidatos-${ano}`);
    nRes = refs.cita(`tse-resultados-${ano}`);
    const vencedora = ch.find((c) => c.titular.resultado === "Eleito");
    if (vencedora)
      linhas.push({
        rotulo: "Prefeitura",
        valor: (
          <>
            <NomePessoa id={vencedora.titular.pessoa} nome={vencedora.titular.nome} /> (<SiglaPartido sigla={vencedora.titular.partido} ano={ano} />)
          </>
        ),
        cita: nCand,
      });
    if (vencedora?.vice)
      linhas.push({ rotulo: "Vice-prefeitura", valor: <NomePessoa id={vencedora.vice.pessoa} nome={vencedora.vice.nome} />, cita: nCand });
    linhas.push({ rotulo: "Mandato", valor: periodoTexto(ano), cita: refs.cita("cf-1988-art-29") });
    linhas.push({ rotulo: "Câmara", valor: `${eleitos.length} vagas preenchidas; ${numero(vereadores.length)} candidaturas`, cita: nCand });
  }
  for (const el of e?.cab.eleitos ?? [])
    linhas.push({ rotulo: el.cargo, valor: pessoa(el.pessoa) ? <NomePessoa id={el.pessoa} nome={pessoa(el.pessoa)!.nome} /> : el.pessoa, cita: refs.cita(el.fonte) });
  linhas.push({
    rotulo: "Outras eleições",
    valor: (
      <>
        {anterior && (
          <span className="block">
            Anterior: <LinkPagina caminho={`eleicoes/${anterior.ano}`}>{anterior.ano}</LinkPagina>
          </span>
        )}
        {seguinte && (
          <span className="block">
            Seguinte: <LinkPagina caminho={`eleicoes/${seguinte.ano}`}>{seguinte.ano}</LinkPagina>
          </span>
        )}
      </>
    ),
  });

  const html = e?.corpo ? markdown(e.corpo, refs) : null;
  const doisTurnos = ch.some((c) => c.titular.votos2turno != null);

  // Vagas por partido na Câmara.
  const porPartido = new Map<string, { sigla: string | null; n: number }>();
  for (const c of eleitos) {
    const k = chavePartido(c.partido, ano) ?? "";
    porPartido.set(k, { sigla: c.partido, n: (porPartido.get(k)?.n ?? 0) + 1 });
  }

  return (
    <Artigo tipo="Eleição" titulo={`Eleição municipal de ${ano} em Osasco`} refs={refs} quadro={<Quadro titulo={`Eleição de ${ano}`} linhas={linhas} />}>
      {html ? (
        <TextoEscrito html={html} />
      ) : (
        tse && (
          <p className="prosa">
            Na eleição municipal de {ano}, Osasco escolheu prefeito, vice-prefeito e vereadores para o mandato de {periodoTexto(ano)}.
            <Cita n={refs.cita("cf-1988-art-29")} />
          </p>
        )
      )}

      {tse && (
        <>
          <Secao titulo="Prefeitura">
            <div className="overflow-x-auto">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Candidatura</th>
                    <th>Vice</th>
                    <th>Partido</th>
                    <th className="num">Número</th>
                    <th className="num">Votos{doisTurnos ? " (1º turno)" : ""}</th>
                    {doisTurnos && <th className="num">Votos (2º turno)</th>}
                    <th>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {ch.map(({ titular: t, vice: v }) => (
                    <tr key={t.pessoa}>
                      <td>
                        <NomePessoa id={t.pessoa} nome={t.nome} />
                      </td>
                      <td>{v ? <NomePessoa id={v.pessoa} nome={v.nome} /> : "—"}</td>
                      <td>
                        <SiglaPartido sigla={t.partido} ano={ano} />
                      </td>
                      <td className="num">{t.numero}</td>
                      <td className="num">{numero(t.votos) || "—"}</td>
                      {doisTurnos && <td className="num">{t.votos2turno != null ? numero(t.votos2turno) : ""}</td>}
                      <td>{rotuloResultado(t)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-sm text-tinta-suave">
              Fonte: Tribunal Superior Eleitoral, candidaturas
              <Cita n={nCand} /> e votação nominal nas zonas de Osasco.
              <Cita n={nRes} />
            </p>
          </Secao>

          <Secao titulo="Câmara Municipal">
            <p className="mb-3">
              Composição eleita para a <LinkPagina caminho={`legislaturas/${periodo(ano)}`}>legislatura {periodoTexto(ano)}</LinkPagina>.
            </p>
            <h3 className="mb-2 font-bold">Vagas por partido</h3>
            <ul className="mb-6 flex flex-wrap gap-x-5 gap-y-1">
              {[...porPartido.values()]
                .sort((a, b) => b.n - a.n || (a.sigla ?? "").localeCompare(b.sigla ?? ""))
                .map((x) => (
                  <li key={x.sigla}>
                    <SiglaPartido sigla={x.sigla} ano={ano} />: {x.n}
                  </li>
                ))}
            </ul>
            <h3 className="mb-2 font-bold">Quem venceu</h3>
            <div className="overflow-x-auto">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Nome de urna</th>
                    <th>Partido</th>
                    <th className="num">Número</th>
                    <th className="num">Votos</th>
                  </tr>
                </thead>
                <tbody>
                  {eleitos.map((c) => (
                    <tr key={c.pessoa}>
                      <td>
                        <NomePessoa id={c.pessoa} nome={c.nome} />
                      </td>
                      <td>
                        <SiglaPartido sigla={c.partido} ano={ano} />
                      </td>
                      <td className="num">{c.numero}</td>
                      <td className="num">{numero(c.votos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <details className="mt-6">
              <summary className="cursor-pointer font-bold text-cidade">Todas as {numero(vereadores.length)} candidaturas à Câmara</summary>
              <div className="mt-3 overflow-x-auto">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Nome de urna</th>
                      <th>Partido</th>
                      <th className="num">Número</th>
                      <th className="num">Votos</th>
                      <th>Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...vereadores]
                      .sort((a, b) => (b.votos ?? -1) - (a.votos ?? -1) || a.nome.localeCompare(b.nome))
                      .map((c) => (
                        <tr key={c.pessoa}>
                          <td>
                            <NomePessoa id={c.pessoa} nome={c.nome} />
                          </td>
                          <td>
                            <SiglaPartido sigla={c.partido} ano={ano} />
                          </td>
                          <td className="num">{c.numero}</td>
                          <td className="num">{numero(c.votos) || "—"}</td>
                          <td>{rotuloResultado(c)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </details>
            <p className="mt-2 text-sm text-tinta-suave">
              Fonte: Tribunal Superior Eleitoral, candidaturas
              <Cita n={nCand} /> e votação nominal nas zonas de Osasco.
              <Cita n={nRes} /> Resultado registrado pelo TSE no fim da apuração; mudanças posteriores (posse de suplentes, decisões da Justiça) não aparecem aqui.
            </p>
          </Secao>
        </>
      )}
    </Artigo>
  );
}
