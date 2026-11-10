import Link from "next/link";
import { Busca } from "@/components/busca";
import { eleicoes, partidos, pessoas, temPaginaPartido, legislaturas } from "@/lib/dados";
import { escritas } from "@/lib/conteudo";
import { CAMARA } from "@/lib/camara";
import { todasAsPaginas } from "@/lib/links";
import { numero } from "@/lib/texto";
import { Figura } from "@/components/artigo";
import { imagemPagina } from "@/lib/imagens";

export default function Inicio() {
  const secoes = [
    { href: "/pessoas/", titulo: "Pessoas", n: pessoas().size, texto: "Quem venceu eleição em Osasco, disputou a Prefeitura ou exerceu mandato na Câmara." },
    { href: "/partidos/", titulo: "Partidos", n: [...partidos().values()].filter(temPaginaPartido).length, texto: "Siglas que tiveram candidatura em Osasco, com mudanças de nome, fusões e incorporações." },
    { href: "/eleicoes/", titulo: "Eleições", n: eleicoes().length, texto: "Eleições municipais, com candidaturas, votos e resultados." },
    { href: "/camara/", titulo: "Câmara Municipal", n: legislaturas().length, texto: "Legislaturas e a composição eleita de cada uma." },
    { href: "/prefeitura/", titulo: "Prefeitura", n: null, texto: "Quem venceu cada eleição para prefeito e vice." },
    { href: "/leis/", titulo: "Leis e projetos", n: CAMARA.leis.length + escritas("leis").length, texto: "Leis sancionadas, vetos e proposições lidas nas sessões da Câmara." },
    { href: "/fatos/", titulo: "Fatos", n: escritas("fatos").length, texto: "Episódios da política da cidade, escritos com as fontes." },
  ];
  return (
    <div>
      <h1 className="titulo text-4xl leading-tight sm:text-5xl">
        OZ<span className="text-cidade">pédia</span>
      </h1>
      <Figura imagem={imagemPagina("inicio")} />
      <p className="mt-2 max-w-2xl text-lg">
        Arquivo da política de Osasco: pessoas, partidos, eleições, legislaturas e fatos, ligados entre si e com a fonte de cada informação.
      </p>
      <div className="mt-8">
        <Busca paginas={todasAsPaginas()} />
      </div>
      <ul className="mt-10 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
        {secoes.map((s) => (
          <li key={s.href} className="border-t border-fio pt-3">
            <Link href={s.href} className="titulo text-2xl text-tinta hover:text-cidade">
              {s.titulo}
            </Link>
            {s.n != null && <span className="ml-2 text-tinta-suave">{numero(s.n)} páginas</span>}
            <p className="mt-1 text-[0.95rem]">{s.texto}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
