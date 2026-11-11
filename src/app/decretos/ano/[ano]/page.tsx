// Decretos do Executivo de um ano, lidos na Imprensa Oficial do Município.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Artigo, Cita, LinkPagina, NomePessoa, Quadro, imagemParaQuadro } from "@/components/artigo";
import { Filtro } from "@/components/filtro";
import { anosDecretos, decretosDoAno } from "@/lib/decretos";
import { pessoa } from "@/lib/dados";
import { Referencias } from "@/lib/fontes";
import { imagemPagina } from "@/lib/imagens";
import { quemAssinouNome } from "@/lib/leis";
import { dataCurta, numero } from "@/lib/texto";

type Props = { params: Promise<{ ano: string }> };
export const generateStaticParams = () => anosDecretos().map((a) => ({ ano: String(a) }));
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Decretos de ${(await params).ano}` };
}

export default async function DecretosDoAno({ params }: Props) {
  const ano = Number((await params).ano);
  const lista = decretosDoAno(ano);
  if (!lista.length) notFound();
  const refs = new Referencias();
  const img = imagemPagina(`decretos/ano/${ano}`, "lei");
  const imagemQ = img ? imagemParaQuadro(refs, img, img.legenda) : null;
  const n = refs.cita("iomo-edicoes");
  const anos = anosDecretos();
  const i = anos.indexOf(ano);
  return (
    <Artigo
      tipo="Lista"
      titulo={`Decretos de ${ano}`}
      refs={refs}
      quadro={<Quadro titulo={`Decretos de ${ano}`} imagem={imagemQ} linhas={[{ rotulo: "Decretos", valor: numero(lista.length), cita: n }]} />}
    >
      <p className="prosa">
        Decretos da <LinkPagina caminho="prefeitura" /> com data de {ano} publicados na Imprensa Oficial do Município, com a ementa e quem assinou. Ficam de fora
        os atos sobre pessoas (nomeações, exonerações, aposentadorias, pensões), as desapropriações e os créditos orçamentários. Cada número leva à edição em que
        o decreto foi publicado.
        <Cita n={n} />
      </p>
      <p className="mt-2 text-sm">
        {i < anos.length - 1 && <LinkPagina caminho={`decretos/ano/${anos[i + 1]}`}>← {anos[i + 1]}</LinkPagina>}
        {i > 0 && (
          <>
            {i < anos.length - 1 && " · "}
            <LinkPagina caminho={`decretos/ano/${anos[i - 1]}`}>{anos[i - 1]} →</LinkPagina>
          </>
        )}
        {" · "}
        <LinkPagina caminho="decretos">Todos os anos</LinkPagina>
      </p>
      <div className="mt-6">
        <Filtro alvo="tabela-decretos" rotulo="Filtrar por número ou assunto" />
        <div className="overflow-x-auto">
          <table className="tabela" id="tabela-decretos">
            <thead>
              <tr>
                <th>Decreto</th>
                <th>Data</th>
                <th>Ementa</th>
                <th>Assinou</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((d) => {
                const quem = quemAssinouNome(d.assinatura.nome);
                return (
                  <tr key={d.numero} data-busca={`${d.numero} ${d.ementa}`}>
                    <td className="whitespace-nowrap">
                      <a className="link" href={d.edicao.url}>
                        nº {numero(d.numero)}
                      </a>
                      <Cita n={refs.cita(`iomo-${d.edicao.numero}`)} />
                    </td>
                    <td className="whitespace-nowrap">{dataCurta(d.data)}</td>
                    <td>{d.ementa}</td>
                    <td>{quem ? <NomePessoa id={quem} nome={pessoa(quem)!.nome} /> : d.assinatura.nome}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Artigo>
  );
}
