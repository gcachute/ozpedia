import type { Metadata } from "next";
import { Artigo, Cita, LinkPagina, Secao, imagemParaQuadro, Quadro } from "@/components/artigo";
import { TabelaLeis, TabelaVetos } from "@/components/camara";
import { CAMARA, idLei, leisOrdenadas } from "@/lib/camara";
import { escritas } from "@/lib/conteudo";
import { Referencias } from "@/lib/fontes";
import { imagemPagina } from "@/lib/imagens";
import { dataPorExtenso, numero } from "@/lib/texto";

export const metadata: Metadata = { title: "Leis e projetos" };

export default function Leis() {
  const refs = new Referencias();
  const imgPagina = imagemPagina("leis", undefined);
  const imagemQ = imgPagina ? imagemParaQuadro(refs, imgPagina, imgPagina.legenda) : null;
  const n = refs.cita("camara-sessoes");
  const periodo = `${dataPorExtenso(CAMARA.periodo.inicio)} e ${dataPorExtenso(CAMARA.periodo.fim)}`;
  const daCamara = new Set(leisOrdenadas().map(idLei));
  const escritasSo = escritas("leis").filter((e) => !daCamara.has(e.id));
  return (
    <Artigo tipo="Lista" titulo="Leis e projetos" refs={refs} quadro={<Quadro titulo="Leis e projetos" linhas={[]} imagem={imagemQ} />}>
      <p className="prosa">
        Leis municipais e projetos que passaram pela <LinkPagina caminho="camara" />. Nesta versão, a lista vem das sessões realizadas entre {periodo}: leis cuja
        sanção pela Prefeitura foi comunicada em sessão, projetos de vereadores vetados e as {numero(CAMARA.projetos.length)}{" "}
        <LinkPagina caminho="projetos">proposições lidas</LinkPagina>.
        <Cita n={n} /> Leis de outros anos entram conforme forem lidas no Diário Oficial do município.
      </p>
      <Secao titulo={`Leis de autoria de vereadores (${CAMARA.leis.length})`}>
        <TabelaLeis leis={leisOrdenadas()} />
      </Secao>
      <Secao titulo={`Vetos (${CAMARA.vetos.length})`}>
        <TabelaVetos vetos={CAMARA.vetos} />
      </Secao>
      {escritasSo.length > 0 && (
        <Secao titulo="Outras leis">
          <ul className="prosa">
            {escritasSo.map((e) => (
              <li key={e.id}>
                <LinkPagina caminho={`leis/${e.id}`} />
              </li>
            ))}
          </ul>
        </Secao>
      )}
    </Artigo>
  );
}
