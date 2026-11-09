import type { Metadata } from "next";
import { Artigo, Cita, LinkPagina, NomePessoa, Secao, SiglaPartido } from "@/components/artigo";
import { escritas } from "@/lib/conteudo";
import { ANOS_MUNICIPAIS, chapas, periodoTexto, pessoa } from "@/lib/dados";
import { Referencias } from "@/lib/fontes";

export const metadata: Metadata = { title: "Prefeitura de Osasco" };

export default function Prefeitura() {
  const refs = new Referencias();
  const nInst = refs.cita("ibge-historico-osasco");
  const nCf = refs.cita("cf-1988-art-29");

  // Eleições com dados do TSE: a chapa que venceu. Antes delas, as eleições escritas à mão que dizem quem venceu.
  const linhas: { ano: number; titular: React.ReactNode; vice: React.ReactNode; partido: React.ReactNode; mandato: string; cita: number[] }[] = [];
  for (const ano of [...ANOS_MUNICIPAIS].reverse()) {
    const v = chapas(ano).find((c) => c.titular.resultado === "Eleito");
    if (!v) continue;
    linhas.push({
      ano,
      titular: <NomePessoa id={v.titular.pessoa} nome={v.titular.nome} />,
      vice: v.vice ? <NomePessoa id={v.vice.pessoa} nome={v.vice.nome} /> : "sem registro no arquivo do TSE",
      partido: <SiglaPartido sigla={v.titular.partido} ano={ano} />,
      mandato: periodoTexto(ano),
      cita: [refs.cita(`tse-candidatos-${ano}`), nCf],
    });
  }
  for (const e of escritas("eleicoes").sort((a, b) => Number(b.id) - Number(a.id))) {
    const pref = e.cab.eleitos?.find((x) => x.cargo === "Prefeitura");
    if (!pref) continue;
    const vice = e.cab.eleitos?.find((x) => x.cargo === "Vice-prefeitura");
    linhas.push({
      ano: Number(e.id),
      titular: pessoa(pref.pessoa) ? <NomePessoa id={pref.pessoa} nome={pessoa(pref.pessoa)!.nome} /> : pref.pessoa,
      vice: vice && pessoa(vice.pessoa) ? <NomePessoa id={vice.pessoa} nome={pessoa(vice.pessoa)!.nome} /> : "ainda sem fonte",
      partido: pref.partido ?? "ainda sem fonte",
      mandato: "ainda sem fonte",
      cita: [refs.cita(pref.fonte)],
    });
  }

  return (
    <Artigo tipo="Instituição" titulo="Prefeitura de Osasco" refs={refs}>
      <p className="prosa">
        O município de Osasco foi instalado em 19 de fevereiro de 1962, depois da eleição para a primeira administração, em 4 de fevereiro de 1962
        <Cita n={nInst} /> (ver <LinkPagina caminho="fatos/emancipacao-de-osasco" />). Desde a Constituição de 1988, prefeito e vice são eleitos
        para mandato de quatro anos e tomam posse em 1º de janeiro do ano seguinte ao da eleição.
        <Cita n={nCf} />
      </p>
      <Secao titulo="Quem venceu cada eleição">
        <div className="overflow-x-auto">
          <table className="tabela">
            <thead>
              <tr>
                <th>Eleição</th>
                <th>Prefeitura</th>
                <th>Vice</th>
                <th>Partido</th>
                <th>Mandato</th>
                <th>Fonte</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.ano}>
                  <td>
                    <LinkPagina caminho={`eleicoes/${l.ano}`}>{l.ano}</LinkPagina>
                  </td>
                  <td>{l.titular}</td>
                  <td>{l.vice}</td>
                  <td>{l.partido}</td>
                  <td>{l.mandato}</td>
                  <td>
                    <Cita n={l.cita} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-tinta-suave">
          É a chapa que venceu cada eleição. Afastamentos, cassações e substituições durante o mandato ainda não estão nesta tabela. As eleições
          anteriores a 1996 entram aqui conforme forem achadas as fontes.
        </p>
      </Secao>
    </Artigo>
  );
}
