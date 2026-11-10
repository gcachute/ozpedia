import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Artigo, LinkPagina, Quadro, Secao, TextoEscrito, type LinhaQuadro, imagemParaQuadro } from "@/components/artigo";
import { escrita, escritas } from "@/lib/conteudo";
import { Referencias } from "@/lib/fontes";
import { imagemPagina } from "@/lib/imagens";
import { markdown } from "@/lib/markdown";
import { dataPorExtenso } from "@/lib/texto";

type Props = { params: Promise<{ id: string }> };

export const generateStaticParams = () => escritas("fatos").map((f) => ({ id: f.id }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: escrita("fatos", (await params).id)?.cab.titulo ?? "Fato" };
}

export default async function PaginaFato({ params }: Props) {
  const { id } = await params;
  const f = escrita("fatos", id);
  if (!f) notFound();
  const refs = new Referencias();
  const imgPagina = imagemPagina(`fatos/${id}`, "fato");
  const imagemQ = imgPagina ? imagemParaQuadro(refs, imgPagina, imgPagina.legenda) : null;
  const linhas: LinhaQuadro[] = [];
  if (f.cab.quando) linhas.push({ rotulo: "Quando", valor: dataPorExtenso(f.cab.quando), cita: f.cab.fonteQuando ? refs.cita(f.cab.fonteQuando) : undefined });
  const html = markdown(f.corpo, refs);
  return (
    <Artigo tipo="Fato" titulo={f.cab.titulo ?? id} refs={refs} quadro={<Quadro titulo={f.cab.titulo ?? id} linhas={linhas} imagem={imagemQ} />}>
      <TextoEscrito html={html} />
      {!!f.cab.relacionados?.length && (
        <Secao titulo="Veja também">
          <ul className="prosa">
            {f.cab.relacionados.map((c) => (
              <li key={c}>
                <LinkPagina caminho={c} />
              </li>
            ))}
          </ul>
        </Secao>
      )}
    </Artigo>
  );
}
