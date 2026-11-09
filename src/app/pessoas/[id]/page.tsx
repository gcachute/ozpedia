import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Artigo, Cita, LinkPagina, Quadro, Secao, SiglaPartido, TextoEscrito, type LinhaQuadro } from "@/components/artigo";
import { escrita } from "@/lib/conteudo";
import { ANOS_MUNICIPAIS, chavePartido, emOsasco, pessoa, pessoas, rotuloResultado, venceu } from "@/lib/dados";
import { Referencias } from "@/lib/fontes";
import { instituicao, ordemCargo } from "@/lib/cargos";
import { markdown } from "@/lib/markdown";
import { listaE, numero } from "@/lib/texto";

type Props = { params: Promise<{ id: string }> };

export const generateStaticParams = () => [...pessoas().keys()].map((id) => ({ id }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = pessoa((await params).id);
  return { title: p?.nome ?? "Pessoa" };
}

export default async function PaginaPessoa({ params }: Props) {
  const { id } = await params;
  const p = pessoa(id);
  if (!p) notFound();
  const e = escrita("pessoas", id);
  const refs = new Referencias();
  const cs = p.candidaturas;
  const temTse = cs.length > 0;

  // Quadro de dados.
  const linhas: LinhaQuadro[] = [];
  const nTse = temTse ? refs.cita("tse-trajetorias") : 0;
  if (temTse) linhas.push({ rotulo: "Nome de urna", valor: [...cs].reverse().find((c) => c.urna)?.urna ?? "", cita: nTse });
  const vitorias = new Map<string, { anos: number[]; ordem: number }>();
  for (const c of cs.filter(venceu)) {
    const k = instituicao(c);
    const v = vitorias.get(k) ?? { anos: [], ordem: ordemCargo(c.cargo) };
    v.anos.push(c.ano);
    vitorias.set(k, v);
  }
  const venceuPara: React.ReactNode[] = [...vitorias.entries()]
    .sort((a, b) => a[1].ordem - b[1].ordem)
    .map(([k, v]) => (
      <span key={k} className="block">
        {k} ({listaE(v.anos.map(String))})
      </span>
    ));
  // Com uma fonte só (TSE), a chamada vai no fim da linha; o que foi escrito à mão leva a fonte de cada item.
  const soTse = !e?.cab.cargos?.length;
  if (!soTse && venceuPara.length) venceuPara.push(<Cita key="tse" n={nTse} />);
  for (const c of e?.cab.cargos ?? [])
    venceuPara.push(
      <span key={c.cargo + c.eleicao} className="block">
        {c.cargo} ({c.eleicao ?? c.periodo})
        <Cita n={refs.cita(c.fonte)} />
      </span>,
    );
  if (venceuPara.length) linhas.push({ rotulo: "Venceu a eleição para", valor: venceuPara, cita: soTse ? nTse : undefined });

  // Partidos, na ordem em que aparecem, com os anos.
  const porPartido: { sigla: string; ano: number; anos: number[] }[] = [];
  for (const c of cs) {
    const k = chavePartido(c.partido, c.ano);
    const ult = porPartido.at(-1);
    if (ult && chavePartido(ult.sigla, ult.ano) === k) {
      if (!ult.anos.includes(c.ano)) ult.anos.push(c.ano);
    } else porPartido.push({ sigla: c.partido ?? "", ano: c.ano, anos: [c.ano] });
  }
  if (porPartido.length)
    linhas.push({
      rotulo: porPartido.length > 1 ? "Partidos nas candidaturas" : "Partido nas candidaturas",
      valor: porPartido.map((x, i) => (
        <span key={i} className="block">
          <SiglaPartido sigla={x.sigla} ano={x.ano} /> ({x.anos.length > 1 ? `${x.anos[0]}–${x.anos.at(-1)}` : x.anos[0]})
        </span>
      )),
      cita: nTse,
    });
  if (temTse)
    linhas.push({
      rotulo: "Eleições disputadas",
      valor: `${new Set(cs.map((c) => c.ano)).size}, de ${cs[0].ano} a ${cs.at(-1)!.ano}`,
      cita: nTse,
    });

  // Texto: o escrito à mão ou, sem ele, uma frase com o que dizem os dados.
  const html = e?.corpo ? markdown(e.corpo, refs) : null;
  const anos = [...new Set(cs.map((c) => c.ano))];

  return (
    <Artigo
      tipo="Pessoa"
      titulo={p.nome}
      refs={refs}
      quadro={<Quadro titulo={p.nome} linhas={linhas} />}
    >
      {html ? (
        <TextoEscrito html={html} />
      ) : (
        <p className="prosa">
          <strong>{p.nome}</strong> é o nome de urna de quem disputou {anos.length === 1 ? "uma eleição" : `${anos.length} eleições`}
          {anos.length === 1 ? `, em ${anos[0]}` : `, de ${anos[0]} a ${anos.at(-1)}`}, de acordo com o Tribunal Superior Eleitoral.
          <Cita n={nTse} />
        </p>
      )}

      {temTse && (
        <Secao titulo="Na urna, eleição a eleição">
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Ano</th>
                  <th>Disputa</th>
                  <th>Partido</th>
                  <th className="num">Número</th>
                  <th className="num">Votos em Osasco</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {[...cs].reverse().map((c, i) => (
                  <tr key={i}>
                    <td>{emOsasco(c) && ANOS_MUNICIPAIS.includes(c.ano) ? <LinkPagina caminho={`eleicoes/${c.ano}`}>{c.ano}</LinkPagina> : c.ano}</td>
                    <td>{instituicao(c)}</td>
                    <td>
                      <SiglaPartido sigla={c.partido} ano={c.ano} />
                    </td>
                    <td className="num">{c.numero}</td>
                    <td className="num">
                      {emOsasco(c) ? numero(c.votos) : "—"}
                      {c.votos2turno != null && <span className="block text-tinta-suave">2º turno: {numero(c.votos2turno)}</span>}
                    </td>
                    <td>{rotuloResultado(c)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-sm text-tinta-suave">
            Fonte: Tribunal Superior Eleitoral.
            <Cita n={nTse} /> Nas eleições estaduais e federais, só o resultado; os votos são os de Osasco nas eleições municipais.
          </p>
        </Secao>
      )}
    </Artigo>
  );
}
