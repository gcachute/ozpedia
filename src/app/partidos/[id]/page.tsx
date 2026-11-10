import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Artigo, Cita, LinkPagina, NomePessoa, Quadro, Secao, SiglaPartido, TextoEscrito, type LinhaQuadro, imagemParaQuadro } from "@/components/artigo";
import { escrita } from "@/lib/conteudo";
import { candidaturasDe, chapas, chavePartido, partidoPorId, partidos, siglaExibida, temPaginaPartido, venceu, type Mudanca, type Partido } from "@/lib/dados";
import { Referencias } from "@/lib/fontes";
import { imagemPagina } from "@/lib/imagens";
import { markdown } from "@/lib/markdown";
import { anoTse, detalhe, pct, siglasDaComposicao } from "@/lib/detalhes";
import { dataCurta, dataPorExtenso, listaE, numero } from "@/lib/texto";

type Props = { params: Promise<{ id: string }> };

export const generateStaticParams = () =>
  [...partidos().values()].filter(temPaginaPartido).map((p) => ({ id: p.id }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = partidoPorId((await params).id);
  return { title: p ? siglaExibida(p) : "Partido" };
}

// Nome de outro partido citado nas mudanças: com link quando tem página; senão, a sigla.
function OutroPartido({ chave }: { chave: string }) {
  const p = partidos().get(chave);
  if (!p) return <>{chave}</>;
  return temPaginaPartido(p) ? <LinkPagina caminho={`partidos/${p.id}`}>{siglaExibida(p)}</LinkPagina> : <>{siglaExibida(p)}</>;
}

function FraseMudanca({ m, p, cita }: { m: Mudanca; p: Partido; cita: number }) {
  const data = dataPorExtenso(m.data);
  const outros = m.de.filter((d) => d !== p.chave);
  const juntos = (lista: string[]) =>
    lista.map((c, i) => (
      <span key={c}>
        {i > 0 && (i === lista.length - 1 ? " e " : ", ")}
        <OutroPartido chave={c} />
      </span>
    ));
  if (m.de.includes(p.chave)) {
    if (m.tipo === "nome")
      return (
        <li>
          Em {data}, o TSE aceitou a mudança de nome ou sigla para <OutroPartido chave={m.para} />, no processo {m.processo}.
          <Cita n={cita} />
        </li>
      );
    if (m.tipo === "fusao")
      return (
        <li>
          Em {data}, o TSE aceitou a fusão com {juntos(outros)}, que formou o <OutroPartido chave={m.para} />, no processo {m.processo}.
          <Cita n={cita} />
        </li>
      );
    return (
      <li>
        Em {data}, o TSE aceitou a incorporação ao <OutroPartido chave={m.para} />, no processo {m.processo}.
        <Cita n={cita} />
      </li>
    );
  }
  if (m.tipo === "nome")
    return (
      <li>
        Em {data}, o TSE aceitou a mudança de nome ou sigla de {juntos(m.de)} para {siglaExibida(p)}, no processo {m.processo}.
        <Cita n={cita} />
      </li>
    );
  if (m.tipo === "fusao")
    return (
      <li>
        Formado em {data} pela fusão de {juntos(m.de)}, no processo {m.processo}.
        <Cita n={cita} />
      </li>
    );
  return (
    <li>
      Em {data}, o TSE aceitou a incorporação de {juntos(m.de)}, no processo {m.processo}.
      <Cita n={cita} />
    </li>
  );
}

export default async function PaginaPartido({ params }: Props) {
  const { id } = await params;
  const p = partidoPorId(id);
  if (!p || !temPaginaPartido(p)) notFound();
  const e = escrita("partidos", id);
  const refs = new Referencias();
  const imgPagina = imagemPagina(`partidos/${id}`, "partido");
  const imagemQ = imgPagina ? imagemParaQuadro(refs, imgPagina, imgPagina.legenda) : null;
  const sigla = siglaExibida(p);

  const linhas: LinhaQuadro[] = [];
  if (p.nome) linhas.push({ rotulo: "Nome", valor: p.nome, cita: refs.cita(p.fonteNome!) });
  if (p.registro) {
    const n = refs.cita("tse-partidos");
    linhas.push({ rotulo: "Número", valor: String(p.registro.numero), cita: n });
    linhas.push({ rotulo: "Registro no TSE", valor: dataCurta(p.registro.deferimento), cita: n });
  }
  const nTse = p.anos.length ? refs.cita("tse-trajetorias") : 0;
  if (p.anos.length) linhas.push({ rotulo: "Eleições em Osasco", valor: listaE(p.anos.map(String)), cita: nTse });

  const nMud = p.antes.length || p.depois.length ? refs.cita("tse-partidos") : 0;
  const html = e?.corpo ? markdown(e.corpo, refs) : null;

  // Em Osasco, eleição a eleição: candidaturas e quem venceu.
  const porAno = p.anos
    .slice()
    .reverse()
    .map((ano) => {
      const cs = candidaturasDe(ano).filter((c) => chavePartido(c.partido, c.ano) === p.chave);
      return {
        ano,
        prefeitura: cs.filter((c) => c.cargo === "Prefeito" || c.cargo === "Vice-prefeito"),
        vereadores: cs.filter((c) => c.cargo === "Vereador"),
        eleitos: cs.filter((c) => c.cargo === "Vereador" && venceu(c)).sort((a, b) => (b.votos ?? 0) - (a.votos ?? 0)),
        // Chapa à Prefeitura de que o partido fez parte (coligação ou federação), quando não teve candidatura própria.
        apoio: chapas(ano).find((c) => {
          const d = detalhe(ano, "Prefeito", c.titular.numero);
          return !!d && chavePartido(c.titular.partido, ano) !== p.chave && siglasDaComposicao(d.composicao ?? d.composicaoFederacao).some((x) => chavePartido(x, ano) === p.chave);
        }),
        votosCamara: anoTse(ano)?.partidosCamara.find((x) => chavePartido(x.sigla, ano) === p.chave) ?? null,
        validosCamara: anoTse(ano)?.turnos["Vereador|1"]?.validos ?? 0,
      };
    });

  const totalVereadores = porAno.reduce((t, a) => t + a.vereadores.length, 0);
  const totalEleitos = porAno.reduce((t, a) => t + a.eleitos.length, 0);
  const anosPrefeitura = porAno.filter((a) => a.prefeitura.some((c) => c.cargo === "Prefeito")).map((a) => a.ano).sort();
  const anosVitoriaPrefeitura = porAno.filter((a) => a.prefeitura.some((c) => c.cargo === "Prefeito" && c.resultado === "Eleito")).map((a) => a.ano).sort();

  return (
    <Artigo tipo="Partido" titulo={sigla} subtitulo={p.nome && p.nome.toUpperCase() !== sigla.toUpperCase() ? p.nome : undefined} refs={refs} quadro={<Quadro titulo={sigla} linhas={linhas} imagem={imagemQ} />}>
      {(
        <div className="prosa">
          <p>
            <strong>{sigla}</strong>
            {p.nome && p.nome.toUpperCase() !== sigla.toUpperCase() ? ` (${p.nome})` : ""}
            {p.registro ? (
              <>
                {" "}
                é um partido registrado no Tribunal Superior Eleitoral desde {dataPorExtenso(p.registro.deferimento)}, com o número {p.registro.numero}.
                <Cita n={refs.cita("tse-partidos")} />
              </>
            ) : (
              <> é um partido que não está entre os registrados hoje no Tribunal Superior Eleitoral{p.depois.length ? "; o que aconteceu com ele está abaixo" : ""}.<Cita n={refs.cita("tse-partidos")} /></>
            )}
          </p>
          {p.anos.length > 0 && (
            <p>
              Em Osasco, teve candidaturas em {p.anos.length === 1 ? `uma eleição municipal, a de ${p.anos[0]}` : `${p.anos.length} eleições municipais, de ${p.anos[0]} a ${p.anos.at(-1)}`}:{" "}
              {numero(totalVereadores)} à Câmara, das quais {totalEleitos === 0 ? "nenhuma venceu" : totalEleitos === 1 ? "uma venceu" : `${totalEleitos} venceram`}
              {anosPrefeitura.length > 0 ? `, e ${anosPrefeitura.length === 1 ? "uma chapa" : `${anosPrefeitura.length} chapas`} à Prefeitura` : ""}
              {anosVitoriaPrefeitura.length > 0 ? `, com vitória em ${listaE(anosVitoriaPrefeitura.map(String))}` : ""}.
              <Cita n={nTse} />
            </p>
          )}
        </div>
      )}
      {html && <TextoEscrito html={html} />}

      {(p.antes.length > 0 || p.depois.length > 0) && (
        <Secao titulo="Nome, fusões e incorporações">
          <ul className="prosa list-disc pl-5">
            {[...p.antes, ...p.depois]
              .sort((a, b) => a.data.localeCompare(b.data))
              .map((m, i) => (
                <FraseMudanca key={i} m={m} p={p} cita={nMud} />
              ))}
          </ul>
        </Secao>
      )}

      {porAno.length > 0 && (
        <Secao titulo="Em Osasco, eleição a eleição">
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Eleição</th>
                  <th>Prefeitura</th>
                  <th className="num">Candidaturas à Câmara</th>
                  <th className="num">Votos para a Câmara</th>
                  <th>Venceram para a Câmara</th>
                </tr>
              </thead>
              <tbody>
                {porAno.map((a) => (
                  <tr key={a.ano}>
                    <td>
                      <LinkPagina caminho={`eleicoes/${a.ano}`}>{a.ano}</LinkPagina>
                    </td>
                    <td>
                      {a.prefeitura.length
                        ? a.prefeitura.map((c) => (
                            <span key={c.pessoa + c.cargo} className="block">
                              <NomePessoa id={c.pessoa} nome={c.nome} /> ({c.cargo === "Prefeito" ? "titular" : "vice"}
                              {c.resultado === "Eleito" ? ", venceu" : ""})
                            </span>
                          ))
                        : a.apoio
                          ? (
                              <>
                                Na chapa de <NomePessoa id={a.apoio.titular.pessoa} nome={a.apoio.titular.nome} /> (<SiglaPartido sigla={a.apoio.titular.partido} ano={a.ano} />
                                {a.apoio.titular.resultado === "Eleito" ? ", venceu" : ""})
                              </>
                            )
                          : "—"}
                    </td>
                    <td className="num">{numero(a.vereadores.length)}</td>
                    <td className="num">
                      {a.votosCamara ? numero(a.votosCamara.nominais + a.votosCamara.legenda) : "—"}
                      {a.votosCamara && a.validosCamara > 0 && <span className="block text-sm text-tinta-suave">{pct(a.votosCamara.nominais + a.votosCamara.legenda, a.validosCamara)}</span>}
                    </td>
                    <td>
                      {a.eleitos.length
                        ? a.eleitos.map((c, i) => (
                            <span key={c.pessoa}>
                              {i > 0 && ", "}
                              <NomePessoa id={c.pessoa} nome={c.nome} />
                            </span>
                          ))
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-sm text-tinta-suave">
            Fonte: Tribunal Superior Eleitoral.
            <Cita n={nTse} /> Votos nominais e de legenda somados, com o percentual sobre os votos válidos para a Câmara.
            <Cita n={porAno.filter((a) => a.votosCamara).map((a) => refs.cita(`tse-votos-partido-${a.ano}`))} /> Candidaturas registradas com a sigla {p.sigla} nas eleições municipais de Osasco.
          </p>
        </Secao>
      )}
    </Artigo>
  );
}
