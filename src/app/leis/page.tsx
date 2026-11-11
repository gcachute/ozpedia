import type { Metadata } from "next";
import { Artigo, Cita, LinkPagina, Secao, imagemParaQuadro, Quadro } from "@/components/artigo";
import { TabelaLeis, TabelaVetos } from "@/components/camara";
import { CAMARA, idLei, leisOrdenadas } from "@/lib/camara";
import { escritas } from "@/lib/conteudo";
import { Referencias } from "@/lib/fontes";
import { imagemPagina } from "@/lib/imagens";
import { leisDoAno, leisIomo } from "@/lib/leis";
import { anosTodasLeis } from "@/lib/links";
import { FONTE_SANCOES, leisSoCamara, leisSoCamaraDoAno, projetosVetados } from "@/lib/sancoes";
import { dataPorExtenso, numero } from "@/lib/texto";

export const metadata: Metadata = { title: "Leis e projetos" };

export default function Leis() {
  const refs = new Referencias();
  const imgPagina = imagemPagina("leis", undefined);
  const imagemQ = imgPagina ? imagemParaQuadro(refs, imgPagina, imgPagina.legenda) : null;
  const nIo = refs.cita("iomo-edicoes");
  const n = refs.cita("camara-sessoes");
  const periodo = `${dataPorExtenso(CAMARA.periodo.inicio)} e ${dataPorExtenso(CAMARA.periodo.fim)}`;
  const daCamara = new Set(leisOrdenadas().map(idLei));
  const escritasSo = escritas("leis").filter((e) => !daCamara.has(e.id));
  return (
    <Artigo tipo="Lista" titulo="Leis e projetos" refs={refs} quadro={<Quadro titulo="Leis e projetos" linhas={[]} imagem={imagemQ} />}>
      <p className="prosa">
        Leis municipais de Osasco publicadas na Imprensa Oficial do Município ({numero(leisIomo().length)} leis), com o texto de cada uma.
        <Cita n={nIo} /> A tabela de sanções de leis da Câmara Municipal, de 1996 em diante, completa a autoria e acrescenta{" "}
        {numero(leisSoCamara().length)} leis que não aparecem nas edições lidas, além de {numero(projetosVetados().length)} projetos vetados.
        <Cita n={refs.cita(FONTE_SANCOES)} /> Os decretos do Executivo estão em <LinkPagina caminho="decretos" />. Da legislatura atual, também as leis cuja sanção foi comunicada nas sessões da <LinkPagina caminho="camara" /> realizadas entre{" "}
        {periodo}, os projetos de vereadores vetados e as {numero(CAMARA.projetos.length)} <LinkPagina caminho="projetos">proposições lidas</LinkPagina>.
        <Cita n={n} />
      </p>
      {anosTodasLeis().length > 0 && (
        <Secao titulo="Leis por ano">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {anosTodasLeis().map((ano) => (
              <li key={ano}>
                <LinkPagina caminho={`leis/ano/${ano}`}>{ano}</LinkPagina> <span className="text-sm text-tinta-suave">({numero(leisDoAno(ano).length + leisSoCamaraDoAno(ano).length)})</span>
              </li>
            ))}
          </ul>
        </Secao>
      )}
      <Secao titulo={`Leis comunicadas nas sessões da Câmara desde 2025 (${CAMARA.leis.length})`}>
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
