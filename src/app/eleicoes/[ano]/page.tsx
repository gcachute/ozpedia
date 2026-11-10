import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Artigo, Cita, LinkPagina, NomePessoa, Quadro, Secao, SiglaPartido, TextoEscrito, type LinhaQuadro, imagemParaQuadro } from "@/components/artigo";
import { escrita } from "@/lib/conteudo";
import { ANOS_MUNICIPAIS, candidaturasDe, chapas, chavePartido, eleicoes, eleitosCamara, periodo, periodoTexto, pessoa, rotuloResultado } from "@/lib/dados";
import { Referencias } from "@/lib/fontes";
import { imagemPagina } from "@/lib/imagens";
import { markdown } from "@/lib/markdown";
import { dataPorExtenso, numero } from "@/lib/texto";
import { anoTse, detalhe, mesmaSigla, pct, semPrefixo, siglasDaComposicao, type AnoTse } from "@/lib/detalhes";

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
  const imgPagina = imagemPagina(`eleicoes/${ano}`, "eleicao");
  const imagemQ = imgPagina ? imagemParaQuadro(refs, imgPagina, imgPagina.legenda) : null;
  const linhas: LinhaQuadro[] = [];
  const anterior = eleicoes().find((x) => x.ano < ano);
  const seguinte = [...eleicoes()].reverse().find((x) => x.ano > ano);

  if (e?.cab.data) linhas.push({ rotulo: "Data", valor: dataPorExtenso(e.cab.data), cita: e.cab.fonteData ? refs.cita(e.cab.fonteData) : undefined });

  let nCand = 0;
  let nRes = 0;
  const tse = ANOS_MUNICIPAIS.includes(ano);
  const ch = tse ? chapas(ano) : [];
  const det = tse ? anoTse(ano) : null;
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
    if (det) {
      const nVagas = refs.cita(`tse-vagas-${ano}`);
      const nComp = refs.cita(`tse-comparecimento-${ano}`);
      const datas = Object.entries(det.datas).sort();
      linhas.splice(0, 0, {
        rotulo: datas.length > 1 ? "Datas" : "Data",
        valor: datas.map(([t, d]) => (
          <span key={t} className="block">
            {dataPorExtenso(d)}
            {datas.length > 1 ? ` (${t}º turno)` : ""}
          </span>
        )),
        cita: nVagas,
      });
      if (det.posse) linhas.splice(1, 0, { rotulo: "Posse", valor: dataPorExtenso(det.posse), cita: nVagas });
      const t1 = det.turnos["Prefeito|1"] ?? det.turnos["Vereador|1"];
      if (t1) {
        linhas.push({ rotulo: "Eleitorado apto", valor: numero(t1.aptos), cita: nComp });
        linhas.push({ rotulo: "Comparecimento", valor: `${numero(t1.comparecimento)} (${pct(t1.comparecimento, t1.aptos)})`, cita: nComp });
        linhas.push({ rotulo: "Abstenção", valor: `${numero(t1.abstencoes)} (${pct(t1.abstencoes, t1.aptos)})`, cita: nComp });
        linhas.push({ rotulo: "Zonas eleitorais", valor: String(det.zonas), cita: nComp });
      }
    }
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
    <Artigo tipo="Eleição" titulo={`Eleição municipal de ${ano} em Osasco`} refs={refs} quadro={<Quadro titulo={`Eleição de ${ano}`} linhas={linhas} imagem={imagemQ} />}>
      {tse && <Resumo ano={ano} ch={ch} eleitos={eleitos} vereadores={vereadores.length} partidos={porPartido.size} nCf={refs.cita("cf-1988-art-29")} nCand={nCand} nRes={nRes} det={det} nVagas={det ? refs.cita(`tse-vagas-${ano}`) : 0} nComp={det ? refs.cita(`tse-comparecimento-${ano}`) : 0} />}
      {html && <TextoEscrito html={html} />}

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
                    <th>Coligação ou federação</th>
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
                      <td className="text-sm">
                        <Coligacao d={detalhe(ano, "Prefeito", t.numero)} />
                      </td>
                      <td className="num">{t.numero}</td>
                      <td className="num">
                        {numero(t.votos) || "—"}
                        {t.votos != null && det?.turnos["Prefeito|1"] && <span className="block text-sm text-tinta-suave">{pct(t.votos, det.turnos["Prefeito|1"].validos)}</span>}
                      </td>
                      {doisTurnos && (
                        <td className="num">
                          {t.votos2turno != null ? numero(t.votos2turno) : ""}
                          {t.votos2turno != null && det?.turnos["Prefeito|2"] && <span className="block text-sm text-tinta-suave">{pct(t.votos2turno, det.turnos["Prefeito|2"].validos)}</span>}
                        </td>
                      )}
                      <td>{rotuloResultado(t)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-sm text-tinta-suave">
              Fonte: Tribunal Superior Eleitoral, candidaturas
              <Cita n={nCand} /> e votação nominal nas zonas de Osasco.
              <Cita n={nRes} /> Percentual sobre os votos válidos.
            </p>
          </Secao>

          {det && <Participacao det={det} n={refs.cita(`tse-comparecimento-${ano}`)} />}

          <Secao titulo="Câmara Municipal">
            <p className="mb-3">
              Composição eleita para a <LinkPagina caminho={`legislaturas/${periodo(ano)}`}>legislatura {periodoTexto(ano)}</LinkPagina>.
            </p>
            {det && det.partidosCamara.length > 0 ? (
              <VotosPorPartido det={det} ano={ano} vagas={porPartido} n={refs.cita(`tse-votos-partido-${ano}`)} />
            ) : (
              <>
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
              </>
            )}
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

// Texto de abertura montado com os números da própria eleição.
function Resumo({
  ano,
  ch,
  eleitos,
  vereadores,
  partidos,
  nCf,
  nCand,
  nRes,
  det,
  nVagas,
  nComp,
}: {
  ano: number;
  ch: ReturnType<typeof chapas>;
  eleitos: ReturnType<typeof eleitosCamara>;
  vereadores: number;
  partidos: number;
  nCf: number;
  nCand: number;
  nRes: number;
  det: AnoTse | null;
  nVagas: number;
  nComp: number;
}) {
  const t1 = det?.turnos["Prefeito|1"] ?? det?.turnos["Vereador|1"] ?? null;
  const vencedora = ch.find((c) => c.titular.resultado === "Eleito");
  const segundo = ch.filter((c) => c.titular.votos2turno != null);
  const maisVotado = eleitos[0];
  const chapa = (c: (typeof ch)[number]) => (
    <>
      <NomePessoa id={c.titular.pessoa} nome={c.titular.nome} /> (<SiglaPartido sigla={c.titular.partido} ano={ano} />)
    </>
  );
  return (
    <div className="prosa">
      <p>
        Na <strong>eleição municipal de {ano}</strong>, Osasco escolheu prefeito, vice-prefeito e vereadores para o mandato de {periodoTexto(ano)}.
        <Cita n={nCf} />
        {det?.datas["1"] && (
          <>
            {" "}
            A votação foi em {dataPorExtenso(det.datas["1"])}
            {det.datas["2"] ? `, com segundo turno em ${dataPorExtenso(det.datas["2"])}` : ""}
            {det.posse ? `, e a posse, em ${dataPorExtenso(det.posse)}` : ""}.
            <Cita n={nVagas} />
          </>
        )}
        {t1 && (
          <>
            {" "}
            Dos {numero(t1.aptos)} eleitores aptos, {numero(t1.comparecimento)} ({pct(t1.comparecimento, t1.aptos)}) compareceram ao primeiro turno, em {det!.zonas}{" "}
            zonas eleitorais.
            <Cita n={nComp} />
          </>
        )}
      </p>
      <p>
        {ch.length === 1 ? "Uma chapa disputou" : `${ch.length} chapas disputaram`} a <LinkPagina caminho="prefeitura" />.
        <Cita n={nCand} />{" "}
        {vencedora && segundo.length === 2 ? (
          <>
            Houve segundo turno entre {chapa(segundo[0])} e {chapa(segundo[1])}; <NomePessoa id={vencedora.titular.pessoa} nome={vencedora.titular.nome} /> venceu, com {numero(vencedora.titular.votos2turno)} votos no
            segundo turno.
          </>
        ) : vencedora ? (
          <>
            {chapa(vencedora)} venceu no primeiro turno, com {numero(vencedora.titular.votos)} votos.
          </>
        ) : null}
        <Cita n={nRes} />
      </p>
      <p>
        Para a <LinkPagina caminho="camara" />, {numero(vereadores)} candidaturas disputaram as vagas; {eleitos.length} venceram, de {partidos} partidos.
        <Cita n={nCand} />
        {maisVotado && (
          <>
            {" "}
            A candidatura com mais votos foi a de <NomePessoa id={maisVotado.pessoa} nome={maisVotado.nome} /> (<SiglaPartido sigla={maisVotado.partido} ano={ano} />),
            com {numero(maisVotado.votos)}.
            <Cita n={nRes} />
          </>
        )}
      </p>
    </div>
  );
}

function Coligacao({ d }: { d: ReturnType<typeof detalhe> }) {
  if (!d) return <>—</>;
  const nome = (d.coligacao && !/^PARTIDO ISOLADO$/i.test(d.coligacao) ? d.coligacao : null) ?? d.federacao;
  const comp = d.composicao ?? d.composicaoFederacao;
  if (!nome || /^PARTIDO ISOLADO$/i.test(nome)) return <>sem coligação</>;
  const siglas = siglasDaComposicao(comp);
  return (
    <>
      <span className="block">{semPrefixo(nome)}</span>
      {siglas.length > 1 && <span className="block text-tinta-suave">{siglas.join(", ")}</span>}
    </>
  );
}

function Participacao({ det, n }: { det: AnoTse; n: number }) {
  const linhas = (
    [
      ["Prefeito|1", "Prefeitura, 1º turno"],
      ["Prefeito|2", "Prefeitura, 2º turno"],
      ["Vereador|1", "Câmara"],
    ] as const
  ).filter(([k]) => det.turnos[k]);
  return (
    <Secao titulo="Comparecimento e votos">
      <div className="overflow-x-auto">
        <table className="tabela">
          <thead>
            <tr>
              <th>Votação</th>
              <th className="num">Eleitorado apto</th>
              <th className="num">Comparecimento</th>
              <th className="num">Abstenção</th>
              <th className="num">Válidos</th>
              <th className="num">Brancos</th>
              <th className="num">Nulos</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(([k, rotulo]) => {
              const t = det.turnos[k];
              return (
                <tr key={k}>
                  <td>{rotulo}</td>
                  <td className="num">{numero(t.aptos)}</td>
                  <td className="num">
                    {numero(t.comparecimento)}
                    <span className="block text-sm text-tinta-suave">{pct(t.comparecimento, t.aptos)}</span>
                  </td>
                  <td className="num">
                    {numero(t.abstencoes)}
                    <span className="block text-sm text-tinta-suave">{pct(t.abstencoes, t.aptos)}</span>
                  </td>
                  <td className="num">
                    {numero(t.validos)}
                    <span className="block text-sm text-tinta-suave">{pct(t.validos, t.comparecimento)}</span>
                  </td>
                  <td className="num">
                    {numero(t.brancos)}
                    <span className="block text-sm text-tinta-suave">{pct(t.brancos, t.comparecimento)}</span>
                  </td>
                  <td className="num">
                    {t.nulos == null ? "não informado" : numero(t.nulos)}
                    {t.nulos != null && <span className="block text-sm text-tinta-suave">{pct(t.nulos, t.comparecimento)}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-sm text-tinta-suave">
        Fonte: Tribunal Superior Eleitoral, detalhe da votação nas zonas de Osasco.
        <Cita n={n} /> Comparecimento e abstenção sobre o eleitorado apto; válidos, brancos e nulos sobre o comparecimento. Na Câmara, válidos somam os votos
        nominais e os de legenda.
      </p>
    </Secao>
  );
}

function VotosPorPartido({ det, ano, vagas, n }: { det: AnoTse; ano: number; vagas: Map<string, { sigla: string | null; n: number }>; n: number }) {
  const validos = det.turnos["Vereador|1"]?.validos ?? 0;
  const somaPartidos = det.partidosCamara.reduce((t, p) => t + p.nominais + p.legenda, 0);
  const vagasDe = (sigla: string) => vagas.get(chavePartido(sigla, ano) ?? "")?.n ?? 0;
  const isolado = (c: string | null) => !c || /^PARTIDO ISOLADO$/i.test(c);
  const temGrupo = det.partidosCamara.some((p) => p.federacao || !isolado(p.coligacao));
  return (
    <>
      <h3 className="mb-2 font-bold">Votos e vagas por partido</h3>
      <div className="mb-2 overflow-x-auto">
        <table className="tabela">
          <thead>
            <tr>
              <th>Partido</th>
              {temGrupo && <th>Coligação ou federação</th>}
              <th className="num">Votos nominais</th>
              <th className="num">Votos de legenda</th>
              <th className="num">Total</th>
              <th className="num">Vagas</th>
            </tr>
          </thead>
          <tbody>
            {det.partidosCamara.map((p) => (
              <tr key={p.sigla}>
                <td>
                  <SiglaPartido sigla={p.sigla} ano={ano} />
                </td>
                {temGrupo && (
                  <td className="text-sm">
                    {p.federacao ?? (isolado(p.coligacao) ? "—" : p.coligacao)}
                    {p.composicao && siglasDaComposicao(p.composicao).length > 1 && (
                      <span className="block text-tinta-suave">{siglasDaComposicao(p.composicao).join(", ")}</span>
                    )}
                  </td>
                )}
                <td className="num">{numero(p.nominais)}</td>
                <td className="num">{numero(p.legenda)}</td>
                <td className="num">
                  {numero(p.nominais + p.legenda)}
                  <span className="block text-sm text-tinta-suave">{pct(p.nominais + p.legenda, validos)}</span>
                </td>
                <td className="num">{vagasDe(p.sigla) || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mb-6 text-sm text-tinta-suave">
        Fonte: Tribunal Superior Eleitoral, votação por partido nas zonas de Osasco.
        <Cita n={n} /> Percentual sobre os votos válidos para a Câmara.
        {Math.abs(somaPartidos - validos) > validos * 0.01 &&
          ` Neste ano, o arquivo do TSE com os votos por partido soma ${numero(somaPartidos)} votos, menos que os ${numero(validos)} votos válidos do detalhe da votação; os números estão como no arquivo.`}
      </p>
    </>
  );
}
