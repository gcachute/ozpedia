// Índice dos decretos do Executivo por ano.
import type { Metadata } from "next";
import { Artigo, Cita, LinkPagina, Quadro, Secao, imagemParaQuadro } from "@/components/artigo";
import { anosDecretos, decretos, decretosDoAno } from "@/lib/decretos";
import { Referencias } from "@/lib/fontes";
import { imagemPagina } from "@/lib/imagens";
import { numero } from "@/lib/texto";

export const metadata: Metadata = { title: "Decretos" };

export default function Decretos() {
  const refs = new Referencias();
  const img = imagemPagina("decretos", "lei");
  const imagemQ = img ? imagemParaQuadro(refs, img, img.legenda) : null;
  const n = refs.cita("iomo-edicoes");
  return (
    <Artigo
      tipo="Lista"
      titulo="Decretos"
      refs={refs}
      quadro={<Quadro titulo="Decretos" imagem={imagemQ} linhas={[{ rotulo: "Decretos", valor: numero(decretos().length), cita: n }]} />}
    >
      <p className="prosa">
        Decretos da <LinkPagina caminho="prefeitura" /> lidos nas edições da Imprensa Oficial do Município disponíveis no site da Prefeitura: regulamentações,
        programas, tarifas, permissões de uso de áreas públicas, calendário e outros atos de política pública. Não entram os atos sobre pessoas (nomeações,
        exonerações, aposentadorias, pensões), as desapropriações e os créditos orçamentários. As leis estão em <LinkPagina caminho="leis" />.
        <Cita n={n} />
      </p>
      <Secao titulo="Decretos por ano">
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {anosDecretos().map((ano) => (
            <li key={ano}>
              <LinkPagina caminho={`decretos/ano/${ano}`}>{ano}</LinkPagina> <span className="text-sm text-tinta-suave">({numero(decretosDoAno(ano).length)})</span>
            </li>
          ))}
        </ul>
      </Secao>
    </Artigo>
  );
}
