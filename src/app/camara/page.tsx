import type { Metadata } from "next";
import { Artigo, Cita, LinkPagina, Secao } from "@/components/artigo";
import { eleitosCamara, legislaturas, periodoTexto } from "@/lib/dados";
import { Referencias } from "@/lib/fontes";

export const metadata: Metadata = { title: "Câmara Municipal de Osasco" };

export default function Camara() {
  const refs = new Referencias();
  const nCf = refs.cita("cf-1988-art-29");
  const lista = legislaturas().map((l) => ({ ...l, n: eleitosCamara(l.ano).length, cita: refs.cita(`tse-candidatos-${l.ano}`) }));
  return (
    <Artigo tipo="Instituição" titulo="Câmara Municipal de Osasco" refs={refs}>
      <p className="prosa">
        Os vereadores de Osasco são eleitos para mandato de quatro anos, na mesma eleição de prefeito e vice.
        <Cita n={nCf} /> Cada legislatura tem uma página com a composição eleita.
      </p>
      <Secao titulo="Legislaturas">
        <table className="tabela">
          <thead>
            <tr>
              <th>Legislatura</th>
              <th>Eleição</th>
              <th className="num">Vagas preenchidas na eleição</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((l) => (
              <tr key={l.id}>
                <td>
                  <LinkPagina caminho={`legislaturas/${l.id}`}>{periodoTexto(l.ano)}</LinkPagina>
                </td>
                <td>
                  <LinkPagina caminho={`eleicoes/${l.ano}`}>{l.ano}</LinkPagina>
                </td>
                <td className="num">
                  {l.n}
                  <Cita n={l.cita} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-sm text-tinta-suave">As legislaturas anteriores a 1997 entram aqui conforme forem achadas as fontes.</p>
      </Secao>
    </Artigo>
  );
}
