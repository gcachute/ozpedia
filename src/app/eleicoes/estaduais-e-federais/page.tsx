// Candidaturas a cargos do estado de São Paulo e federais de quem também disputou eleições em Osasco (arquivos do TSE).
// Só o resultado: os arquivos usados trazem os votos de Osasco apenas nas eleições municipais.
import type { Metadata } from "next";
import { Artigo, Cita, NomePessoa, Quadro, Secao, SiglaPartido, imagemParaQuadro } from "@/components/artigo";
import { instituicao, ordemCargo } from "@/lib/cargos";
import { candidaturasForaDeOsasco, rotuloResultado } from "@/lib/dados";
import { Referencias } from "@/lib/fontes";
import { imagemPagina } from "@/lib/imagens";
import { numero } from "@/lib/texto";

const TITULO = "Eleições estaduais e federais";
export const metadata: Metadata = { title: TITULO };

const ordemResultado = (r: string | null) => ["Eleito", "Suplente", "Não eleito"].indexOf(r ?? "") >>> 0;

export default function EleicoesEstaduaisFederais() {
  const refs = new Referencias();
  const img = imagemPagina("eleicoes/estaduais-e-federais", "eleicao");
  const imagemQ = img ? imagemParaQuadro(refs, img, img.legenda) : null;
  const n = refs.cita("tse-trajetorias");
  const lista = candidaturasForaDeOsasco();
  const anos = [...new Set(lista.map((c) => c.ano))].sort((a, b) => b - a);
  const pessoasDistintas = new Set(lista.map((c) => c.pessoa)).size;
  const vitorias = lista.filter((c) => c.resultado === "Eleito").length;

  return (
    <Artigo
      tipo="Eleições"
      titulo={TITULO}
      refs={refs}
      quadro={
        <Quadro
          titulo={TITULO}
          imagem={imagemQ}
          linhas={[
            { rotulo: "Eleições", valor: `${anos.at(-1)} a ${anos[0]}`, cita: n },
            { rotulo: "Candidaturas", valor: numero(lista.length), cita: n },
            { rotulo: "Pessoas", valor: numero(pessoasDistintas), cita: n },
            { rotulo: "Candidaturas que venceram", valor: numero(vitorias), cita: n },
          ]}
        />
      }
    >
      <p>
        Candidaturas a cargos do estado de São Paulo e a cargos federais de pessoas que também disputaram eleições em Osasco, de {anos.at(-1)} a {anos[0]}.
        Para essas eleições, os arquivos usados trazem só o resultado, sem os votos.
        <Cita n={n} />
      </p>
      {anos.map((ano) => {
        const doAno = lista
          .filter((c) => c.ano === ano)
          .sort((a, b) => ordemCargo(a.cargo) - ordemCargo(b.cargo) || ordemResultado(a.resultado) - ordemResultado(b.resultado) || a.nome.localeCompare(b.nome, "pt"));
        return (
          <Secao key={ano} titulo={String(ano)} id={`e${ano}`}>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Candidatura</th>
                  <th>Cargo</th>
                  <th>Partido</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {doAno.map((c) => (
                  <tr key={`${c.pessoa}-${c.cargo}`}>
                    <td>
                      <NomePessoa id={c.pessoa} nome={c.nome} />
                    </td>
                    <td>{instituicao(c)}</td>
                    <td>
                      <SiglaPartido sigla={c.partido} ano={ano} />
                    </td>
                    <td>{rotuloResultado(c)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Secao>
        );
      })}
    </Artigo>
  );
}
