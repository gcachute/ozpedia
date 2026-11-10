import type { Metadata } from "next";
import { Artigo, Cita, LinkPagina, Secao, imagemParaQuadro, Quadro } from "@/components/artigo";
import { Filtro } from "@/components/filtro";
import { Autoria, LinkSessao } from "@/components/camara";
import { CAMARA, nomeProjeto, TIPOS_PROJETO } from "@/lib/camara";
import { pessoa } from "@/lib/dados";
import { Referencias } from "@/lib/fontes";
import { imagemPagina } from "@/lib/imagens";
import { dataPorExtenso, numero } from "@/lib/texto";

export const metadata: Metadata = { title: "Proposições da legislatura 2025–2028" };

export default function Projetos() {
  const refs = new Referencias();
  const imgPagina = imagemPagina("projetos", undefined);
  const imagemQ = imgPagina ? imagemParaQuadro(refs, imgPagina, imgPagina.legenda) : null;
  const n = refs.cita("camara-sessoes");
  const lista = [...CAMARA.projetos].sort((a, b) => b.ano - a.ano || a.tipo.localeCompare(b.tipo) || b.numero - a.numero);
  const porTipo = Object.entries(
    lista.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.tipo]: (acc[p.tipo] ?? 0) + 1 }), {}),
  ).sort((a, b) => b[1] - a[1]);
  const doExecutivo = lista.filter((p) => p.autorTexto === "Prefeitura").length;
  return (
    <Artigo tipo="Lista" titulo="Proposições da legislatura 2025–2028" refs={refs} quadro={<Quadro titulo="Proposições da legislatura 2025–2028" linhas={[]} imagem={imagemQ} />}>
      <p className="prosa">
        Projetos lidos nas sessões da <LinkPagina caminho="camara" /> realizadas entre {dataPorExtenso(CAMARA.periodo.inicio)} e{" "}
        {dataPorExtenso(CAMARA.periodo.fim)}: {numero(lista.length)} ao todo, {numero(doExecutivo)} deles enviados pela <LinkPagina caminho="prefeitura" />.
        <Cita n={n} /> Por tipo: {porTipo.map(([t, q]) => `${TIPOS_PROJETO[t]?.toLowerCase() ?? t} (${q})`).join(", ")}.
      </p>
      <Secao titulo="Todas as proposições">
        <Filtro alvo="tabela-projetos" rotulo="Filtrar por número, autoria ou assunto" />
        <div className="mt-4 overflow-x-auto">
          <table className="tabela" id="tabela-projetos">
            <thead>
              <tr>
                <th>Projeto</th>
                <th>Autoria</th>
                <th>Ementa</th>
                <th>Lido na</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.key} data-busca={`${nomeProjeto(p)} ${p.autores.map((a) => pessoa(a)?.nome ?? "").join(" ")} ${p.autorTexto ?? ""} ${p.ementa}`}>
                  <td className="whitespace-nowrap" title={TIPOS_PROJETO[p.tipo] ?? p.tipo}>
                    {nomeProjeto(p)}
                  </td>
                  <td>
                    <Autoria autores={p.autores} autorTexto={p.autorTexto} />
                  </td>
                  <td>{p.ementa}</td>
                  <td>
                    <LinkSessao id={p.sessao} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Secao>
    </Artigo>
  );
}
