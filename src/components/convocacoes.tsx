// Tabela de suplentes convocados para a Câmara, pelos atos publicados na Imprensa Oficial do Município.
import { Cita, NomePessoa } from "@/components/artigo";
import { dataConvocacao, fonteConvocacao, type Convocacao } from "@/lib/convocacoes";
import { pessoa } from "@/lib/dados";
import type { Referencias } from "@/lib/fontes";
import { dataCurta } from "@/lib/texto";

const Nome = ({ id, nome }: { id: string | null; nome: string | null }) => (!nome ? <>—</> : id && pessoa(id) ? <NomePessoa id={id} nome={nome} /> : <>{nome}</>);

export function motivoConvocacao(c: Convocacao) {
  switch (c.motivo) {
    case "licenca":
      return c.dias ? `Licença de ${c.dias} dias` : "Licença";
    case "cargo":
      return `Licença para exercer o cargo de ${c.cargo}`;
    case "impedimento":
      return (
        <>
          Licença{c.dias ? ` de ${c.dias} dias` : ""}; impedimento apresentado por <Nome id={c.pessoaImpedido} nome={c.impedido} /> na convocação anterior
        </>
      );
    case "renuncia":
      return "Renúncia";
    case "judicial":
      return "Decisão judicial que cancelou a diplomação";
  }
}

export function TabelaConvocacoes({ lista, refs }: { lista: Convocacao[]; refs: Referencias }) {
  return (
    <div className="overflow-x-auto">
      <table className="tabela">
        <thead>
          <tr>
            <th>Data</th>
            <th>Assumiu</th>
            <th>No lugar de</th>
            <th>Motivo</th>
            <th>Ato da Presidência</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((c) => (
            <tr key={`${c.edicao.numero}-${c.ato}-${c.convocado}`}>
              <td className="whitespace-nowrap">{dataCurta(dataConvocacao(c))}</td>
              <td>
                <Nome id={c.pessoaConvocado} nome={c.convocado} />
              </td>
              <td>
                <Nome id={c.pessoaTitular} nome={c.titular} />
              </td>
              <td>{motivoConvocacao(c)}</td>
              <td className="whitespace-nowrap">
                {c.ato ? `nº ${c.ato}` : "—"}
                <Cita n={refs.cita(fonteConvocacao(c))} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
