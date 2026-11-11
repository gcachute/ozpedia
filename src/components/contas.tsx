// Tabela das contas anuais da Prefeitura julgadas pela Câmara.
import { Cita, LinkPagina, NomePessoa } from "@/components/artigo";
import { fonteConta, type ContaAnual } from "@/lib/contas";
import { pessoa } from "@/lib/dados";
import type { Referencias } from "@/lib/fontes";
import { mandatos, tituloMandato } from "@/lib/prefeitos";
import { dataCurta } from "@/lib/texto";

export function TabelaContas({ contas, refs, comMandato = true }: { contas: ContaAnual[]; refs: Referencias; comMandato?: boolean }) {
  const lista = mandatos();
  return (
    <div className="overflow-x-auto">
      <table className="tabela">
        <thead>
          <tr>
            <th>Exercício</th>
            {comMandato && <th>Mandato</th>}
            <th>Na Câmara</th>
            <th>Decreto legislativo</th>
            <th>Observação</th>
          </tr>
        </thead>
        <tbody>
          {contas.map((c) => {
            const m = lista.find((x) => x.inicio.slice(0, 4) <= String(c.exercicio) && x.fim.slice(0, 4) >= String(c.exercicio));
            return (
              <tr key={c.exercicio}>
                <td>{c.exercicio}</td>
                {comMandato && (
                  <td>
                    {m ? (
                      <>
                        {m.pessoa && pessoa(m.pessoa) ? <NomePessoa id={m.pessoa} nome={pessoa(m.pessoa)!.nome} /> : m.nome} (
                        <LinkPagina caminho={`prefeitura/mandatos/${m.id}`}>{tituloMandato(m).replace(/^Mandato de .* \(/, "").replace(/\)$/, "")}</LinkPagina>)
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                )}
                <td>
                  {c.resultado === "aprovadas" ? "Aprovadas" : "Rejeitadas"}
                  {c.deliberacao ? ` em ${dataCurta(c.deliberacao)}` : ""}
                </td>
                <td className="whitespace-nowrap">
                  {c.decreto ? `nº ${c.decreto}` : "—"}
                  <Cita n={refs.cita(fonteConta(c))} />
                </td>
                <td>
                  {[c.parecerTce ? `Parecer prévio ${c.parecerTce} do Tribunal de Contas do Estado, segundo o decreto.` : "", c.nota ?? ""].filter(Boolean).join(" ")}
                  {c.parecer && (
                    <>
                      {c.parecerTce || c.nota ? " " : ""}
                      {c.parecer.texto}
                      <Cita n={c.parecer.fontes.map((f) => refs.cita(f))} />
                    </>
                  )}
                  {!c.parecerTce && !c.nota && !c.parecer && "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
