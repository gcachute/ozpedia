// Julgamentos do Tribunal de Contas do Estado sobre órgãos de Osasco, ano a ano.
import type { Metadata } from "next";
import { Artigo, Cita, LinkPagina, NomePessoa, Quadro, Secao, imagemParaQuadro } from "@/components/artigo";
import { pessoa } from "@/lib/dados";
import { Referencias } from "@/lib/fontes";
import { imagemPagina } from "@/lib/imagens";
import { anosTce, fonteTce, julgamentosTce, sessoesTce, tipoTce } from "@/lib/tce";
import { dataCurta, numero } from "@/lib/texto";

export const metadata: Metadata = { title: "Julgamentos do Tribunal de Contas" };

export default function TribunalDeContas() {
  const refs = new Referencias();
  const img = imagemPagina("prefeitura", undefined);
  const imagemQ = img ? imagemParaQuadro(refs, img, img.legenda) : null;
  const todos = julgamentosTce();
  const anos = anosTce();
  const nGeral = refs.cita("tce-sessoes");
  return (
    <Artigo
      tipo="Lista"
      titulo="Julgamentos do Tribunal de Contas"
      refs={refs}
      quadro={
        <Quadro
          titulo="Tribunal de Contas"
          imagem={imagemQ}
          linhas={[
            { rotulo: "Julgamentos", valor: numero(todos.length), cita: nGeral },
            { rotulo: "Sessões", valor: numero(sessoesTce().length), cita: nGeral },
            { rotulo: "Período", valor: `${anos.at(-1)}–${anos[0]}`, cita: nGeral },
          ]}
        />
      }
    >
      <div className="prosa">
        <p>
          Julgamentos do Tribunal de Contas do Estado de São Paulo sobre a <LinkPagina caminho="prefeitura" />, a <LinkPagina caminho="camara" />, a Fundação
          Instituto Tecnológico de Osasco e o Instituto de Previdência do Município, lidos nos resultados que o Tribunal publica depois de cada sessão do Tribunal
          Pleno, da Primeira Câmara e da Segunda Câmara. Cada linha traz o assunto e o resultado como o Tribunal os publicou.
          <Cita n={nGeral} />
        </p>
        <p>
          Os resultados publicados nesse formato vão de dezembro de 2020 em diante; antes de 2023, são poucas as sessões com arquivo. Não entram os itens retirados de
          pauta ou adiados, nem aposentadorias, admissões e pensões. Dos responsáveis, só aparecem os prefeitos e os presidentes da Câmara. Um mesmo contrato pode
          aparecer mais de uma vez: no julgamento e nos recursos.
        </p>
      </div>
      {anos.map((ano) => (
        <Secao key={ano} titulo={ano}>
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Processo</th>
                  <th>Assunto</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {todos
                  .filter((j) => j.data.startsWith(ano))
                  .map((j, k) => (
                    <tr key={`${j.arquivo}-${j.processo}-${k}`}>
                      <td className="whitespace-nowrap align-top">
                        {dataCurta(j.data)}
                        <div className="text-xs text-tinta-suave">{j.orgao}</div>
                      </td>
                      <td className="whitespace-nowrap align-top text-sm">
                        {j.processo}
                        <div className="text-xs text-tinta-suave">{tipoTce(j)}</div>
                      </td>
                      <td className="align-top text-sm">
                        {j.assunto}
                        {j.contratada ? <> (contratada: {j.contratada})</> : null}.
                        {j.julgamento ? <div className="mt-1 text-xs text-tinta-suave">Em julgamento: {j.julgamento}.</div> : null}
                        {j.pessoas.filter((p) => pessoa(p)).length ? (
                          <div className="mt-1 text-xs">
                            Responsável:{" "}
                            {j.pessoas
                              .filter((p) => pessoa(p))
                              .map((p, i, l) => (
                                <span key={p}>
                                  <NomePessoa id={p} nome={pessoa(p)!.nome} />
                                  {i < l.length - 1 ? ", " : ""}
                                </span>
                              ))}
                          </div>
                        ) : null}
                      </td>
                      <td className="align-top text-sm">
                        {j.resultado}.
                        <Cita n={refs.cita(fonteTce(j))} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Secao>
      ))}
    </Artigo>
  );
}
