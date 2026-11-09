import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Artigo, Cita, LinkPagina, NomePessoa, Quadro, Secao, SiglaPartido, TextoEscrito } from "@/components/artigo";
import { escrita } from "@/lib/conteudo";
import { eleitosCamara, legislaturas, periodoTexto } from "@/lib/dados";
import { Referencias } from "@/lib/fontes";
import { markdown } from "@/lib/markdown";
import { numero } from "@/lib/texto";

type Props = { params: Promise<{ id: string }> };

export const generateStaticParams = () => legislaturas().map((l) => ({ id: l.id }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Legislatura ${id.replace("-", "–")}` };
}

export default async function PaginaLegislatura({ params }: Props) {
  const { id } = await params;
  const lista = legislaturas();
  const i = lista.findIndex((x) => x.id === id);
  if (i < 0) notFound();
  const { ano } = lista[i];
  const refs = new Referencias();
  const e = escrita("legislaturas", id);
  const eleitos = eleitosCamara(ano);
  const nCand = refs.cita(`tse-candidatos-${ano}`);
  const nRes = refs.cita(`tse-resultados-${ano}`);
  const nCf = refs.cita("cf-1988-art-29");
  const html = e?.corpo ? markdown(e.corpo, refs) : null;
  const anterior = lista[i + 1];
  const seguinte = lista[i - 1];

  return (
    <Artigo
      tipo="Legislatura da Câmara Municipal"
      titulo={`Legislatura ${periodoTexto(ano)}`}
      refs={refs}
      quadro={
        <Quadro
          titulo={`Câmara Municipal, ${periodoTexto(ano)}`}
          linhas={[
            { rotulo: "Eleição", valor: <LinkPagina caminho={`eleicoes/${ano}`}>{ano}</LinkPagina>, cita: nCand },
            { rotulo: "Período", valor: periodoTexto(ano), cita: nCf },
            { rotulo: "Vagas preenchidas na eleição", valor: String(eleitos.length), cita: nCand },
            {
              rotulo: "Outras",
              valor: (
                <>
                  {anterior && (
                    <span className="block">
                      Anterior: <LinkPagina caminho={`legislaturas/${anterior.id}`} />
                    </span>
                  )}
                  {seguinte && (
                    <span className="block">
                      Seguinte: <LinkPagina caminho={`legislaturas/${seguinte.id}`} />
                    </span>
                  )}
                </>
              ),
            },
          ]}
        />
      }
    >
      {html ? (
        <TextoEscrito html={html} />
      ) : (
        <p className="prosa">
          A legislatura {periodoTexto(ano)} da <LinkPagina caminho="camara" /> começou com as vagas preenchidas na{" "}
          <LinkPagina caminho={`eleicoes/${ano}`}>eleição municipal de {ano}</LinkPagina>.
          <Cita n={[nCand, nCf]} />
        </p>
      )}
      <Secao titulo="Composição eleita">
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
                    <SiglaPartido sigla={c.partido} ano={ano} />
                  </td>
                  <td className="num">{numero(c.votos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-tinta-suave">
          Fonte: Tribunal Superior Eleitoral.
          <Cita n={[nCand, nRes]} /> É a lista de quem o TSE registrou como eleito; suplentes que assumiram uma vaga durante a legislatura ainda não
          estão nesta página.
        </p>
      </Secao>
    </Artigo>
  );
}
