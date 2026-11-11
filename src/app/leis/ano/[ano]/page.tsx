// Leis municipais de um ano: as lidas na Imprensa Oficial do Município de Osasco e as que só a tabela de sanções de leis
// da Câmara registra; no fim, os projetos vetados e os números não encontrados.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Artigo, Cita, LinkPagina, NomePessoa, Quadro, Secao, imagemParaQuadro } from "@/components/artigo";
import { Autoria } from "@/components/camara";
import { Filtro } from "@/components/filtro";
import { pessoa } from "@/lib/dados";
import { Referencias } from "@/lib/fontes";
import { imagemPagina } from "@/lib/imagens";
import { idLeiIomo, leisDoAno, quemAssinou } from "@/lib/leis";
import { anosTodasLeis } from "@/lib/links";
import {
  autoresSancao,
  autoriaDaLei,
  ehMesa,
  ehPrefeitura,
  FONTE_SANCOES,
  idLeiCamara,
  leisSoCamaraDoAno,
  numerosFaltandoTodas,
  textoVeto,
  vetadosDoAno,
  vetoDe,
  type Sancao,
} from "@/lib/sancoes";
import { dataCurta, numero } from "@/lib/texto";

type Props = { params: Promise<{ ano: string }> };

export const generateStaticParams = () => anosTodasLeis().map((a) => ({ ano: String(a) }));
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Leis municipais de ${(await params).ano}` };
}

const curto = (lei: string) => lei.replace("Lei nº", "Lei").replace("Lei Complementar nº", "LC");
function AutoriaSancao({ s }: { s: Sancao }) {
  const ids = autoresSancao(s);
  if (ids.length) return <Autoria autores={ids} />;
  if (ehPrefeitura(s)) return <>Prefeitura</>;
  if (ehMesa(s)) return <>Mesa Diretora</>;
  return <>{s.autor ?? "—"}</>;
}

export default async function LeisDoAno({ params }: Props) {
  const ano = Number((await params).ano);
  const leis = leisDoAno(ano);
  const soCamara = leisSoCamaraDoAno(ano);
  const vetados = vetadosDoAno(ano);
  if (!leis.length && !soCamara.length) notFound();
  const refs = new Referencias();
  const img = imagemPagina(`leis/ano/${ano}`, "lei");
  const imagemQ = img ? imagemParaQuadro(refs, img, img.legenda) : null;
  const n = leis.length ? refs.cita("iomo-edicoes") : 0;
  const nSan = refs.cita(FONTE_SANCOES);
  const ambas = [n, nSan].filter(Boolean);
  const anos = anosTodasLeis();
  const i = anos.indexOf(ano);
  const complementares = leis.filter((l) => l.complementar).length + soCamara.filter((l) => l.complementar).length;
  const faltam = [
    { rotulo: "Leis", faixas: numerosFaltandoTodas(ano, false) },
    { rotulo: "Leis complementares", faixas: numerosFaltandoTodas(ano, true) },
  ].filter((x) => x.faixas.length);
  const fx = ([a, b]: [number, number]) => (a === b ? numero(a) : `${numero(a)} a ${numero(b)}`);

  // Linhas da tabela, das duas fontes, por número.
  type Linha = {
    k: string;
    caminho: string;
    lei: string;
    ordem: number;
    data: string | null;
    ementa: string;
    autoria: React.ReactNode;
    busca: string;
    assinou: React.ReactNode;
    camara: boolean;
  };
  const linhas: Linha[] = [
    ...leis.map((l) => {
      const a = autoriaDaLei(l);
      const assinou = quemAssinou(l);
      return {
        k: l.key,
        caminho: `leis/${idLeiIomo(l)}`,
        lei: curto(l.lei),
        ordem: l.numero + (l.complementar ? 1e6 : 0),
        data: l.data,
        ementa: l.ementa,
        autoria: a.ids.length ? (
          <>
            <Autoria autores={a.ids} />
            {a.fonte === "camara" && <Cita n={nSan} />}
          </>
        ) : (
          (l.autoriaTexto ?? (a.prefeitura ? "Prefeitura" : a.mesa ? "Mesa Diretora" : "—"))
        ),
        busca: `${l.lei} ${l.ementa} ${l.autoriaTexto ?? ""} ${a.ids.map((x) => pessoa(x)?.nome).join(" ")}`,
        assinou: assinou ? <NomePessoa id={assinou} nome={pessoa(assinou)!.nome} /> : l.assinatura.nome,
        camara: false,
      };
    }),
    ...soCamara.map((l) => ({
      k: l.key,
      caminho: `leis/${idLeiCamara(l)}`,
      lei: curto(l.lei),
      ordem: l.numero + (l.complementar ? 1e6 : 0),
      data: l.data,
      ementa: l.ementa,
      autoria: <AutoriaSancao s={l.sancao} />,
      busca: `${l.lei} ${l.ementa} ${l.sancao.autor ?? ""} ${autoresSancao(l.sancao)
        .map((x) => pessoa(x)?.nome)
        .join(" ")}`,
      assinou: "—",
      camara: true,
    })),
  ].sort((a, b) => b.ordem - a.ordem);

  return (
    <Artigo
      tipo="Lista"
      titulo={`Leis municipais de ${ano}`}
      refs={refs}
      quadro={
        <Quadro
          titulo={`Leis de ${ano}`}
          imagem={imagemQ}
          linhas={[
            { rotulo: "Leis", valor: numero(linhas.length), cita: ambas },
            ...(soCamara.length ? [{ rotulo: "Só na tabela da Câmara", valor: numero(soCamara.length), cita: nSan }] : []),
            ...(complementares ? [{ rotulo: "Leis complementares", valor: numero(complementares), cita: ambas }] : []),
            ...(vetados.length ? [{ rotulo: "Projetos vetados", valor: numero(vetados.length), cita: nSan }] : []),
          ]}
        />
      }
    >
      <p className="prosa">
        Leis de Osasco de {ano}
        {leis.length > 0 && (
          <>
            {" "}
            publicadas na Imprensa Oficial do Município, com a ementa, a autoria do projeto e quem assinou
            <Cita n={n} />
          </>
        )}
        {soCamara.length > 0 && (
          <>
            {leis.length > 0 ? ", e as que" : " que"} só aparecem na tabela de sanções de leis da Câmara Municipal (marcadas com *), com o assunto e o autor que
            ela registra
            <Cita n={nSan} />
          </>
        )}
        .
        {leis.length > 0 && (
          <>
            {" "}
            Quando a Imprensa Oficial não informa a autoria, vale a da tabela da Câmara.
            <Cita n={nSan} />
          </>
        )}
      </p>
      <p className="mt-2 text-sm">
        {i < anos.length - 1 && <LinkPagina caminho={`leis/ano/${anos[i + 1]}`}>← {anos[i + 1]}</LinkPagina>}
        {i > 0 && (
          <>
            {i < anos.length - 1 && " · "}
            <LinkPagina caminho={`leis/ano/${anos[i - 1]}`}>{anos[i - 1]} →</LinkPagina>
          </>
        )}
        {" · "}
        <LinkPagina caminho="leis">Todas as listas</LinkPagina>
      </p>
      <div className="mt-6">
        <Filtro alvo="tabela-leis-ano" rotulo="Filtrar por número, assunto ou autoria" />
        <div className="overflow-x-auto">
          <table className="tabela" id="tabela-leis-ano">
            <thead>
              <tr>
                <th>Lei</th>
                <th>Data</th>
                <th>Ementa</th>
                <th>Autoria</th>
                <th>Assinou</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.k} data-busca={l.busca}>
                  <td className="whitespace-nowrap">
                    <LinkPagina caminho={l.caminho}>{l.lei}</LinkPagina>
                    {l.camara && "*"}
                  </td>
                  <td className="whitespace-nowrap">{l.data ? dataCurta(l.data) : "—"}</td>
                  <td>{l.ementa}</td>
                  <td>{l.autoria}</td>
                  <td>{l.assinou}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {soCamara.length > 0 && (
          <p className="mt-2 text-sm text-tinta-suave">* Lei que só aparece na tabela de sanções de leis da Câmara; o texto não foi encontrado na Imprensa Oficial.</p>
        )}
      </div>
      {vetados.length > 0 && (
        <Secao titulo="Projetos vetados">
          <p className="mb-3">
            Projetos aprovados pela Câmara e enviados à Prefeitura em {ano} que a tabela de sanções de leis registra como vetados, sem número de lei:
            <Cita n={nSan} />
          </p>
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Projeto</th>
                  <th>Autoria</th>
                  <th>Veto</th>
                  <th>Assunto</th>
                </tr>
              </thead>
              <tbody>
                {vetados.map((s, k) => (
                  <tr key={`${s.autografo}-${k}`}>
                    <td className="whitespace-nowrap">{s.projeto ? `PL ${s.projeto}` : "—"}</td>
                    <td>
                      <AutoriaSancao s={s} />
                    </td>
                    <td>{textoVeto(vetoDe(s)!)}</td>
                    <td>{s.assunto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Secao>
      )}
      {faltam.length > 0 && (
        <Secao titulo="Números não encontrados">
          <p className="mb-2">
            Números entre a primeira e a última lei de {ano} que não aparecem nas edições lidas da Imprensa Oficial do Município nem na tabela de sanções de leis
            da Câmara (ou aparecem nela com dados que não conferem):
            <Cita n={ambas} />
          </p>
          <ul className="prosa">
            {faltam.map((x) => (
              <li key={x.rotulo}>
                {x.rotulo}: {x.faixas.map(fx).join(", ")}.
              </li>
            ))}
          </ul>
        </Secao>
      )}
    </Artigo>
  );
}
