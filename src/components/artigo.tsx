// Peças comuns das páginas: o artigo com o quadro de dados ao lado, as chamadas de fonte e a lista de referências.
import Link from "next/link";
import { SugerirCorrecao } from "@/components/correcao";
import { fonte, type Referencias } from "@/lib/fontes";
import { dataPorExtenso } from "@/lib/texto";
import { href, titulo as tituloDe } from "@/lib/links";
import { partidoDe, siglaExibida, temPaginaPartido, pessoa } from "@/lib/dados";
import type { Imagem } from "@/lib/imagens";

export function Cita({ n }: { n: number | number[] }) {
  const ns = Array.isArray(n) ? n : [n];
  return (
    <>
      {ns.map((x) => (
        <sup key={x} className="ref">
          <a href={`#ref-${x}`}>[{x}]</a>
        </sup>
      ))}
    </>
  );
}

export type LinhaQuadro = { rotulo: string; valor: React.ReactNode; cita?: number | number[] };

export type ImagemQuadro = { src: string; alt: string; legenda: string; cita: number };

/** Imagem do quadro, com a chamada de referência que dá o crédito (autor, licença, endereço do arquivo). */
export const imagemParaQuadro = (refs: Referencias, img: Imagem, alt: string): ImagemQuadro => ({
  src: img.caminho,
  alt,
  legenda: img.legenda,
  cita: refs.cita(img.fonteId),
});

const caminhoImagem = (src: string) => (process.env.NEXT_PUBLIC_BASE_PATH ?? "") + src;

/** Imagem com o crédito na própria legenda, para páginas sem lista de referências. */
export function Figura({ imagem, alt }: { imagem: Imagem | null; alt?: string }) {
  if (!imagem) return null;
  const origem = imagem.pagina.includes("commons.wikimedia.org") ? "Wikimedia Commons" : "Tribunal Superior Eleitoral";
  return (
    <figure className="mb-6 w-full border-t-4 border-cidade bg-fundo-suave p-4 text-sm md:float-right md:mb-4 md:ml-8 md:w-80">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={caminhoImagem(imagem.caminho)} alt={alt ?? imagem.legenda} className="mx-auto max-h-80 w-auto" loading="lazy" />
      <figcaption className="mt-2 text-center text-xs text-tinta-suave">
        {imagem.legenda}.{" "}
        <span className="block">
          Imagem: {imagem.autor}; licença {imagem.licenca};{" "}
          <a href={imagem.pagina} target="_blank" rel="noopener noreferrer">
            {origem}
          </a>
          .
        </span>
      </figcaption>
    </figure>
  );
}

export function Quadro({ titulo, linhas, imagem }: { titulo: string; linhas: LinhaQuadro[]; imagem?: ImagemQuadro | null }) {
  if (!linhas.length && !imagem) return null;
  return (
    <aside className="mb-6 w-full border-t-4 border-cidade bg-fundo-suave p-4 text-sm md:float-right md:mb-4 md:ml-8 md:w-80" aria-label="Quadro de dados">
      <p className="titulo mb-3 text-lg leading-tight">{titulo}</p>
      {imagem && (
        <figure className="mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={caminhoImagem(imagem.src)} alt={imagem.alt} className="mx-auto max-h-80 w-auto" loading="lazy" />
          <figcaption className="mt-2 text-center text-xs text-tinta-suave">
            {imagem.legenda}
            <Cita n={imagem.cita} />
          </figcaption>
        </figure>
      )}
      <dl className="grid gap-y-2">
        {linhas.map((l, i) => (
          <div key={i} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 border-t border-fio pt-2 first:border-0 first:pt-0">
            <dt className="font-bold">{l.rotulo}</dt>
            <dd>
              {l.valor}
              {l.cita != null && <Cita n={l.cita} />}
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

export function Artigo({
  tipo,
  titulo,
  subtitulo,
  quadro,
  refs,
  children,
}: {
  tipo: string;
  titulo: string;
  subtitulo?: React.ReactNode;
  quadro?: React.ReactNode;
  refs: Referencias;
  children: React.ReactNode;
}) {
  return (
    <article>
      <p className="text-sm text-tinta-suave">{tipo}</p>
      <h1 className="titulo mb-1 text-4xl leading-tight sm:text-5xl">{titulo}</h1>
      {subtitulo && <p className="mb-6 text-tinta-suave">{subtitulo}</p>}
      <div className="mt-6 flow-root">
        {quadro}
        {children}
      </div>
      <ListaReferencias refs={refs} />
      <p className="clear-both mt-8 border-t border-fio pt-4 text-sm">
        Viu algo errado ou sem fonte? <SugerirCorrecao pagina={titulo} />
      </p>
    </article>
  );
}

export function Secao({ titulo, children, id }: { titulo: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="mt-8 clear-none">
      <h2 className="titulo mb-3 border-t border-fio pt-3 text-2xl">{titulo}</h2>
      {children}
    </section>
  );
}

export function ListaReferencias({ refs }: { refs: Referencias }) {
  if (!refs.ids.length) return null;
  return (
    <section className="clear-both mt-10 border-t border-fio pt-3">
      <h2 className="titulo mb-3 text-2xl">Referências</h2>
      <ol className="list-decimal space-y-2 pl-6 text-sm">
        {refs.ids.map((id, i) => {
          const f = fonte(id);
          return (
            <li key={id} id={`ref-${i + 1}`}>
              {f.autor}. {f.url ? <a className="link" href={f.url}>{f.titulo}</a> : f.titulo}
              {f.data && `, ${dataPorExtenso(f.data)}`}.{f.nota && ` ${f.nota}`}
              {f.consultado && <span className="text-tinta-suave"> Consultado em {dataPorExtenso(f.consultado)}.</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// Link para outra página do arquivo, com o título dela.
export function LinkPagina({ caminho, children }: { caminho: string; children?: React.ReactNode }) {
  const t = tituloDe(caminho);
  if (t == null) throw new Error(`Link para página que não existe: ${caminho}`);
  return (
    <Link className="link" href={href(caminho)}>
      {children ?? t}
    </Link>
  );
}

// Nome da pessoa com link quando ela tem página.
export function NomePessoa({ id, nome }: { id: string; nome: string }) {
  return pessoa(id) ? <LinkPagina caminho={`pessoas/${id}`}>{nome}</LinkPagina> : <>{nome}</>;
}

// Sigla do partido com link quando ele tem página.
export function SiglaPartido({ sigla, ano }: { sigla: string | null; ano: number }) {
  const p = partidoDe(sigla, ano);
  if (!p) return <>{sigla ?? ""}</>;
  const texto = siglaExibida(p);
  return temPaginaPartido(p) ? <LinkPagina caminho={`partidos/${p.id}`}>{texto}</LinkPagina> : <>{texto}</>;
}

export function TextoEscrito({ html }: { html: string }) {
  return <div className="prosa" dangerouslySetInnerHTML={{ __html: html }} />;
}
