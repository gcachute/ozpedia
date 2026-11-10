import type { Metadata } from "next";
import { fontes, type Fonte } from "@/lib/fontes";
import { dataPorExtenso, numero } from "@/lib/texto";
import { Figura } from "@/components/artigo";
import { imagemPagina } from "@/lib/imagens";

export const metadata: Metadata = { title: "Todas as fontes" };

function Item({ f }: { f: Fonte }) {
  return (
    <li className="border-t border-fio pt-3">
      {f.autor}. {f.url ? <a className="link" href={f.url}>{f.titulo}</a> : f.titulo}
      {f.data && `, ${dataPorExtenso(f.data)}`}.{f.nota && ` ${f.nota}`}
      {f.consultado && <span className="text-tinta-suave"> Consultado em {dataPorExtenso(f.consultado)}.</span>}
    </li>
  );
}

export default function Fontes() {
  const todas = [...fontes().values()];
  const ordem = (a: Fonte, b: Fonte) => a.autor.localeCompare(b.autor, "pt-BR") || a.titulo.localeCompare(b.titulo, "pt-BR");
  const sessoes = todas.filter((f) => f.id.startsWith("camara-sessao-")).sort((a, b) => b.id.localeCompare(a.id));
  const perfis = todas.filter((f) => f.id.startsWith("camara-perfil-")).sort(ordem);
  const demais = todas.filter((f) => !f.id.startsWith("camara-sessao-") && !f.id.startsWith("camara-perfil-")).sort(ordem);
  return (
    <div>
      <h1 className="titulo text-4xl">Todas as fontes</h1>
      <Figura imagem={imagemPagina("fontes")} />
      <p className="mt-2 max-w-2xl">Documentos e bases de dados de onde vêm as informações do arquivo.</p>
      <ul className="mt-8 space-y-3">
        {demais.map((f) => (
          <Item key={f.id} f={f} />
        ))}
      </ul>
      <details className="mt-8">
        <summary className="cursor-pointer font-bold text-cidade">Perfis oficiais dos vereadores na Câmara ({perfis.length})</summary>
        <ul className="mt-3 space-y-3">
          {perfis.map((f) => (
            <Item key={f.id} f={f} />
          ))}
        </ul>
      </details>
      <details className="mt-4">
        <summary className="cursor-pointer font-bold text-cidade">Planilhas das sessões da Câmara ({numero(sessoes.length)})</summary>
        <ul className="mt-3 space-y-3">
          {sessoes.map((f) => (
            <Item key={f.id} f={f} />
          ))}
        </ul>
      </details>
    </div>
  );
}
