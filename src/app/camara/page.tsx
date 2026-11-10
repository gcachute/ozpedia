import type { Metadata } from "next";
import { Artigo, Cita, LinkPagina, NomePessoa, Secao, imagemParaQuadro, Quadro } from "@/components/artigo";
import { legislaturas, pessoa, pessoaDoNome } from "@/lib/dados";
import { Referencias } from "@/lib/fontes";
import { imagemPagina } from "@/lib/imagens";
import { listaE } from "@/lib/texto";

export const metadata: Metadata = { title: "Câmara Municipal de Osasco" };

export default function Camara() {
  const refs = new Referencias();
  const imgPagina = imagemPagina("camara", undefined);
  const imagemQ = imgPagina ? imagemParaQuadro(refs, imgPagina, imgPagina.legenda) : null;
  const nHist = refs.cita("camara-historico");
  const nLeg = refs.cita("camara-legislaturas");
  const nCf = refs.cita("cf-1988-art-29");
  const lista = legislaturas();
  // Presidentes, do mais recente ao mais antigo, com os anos de cada um.
  const presidentes: { nome: string; pessoa: string | null; anos: string[] }[] = [];
  for (const l of lista)
    for (const s of [...l.leg.sessoes].reverse())
      for (const m of s.mesa.filter((x) => x.cargo === "Presidente")) {
        const ultimo = presidentes.at(-1);
        const ano = s.inicio.slice(0, 4);
        if (ultimo && ultimo.nome === m.nome) {
          if (!ultimo.anos.includes(ano)) ultimo.anos.unshift(ano);
        } else presidentes.push({ nome: m.nome, pessoa: m.pessoa, anos: [ano] });
      }
  const total = new Set(lista.flatMap((l) => l.leg.vereadores.map((v) => pessoaDoNome(v.nome, v.pessoa) ?? v.nome))).size;
  const Nome = ({ nome, id }: { nome: string; id: string | null }) => {
    const p = pessoaDoNome(nome, id);
    return p && pessoa(p) ? <NomePessoa id={p} nome={nome} /> : <>{nome}</>;
  };
  return (
    <Artigo tipo="Instituição" titulo="Câmara Municipal de Osasco" refs={refs} quadro={<Quadro titulo="Câmara Municipal de Osasco" linhas={[]} imagem={imagemQ} />}>
      <div className="prosa">
        <p>
          A <strong>Câmara Municipal de Osasco</strong> é o Poder Legislativo do município. Os 23 primeiros vereadores tomaram posse em 19 de fevereiro de 1962, junto com o
          primeiro prefeito e o primeiro vice-prefeito.
          <Cita n={nHist} /> Desde então houve {lista.length} legislaturas, com {total} pessoas no cargo de vereador, contando os suplentes que assumiram.
          <Cita n={nLeg} /> Pela Constituição de 1988, os vereadores são eleitos para mandato de quatro anos, na mesma eleição de prefeito e vice.
          <Cita n={nCf} />
        </p>
        <h2>Primeira legislatura</h2>
        <p>
          Segundo o histórico publicado pela Câmara, a primeira legislatura aprovou o orçamento e criou o quadro de funcionários do Legislativo e do Executivo; a Câmara
          funcionou de início num parque infantil. Foram criadas por lei a Biblioteca Municipal Monteiro Lobato e a Juventude Cívica de Osasco (JUCO), e aprovada a
          concorrência para a telefonia automática da cidade, vencida pela Companhia Telefônica Suburbana Paulista (COTESPA). As leis 130 e 131 aprovaram a incorporação a
          Osasco do Centro Industrial do Jaguaré, da Vila Jaguara, da Vila Piauí e dos altos da Vila dos Remédios.
          <Cita n={nHist} />
        </p>
        <p>
          Ainda segundo esse histórico, em fevereiro de 1966 a cidade sofreu intervenção federal; o prefeito e os vereadores foram presos e perderam os mandatos, e o
          vice-prefeito Marino Pedro Nicoletti foi nomeado interventor, exercendo as funções do Executivo e do Legislativo. O primeiro presidente da Câmara foi Orlando
          Calasans.
          <Cita n={nHist} />
        </p>
      </div>
      <Secao titulo="Legislaturas">
        <div className="overflow-x-auto">
          <table className="tabela">
            <thead>
              <tr>
                <th>Legislatura</th>
                <th>Período</th>
                <th className="num">Vereadores</th>
                <th>Presidência</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((l) => {
                const pres = [...new Map(l.leg.sessoes.flatMap((s) => s.mesa.filter((m) => m.cargo === "Presidente").map((m) => [m.nome, m] as const))).values()];
                return (
                  <tr key={l.id}>
                    <td>
                      <LinkPagina caminho={`legislaturas/${l.id}`}>{`${l.numero}ª`}</LinkPagina>
                    </td>
                    <td className="whitespace-nowrap">{l.periodo}</td>
                    <td className="num">{l.leg.vereadores.length}</td>
                    <td>
                      {pres.map((m, k) => (
                        <span key={m.nome}>
                          {k > 0 && ", "}
                          <Nome nome={m.nome} id={m.pessoa} />
                        </span>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm text-tinta-suave">
          Fonte: Câmara Municipal de Osasco.
          <Cita n={nLeg} />
        </p>
      </Secao>
      <Secao titulo="Presidentes">
        <ol className="prosa">
          {presidentes.map((p, k) => (
            <li key={p.nome + k}>
              <Nome nome={p.nome} id={p.pessoa} /> ({listaE(p.anos)})
            </li>
          ))}
        </ol>
        <p className="mt-2 text-sm text-tinta-suave">
          Do mais recente ao mais antigo, pelas Mesas de cada sessão legislativa publicadas pela Câmara.
          <Cita n={[nLeg, refs.cita("camara-presidentes")]} />
        </p>
      </Secao>
    </Artigo>
  );
}
