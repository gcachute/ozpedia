import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Artigo, Cita, LinkPagina, NomePessoa, Quadro, Secao, SiglaPartido, TextoEscrito, imagemParaQuadro } from "@/components/artigo";
import { escrita } from "@/lib/conteudo";
import { chavePartido, eleitosCamara, eleicoes, legislaturas, pessoa, pessoaDoNome } from "@/lib/dados";
import { CAMARA } from "@/lib/camara";
import { Referencias } from "@/lib/fontes";
import { imagemPagina } from "@/lib/imagens";
import { markdown } from "@/lib/markdown";
import { dataCurta, dataPorExtenso, listaE, numero } from "@/lib/texto";

type Props = { params: Promise<{ id: string }> };

export const generateStaticParams = () => legislaturas().map((l) => ({ id: l.id }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const l = legislaturas().find((x) => x.id === id);
  return { title: l ? `${l.numero}ª Legislatura (${l.periodo})` : "Legislatura" };
}

// Nome publicado pela Câmara, com link para a página da pessoa.
function Vereador({ nome, pessoaId }: { nome: string; pessoaId: string | null }) {
  const id = pessoaDoNome(nome, pessoaId);
  return id && pessoa(id) ? <NomePessoa id={id} nome={nome} /> : <>{nome}</>;
}

export default async function PaginaLegislatura({ params }: Props) {
  const { id } = await params;
  const lista = legislaturas();
  const i = lista.findIndex((x) => x.id === id);
  if (i < 0) notFound();
  const l = lista[i];
  const leg = l.leg;
  const refs = new Referencias();
  const imgPagina = imagemPagina(`legislaturas/${id}`, "legislatura");
  const imagemQ = imgPagina ? imagemParaQuadro(refs, imgPagina, imgPagina.legenda) : null;
  const e = escrita("legislaturas", id);
  const nCamara = refs.cita("camara-legislaturas");
  const temTse = l.ano != null && l.ano >= 1996;
  const eleitos = temTse ? eleitosCamara(l.ano!) : [];
  const nCand = temTse ? refs.cita(`tse-candidatos-${l.ano}`) : 0;
  const nRes = temTse ? refs.cita(`tse-resultados-${l.ano}`) : 0;
  const html = e?.corpo ? markdown(e.corpo, refs) : null;
  const anterior = lista[i + 1];
  const seguinte = lista[i - 1];
  const titulares = leg.vereadores.filter((v) => !v.suplente);
  const suplentes = leg.vereadores.filter((v) => v.suplente);
  const presidentes = [...new Map(leg.sessoes.flatMap((s) => s.mesa.filter((m) => m.cargo === "Presidente").map((m) => [m.nome, m] as const))).values()];
  const anosPresidente = (nome: string) => leg.sessoes.filter((s) => s.mesa.some((m) => m.cargo === "Presidente" && m.nome === nome)).map((s) => s.inicio.slice(0, 4));
  const eleicaoTemPagina = l.ano != null && eleicoes().some((x) => x.ano === l.ano);
  const atual = l.numero === Math.max(...lista.map((x) => x.numero));

  // Vagas por partido, de quem o TSE registrou como eleito.
  const porPartido = [
    ...eleitos
      .reduce((m, c) => {
        const k = chavePartido(c.partido, l.ano!) ?? "";
        m.set(k, { sigla: c.partido, n: (m.get(k)?.n ?? 0) + 1 });
        return m;
      }, new Map<string, { sigla: string | null; n: number }>())
      .entries(),
  ].sort((a, b) => b[1].n - a[1].n || (a[1].sigla ?? "").localeCompare(b[1].sigla ?? ""));

  return (
    <Artigo
      tipo="Legislatura da Câmara Municipal"
      titulo={`${l.numero}ª Legislatura (${l.periodo})`}
      refs={refs}
      quadro={
        <Quadro
          titulo={`${l.numero}ª Legislatura`}
          imagem={imagemQ}
          linhas={[
            { rotulo: "Início", valor: dataPorExtenso(leg.inicio), cita: nCamara },
            { rotulo: "Fim", valor: dataPorExtenso(leg.fim), cita: nCamara },
            ...(eleicaoTemPagina ? [{ rotulo: "Eleição", valor: <LinkPagina caminho={`eleicoes/${l.ano}`}>{String(l.ano)}</LinkPagina>, cita: temTse ? nCand : undefined }] : []),
            {
              rotulo: "Vereadores",
              valor: `${leg.vereadores.length}${suplentes.length ? `, dos quais ${suplentes.length} ${suplentes.length === 1 ? "suplente" : "suplentes"}` : ""}`,
              cita: nCamara,
            },
            {
              rotulo: presidentes.length === 1 ? "Presidência" : "Presidências",
              valor: presidentes.map((m) => (
                <span key={m.nome} className="block">
                  <Vereador nome={m.nome} pessoaId={m.pessoa} /> ({listaE(anosPresidente(m.nome))})
                </span>
              )),
              cita: nCamara,
            },
            {
              rotulo: "Outras",
              valor: (
                <>
                  {anterior && (
                    <span className="block">
                      Anterior: <LinkPagina caminho={`legislaturas/${anterior.id}`}>{`${anterior.numero}ª (${anterior.periodo})`}</LinkPagina>
                    </span>
                  )}
                  {seguinte && (
                    <span className="block">
                      Seguinte: <LinkPagina caminho={`legislaturas/${seguinte.id}`}>{`${seguinte.numero}ª (${seguinte.periodo})`}</LinkPagina>
                    </span>
                  )}
                </>
              ),
            },
          ]}
        />
      }
    >
      {html && <TextoEscrito html={html} />}
      {!html && (
        <div className="prosa">
          <p>
            A <strong>{l.numero}ª Legislatura</strong> da <LinkPagina caminho="camara" /> começou em {dataPorExtenso(leg.inicio)} e {atual ? "vai até" : "terminou em"}{" "}
            {dataPorExtenso(leg.fim)}. Exerceram mandato {leg.vereadores.length} vereadores
            {suplentes.length ? `, ${suplentes.length === 1 ? "um deles suplente" : `${suplentes.length} deles suplentes`} que assumiram uma vaga` : ""}.
            <Cita n={nCamara} />{" "}
            {presidentes.length > 0 && (
              <>
                {presidentes.length === 1 ? "A presidência da Câmara ficou com " : "A presidência da Câmara passou por "}
                {presidentes.map((m, k) => (
                  <span key={m.nome}>
                    {k > 0 && (k === presidentes.length - 1 ? " e " : ", ")}
                    <Vereador nome={m.nome} pessoaId={m.pessoa} /> ({listaE(anosPresidente(m.nome))})
                  </span>
                ))}
                .
                <Cita n={nCamara} />
              </>
            )}
          </p>
          {temTse && porPartido.length > 0 && (
            <p>
              As {eleitos.length} vagas foram preenchidas na <LinkPagina caminho={`eleicoes/${l.ano}`}>eleição municipal de {l.ano}</LinkPagina>, por {porPartido.length} partidos:{" "}
              {porPartido.map(([k, x], j) => (
                <span key={k}>
                  {j > 0 && (j === porPartido.length - 1 ? " e " : ", ")}
                  <SiglaPartido sigla={x.sigla} ano={l.ano!} /> ({x.n})
                </span>
              ))}
              .
              <Cita n={nCand} />
            </p>
          )}
          {atual && (
            <p>
              Nas sessões realizadas entre {dataPorExtenso(CAMARA.periodo.inicio)} e {dataPorExtenso(CAMARA.periodo.fim)}, foram lidas {numero(CAMARA.projetos.length)}{" "}
              <LinkPagina caminho="projetos">proposições</LinkPagina>, foi comunicada a sanção de {CAMARA.leis.length} <LinkPagina caminho="leis">leis</LinkPagina> de autoria de
              vereadores e {CAMARA.vetos.length} vetos.
              <Cita n={refs.cita("camara-sessoes")} />
            </p>
          )}
        </div>
      )}

      <Secao titulo="Vereadores">
        <p className="mb-3 text-sm text-tinta-suave">
          Nomes como publicados pela Câmara, na ordem da página oficial.
          {leg.vereadores.some((v) => v.votos) && " Votos informados pela Câmara."}
          <Cita n={nCamara} />
        </p>
        <ul className="prosa columns-1 sm:columns-2">
          {titulares.map((v) => (
            <li key={v.nome} className="break-inside-avoid">
              <Vereador nome={v.nome} pessoaId={v.pessoa} />
              {v.votos ? ` (${numero(v.votos)} votos)` : ""}
            </li>
          ))}
        </ul>
        {suplentes.length > 0 && (
          <>
            <h3 className="mt-4 mb-2 font-bold">Suplentes que assumiram</h3>
            <ul className="prosa columns-1 sm:columns-2">
              {suplentes.map((v) => (
                <li key={v.nome} className="break-inside-avoid">
                  <Vereador nome={v.nome} pessoaId={v.pessoa} />
                  {v.votos ? ` (${numero(v.votos)} votos)` : ""}
                </li>
              ))}
            </ul>
          </>
        )}
      </Secao>

      <Secao titulo="Mesa Diretora">
        <div className="overflow-x-auto">
          <table className="tabela">
            <thead>
              <tr>
                <th>Sessão legislativa</th>
                <th>Composição</th>
              </tr>
            </thead>
            <tbody>
              {leg.sessoes.map((s) => (
                <tr key={s.numero}>
                  <td className="whitespace-nowrap">
                    {s.numero}ª<span className="block text-sm text-tinta-suave">{`${dataCurta(s.inicio)} a ${dataCurta(s.fim)}`}</span>
                  </td>
                  <td>
                    {s.mesa.map((m) => (
                      <span key={m.cargo + m.nome} className="block">
                        {m.cargo}: <Vereador nome={m.nome} pessoaId={m.pessoa} />
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-tinta-suave">
          Fonte: Câmara Municipal de Osasco.
          <Cita n={nCamara} />
        </p>
      </Secao>

      {temTse && (
        <Secao titulo="Quem o TSE registrou como eleito">
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Nome de urna</th>
                  <th>Partido na eleição</th>
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
                      <SiglaPartido sigla={c.partido} ano={l.ano!} />
                    </td>
                    <td className="num">{numero(c.votos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-sm text-tinta-suave">
            Fonte: Tribunal Superior Eleitoral.
            <Cita n={[nCand, nRes]} /> Resultado no fim da apuração.
          </p>
        </Secao>
      )}
    </Artigo>
  );
}
