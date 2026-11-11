// Página de um mandato na Prefeitura: quem governou, com quem, quando, e as leis publicadas no período.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Artigo, Cita, LinkPagina, NomePessoa, Quadro, Secao, type LinhaQuadro, imagemParaQuadro } from "@/components/artigo";
import { legislaturas, pessoa } from "@/lib/dados";
import { Referencias } from "@/lib/fontes";
import { imagemDe, imagemPagina } from "@/lib/imagens";
import { leisIomo, quemAssinou } from "@/lib/leis";
import { TabelaContas } from "@/components/contas";
import { contasEntre } from "@/lib/contas";
import { decretosEntre } from "@/lib/decretos";
import { mandato, mandatos, tituloMandato } from "@/lib/prefeitos";
import { dataPorExtenso, numero } from "@/lib/texto";

type Props = { params: Promise<{ id: string }> };

export const generateStaticParams = () => mandatos().map((m) => ({ id: m.id }));
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = mandato((await params).id);
  return { title: m ? tituloMandato(m) : "Mandato" };
}

export default async function PaginaMandato({ params }: Props) {
  const { id } = await params;
  const m = mandato(id);
  if (!m) notFound();
  const lista = mandatos();
  const i = lista.indexOf(m);
  const anterior = lista[i - 1] ?? null;
  const seguinte = lista[i + 1] ?? null;
  const refs = new Referencias();
  const img = (m.pessoa ? imagemDe(m.pessoa) : null) ?? imagemPagina("prefeitura");
  const imagemQ = img ? imagemParaQuadro(refs, img, img.legenda) : null;
  const nF = m.fontes.map((f) => refs.cita(f));

  // Leis com data dentro do período, e quem as assinou.
  const leis = leisIomo().filter((l) => l.data >= m.inicio && l.data <= m.fim);
  const nIo = leis.length ? refs.cita("iomo-edicoes") : 0;
  const porAno = [...leis.reduce((acc, l) => acc.set(l.data.slice(0, 4), (acc.get(l.data.slice(0, 4)) ?? 0) + 1), new Map<string, number>())].sort();
  const porQuem = [
    ...leis.reduce((acc, l) => {
      const k = quemAssinou(l) ?? l.assinatura.nome;
      return acc.set(k, (acc.get(k) ?? 0) + 1);
    }, new Map<string, number>()),
  ].sort((a, b) => b[1] - a[1]);
  const contas = contasEntre(m.inicio, m.fim);
  const decs = decretosEntre(m.inicio, m.fim);
  const anosDec = [...new Set(decs.map((d) => d.data.slice(0, 4)))].sort();
  const legs = legislaturas().filter((l) => {
    const [a, b] = l.periodo.split(/[–-]/).map(Number);
    return a <= Number(m.fim.slice(0, 4)) && b >= Number(m.inicio.slice(0, 4));
  });

  const nome = (pid: string | null, n: string | null) => (pid && pessoa(pid) ? <NomePessoa id={pid} nome={pessoa(pid)!.nome} /> : n ?? "—");
  const linhas: LinhaQuadro[] = [
    { rotulo: "Prefeitura", valor: nome(m.pessoa, m.nome), cita: nF },
    { rotulo: "Vice-prefeitura", valor: nome(m.vicePessoa, m.viceNome), cita: nF },
    { rotulo: "Início", valor: dataPorExtenso(m.inicio), cita: nF },
    { rotulo: "Fim", valor: dataPorExtenso(m.fim), cita: nF },
  ];
  if (m.eleicao) linhas.push({ rotulo: "Eleição", valor: <LinkPagina caminho={`eleicoes/${m.eleicao}`}>{m.eleicao}</LinkPagina> });
  if (anterior) linhas.push({ rotulo: "Mandato anterior", valor: <LinkPagina caminho={`prefeitura/mandatos/${anterior.id}`}>{tituloMandato(anterior)}</LinkPagina> });
  if (seguinte) linhas.push({ rotulo: "Mandato seguinte", valor: <LinkPagina caminho={`prefeitura/mandatos/${seguinte.id}`}>{tituloMandato(seguinte)}</LinkPagina> });
  if (leis.length) linhas.push({ rotulo: "Leis publicadas", valor: numero(leis.length), cita: nIo });

  return (
    <Artigo tipo="Mandato na Prefeitura" titulo={tituloMandato(m)} refs={refs} quadro={<Quadro titulo={tituloMandato(m)} linhas={linhas} imagem={imagemQ} />}>
      <p className="prosa">
        Mandato de {nome(m.pessoa, m.nome)} na <LinkPagina caminho="prefeitura" />, de {dataPorExtenso(m.inicio)} a {dataPorExtenso(m.fim)}
        {m.viceNome ? (
          <>
            , com {nome(m.vicePessoa, m.viceNome)} na Vice-prefeitura
          </>
        ) : null}
        .<Cita n={nF} />
        {m.eleicao && (
          <>
            {" "}
            Resultado da <LinkPagina caminho={`eleicoes/${m.eleicao}`}>eleição municipal de {m.eleicao}</LinkPagina>.
          </>
        )}
      </p>
      {legs.length > 0 && (
        <p className="prosa mt-3">
          Na Câmara Municipal, no período:{" "}
          {legs.map((l, k) => (
            <span key={l.id}>
              {k > 0 && ", "}
              <LinkPagina caminho={`legislaturas/${l.id}`} />
            </span>
          ))}
          .
        </p>
      )}
      {leis.length > 0 && (
        <Secao titulo="Leis do período">
          <p className="mb-3">
            {numero(leis.length)} leis com data dentro do mandato foram encontradas na Imprensa Oficial do Município.
            <Cita n={nIo} />
          </p>
          <div className="grid gap-6 sm:grid-cols-2">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Ano</th>
                  <th>Leis</th>
                </tr>
              </thead>
              <tbody>
                {porAno.map(([ano, n]) => (
                  <tr key={ano}>
                    <td>
                      <LinkPagina caminho={`leis/ano/${ano}`}>{ano}</LinkPagina>
                    </td>
                    <td>{numero(n)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <table className="tabela">
              <thead>
                <tr>
                  <th>Assinou</th>
                  <th>Leis</th>
                </tr>
              </thead>
              <tbody>
                {porQuem.map(([k, n]) => (
                  <tr key={k}>
                    <td>{pessoa(k) ? <NomePessoa id={k} nome={pessoa(k)!.nome} /> : k}</td>
                    <td>{numero(n)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Secao>
      )}
      {decs.length > 0 && (
        <Secao titulo="Decretos do período">
          <p>
            {numero(decs.length)} decretos de política pública com data dentro do mandato foram lidos na Imprensa Oficial do Município, por ano:{" "}
            {anosDec.map((a, k) => (
              <span key={a}>
                {k > 0 && ", "}
                <LinkPagina caminho={`decretos/ano/${a}`}>{a}</LinkPagina> ({numero(decs.filter((d) => d.data.startsWith(a)).length)})
              </span>
            ))}
            .<Cita n={refs.cita("iomo-edicoes")} />
          </p>
        </Secao>
      )}
      {contas.length > 0 && (
        <Secao titulo="Contas anuais">
          <p className="mb-3">
            Julgamento das contas de cada ano do mandato pela <LinkPagina caminho="camara" />, pelos decretos legislativos publicados na Imprensa Oficial do
            Município. Todos os anos achados estão na página da <LinkPagina caminho="prefeitura" />.
          </p>
          <TabelaContas contas={contas} refs={refs} comMandato={false} />
        </Secao>
      )}
    </Artigo>
  );
}
