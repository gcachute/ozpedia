import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Artigo, Cita, LinkPagina, Quadro, TextoEscrito, type LinhaQuadro, imagemParaQuadro } from "@/components/artigo";
import { Autoria, LinkSessao } from "@/components/camara";
import { CAMARA, idLei, leiPorId, resumoSemAutoria, tituloLei } from "@/lib/camara";
import { escrita, escritas } from "@/lib/conteudo";
import { Referencias } from "@/lib/fontes";
import { imagemPagina } from "@/lib/imagens";
import { markdown } from "@/lib/markdown";
import { dataPorExtenso } from "@/lib/texto";

type Props = { params: Promise<{ id: string }> };

// Página de lei: as leis cuja sanção foi comunicada nas sessões da Câmara e as leis com página escrita à mão.
export const generateStaticParams = () => [...new Set([...CAMARA.leis.map(idLei), ...escritas("leis").map((e) => e.id)])].map((id) => ({ id }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = (await params).id;
  return { title: tituloLei(id) ?? escrita("leis", id)?.cab.titulo ?? "Lei" };
}

export default async function PaginaLei({ params }: Props) {
  const { id } = await params;
  const l = leiPorId(id);
  const e = escrita("leis", id);
  if (!l && !e) notFound();
  const refs = new Referencias();
  const imgPagina = imagemPagina(`leis/${id}`, "lei");
  const imagemQ = imgPagina ? imagemParaQuadro(refs, imgPagina, imgPagina.legenda) : null;
  const titulo = tituloLei(id) ?? e?.cab.titulo ?? id;
  const linhas: LinhaQuadro[] = [];
  let nSessao = 0;
  if (l) {
    nSessao = refs.cita(`camara-sessao-${l.sessao}`);
    linhas.push({ rotulo: "Número", valor: l.lei.replace("Lei ", ""), cita: nSessao });
    linhas.push({ rotulo: "Data", valor: l.data, cita: nSessao });
    linhas.push({ rotulo: "Autoria", valor: <Autoria autores={l.autores} />, cita: nSessao });
    linhas.push({ rotulo: "Sanção comunicada na", valor: <LinkSessao id={l.sessao} />, cita: nSessao });
  }
  if (e?.cab.quando) linhas.push({ rotulo: "Data", valor: dataPorExtenso(e.cab.quando), cita: e.cab.fonteQuando ? refs.cita(e.cab.fonteQuando) : undefined });
  const html = e?.corpo ? markdown(e.corpo, refs) : null;

  return (
    <Artigo tipo="Lei municipal" titulo={titulo} refs={refs} quadro={<Quadro titulo={l?.lei ?? titulo} linhas={linhas} imagem={imagemQ} />}>
      {l && (
        <div className="prosa">
          <p>
            A <strong>{l.lei}</strong>, de {l.data}, {resumoSemAutoria(l.resumo)}, segundo o texto lido na <LinkSessao id={l.sessao} /> da{" "}
            <LinkPagina caminho="camara" />, que comunicou a sanção.
            <Cita n={nSessao} />
          </p>
          <p>
            Autoria: <Autoria autores={l.autores} />.
            <Cita n={nSessao} />
          </p>
        </div>
      )}
      {html && <TextoEscrito html={html} />}
      <p className="mt-6 text-sm text-tinta-suave">
        Outras leis em <LinkPagina caminho="leis">Leis e projetos</LinkPagina>.
      </p>
    </Artigo>
  );
}
