// Suplentes convocados para assumir uma vaga na Câmara, legislatura por legislatura, pelos atos da Presidência.
import type { Metadata } from "next";
import { Artigo, Cita, LinkPagina, Quadro, Secao, imagemParaQuadro } from "@/components/artigo";
import { TabelaConvocacoes } from "@/components/convocacoes";
import { convocacoes, convocacoesEntre, pessoasConvocadas } from "@/lib/convocacoes";
import { legislaturas } from "@/lib/dados";
import { Referencias } from "@/lib/fontes";
import { imagemPagina } from "@/lib/imagens";
import { numero } from "@/lib/texto";

export const metadata: Metadata = { title: "Suplentes convocados na Câmara Municipal" };

export default function Suplentes() {
  const refs = new Referencias();
  const img = imagemPagina("camara", undefined);
  const imagemQ = img ? imagemParaQuadro(refs, img, img.legenda) : null;
  const nIo = refs.cita("iomo-edicoes");
  const todas = convocacoes();
  const legs = legislaturas()
    .map((l) => ({ l, lista: convocacoesEntre(l.leg.inicio, l.leg.fim) }))
    .filter((x) => x.lista.length);
  const anos = todas.map((c) => c.edicao.data.slice(0, 4)).sort();
  return (
    <Artigo
      tipo="Lista"
      titulo="Suplentes convocados na Câmara Municipal"
      refs={refs}
      quadro={
        <Quadro
          titulo="Suplentes convocados"
          imagem={imagemQ}
          linhas={[
            { rotulo: "Convocações", valor: numero(todas.length), cita: nIo },
            { rotulo: "Pessoas convocadas", valor: numero(pessoasConvocadas().size), cita: nIo },
            { rotulo: "Período", valor: `${anos[0]}–${anos.at(-1)}`, cita: nIo },
          ]}
        />
      }
    >
      <div className="prosa">
        <p>
          Quando um vereador se licencia, renuncia ou perde o mandato, a Presidência da <LinkPagina caminho="camara" /> convoca um suplente por um ato publicado na
          Imprensa Oficial do Município. Esta lista reúne os {numero(todas.length)} atos de convocação encontrados nas edições de {anos[0]} a {anos.at(-1)}.
          <Cita n={nIo} />
        </p>
        <p>
          A data é a de início que o ato informa; quando o ato não informa, é a da publicação. Quando o primeiro suplente convocado não assume, um novo ato convoca o
          seguinte. As edições de 2009 a 2014 quase não estão no site da Prefeitura, e as anteriores a 2015 são lidas coluna por coluna, o que pode deixar de fora
          algum ato.
        </p>
      </div>
      {legs.map(({ l, lista }) => (
        <Secao key={l.id} titulo={`${l.numero}ª Legislatura (${l.periodo})`}>
          <TabelaConvocacoes lista={lista} refs={refs} />
          <p className="mt-2 text-sm text-tinta-suave">
            Composição completa em <LinkPagina caminho={`legislaturas/${l.id}`} />.
          </p>
        </Secao>
      ))}
    </Artigo>
  );
}
