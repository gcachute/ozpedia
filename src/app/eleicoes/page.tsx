import type { Metadata } from "next";
import { LinkPagina, NomePessoa, SiglaPartido } from "@/components/artigo";
import { escrita } from "@/lib/conteudo";
import { chapas, eleicoes, pessoa } from "@/lib/dados";

export const metadata: Metadata = { title: "Eleições" };

export default function Eleicoes() {
  return (
    <div>
      <h1 className="titulo text-4xl">Eleições</h1>
      <p className="mt-2 max-w-2xl">
        Eleições municipais de Osasco. De 1996 em diante, com os dados abertos do Tribunal Superior Eleitoral; antes disso, páginas escritas com outras
        fontes.
      </p>
      <table className="tabela mt-8">
        <thead>
          <tr>
            <th>Eleição</th>
            <th>Venceu para a Prefeitura</th>
          </tr>
        </thead>
        <tbody>
          {eleicoes().map((e) => {
            const v = e.dadosTse ? chapas(e.ano).find((c) => c.titular.resultado === "Eleito") : null;
            const manual = escrita("eleicoes", String(e.ano))?.cab.eleitos?.find((x) => x.cargo === "Prefeitura");
            return (
              <tr key={e.ano}>
                <td>
                  <LinkPagina caminho={`eleicoes/${e.ano}`}>{e.ano}</LinkPagina>
                </td>
                <td>
                  {v ? (
                    <>
                      <NomePessoa id={v.titular.pessoa} nome={v.titular.nome} /> (<SiglaPartido sigla={v.titular.partido} ano={e.ano} />)
                    </>
                  ) : manual && pessoa(manual.pessoa) ? (
                    <NomePessoa id={manual.pessoa} nome={pessoa(manual.pessoa)!.nome} />
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
