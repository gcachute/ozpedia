import type { Metadata } from "next";
import { fontes } from "@/lib/fontes";
import { dataPorExtenso } from "@/lib/texto";

export const metadata: Metadata = { title: "Todas as fontes" };

export default function Fontes() {
  const lista = [...fontes().values()].sort((a, b) => a.autor.localeCompare(b.autor, "pt-BR") || a.titulo.localeCompare(b.titulo, "pt-BR"));
  return (
    <div>
      <h1 className="titulo text-4xl">Todas as fontes</h1>
      <p className="mt-2 max-w-2xl">Documentos e bases de dados de onde vêm as informações do arquivo.</p>
      <ul className="mt-8 space-y-3">
        {lista.map((f) => (
          <li key={f.id} className="border-t border-fio pt-3">
            {f.autor}. {f.url ? <a className="link" href={f.url}>{f.titulo}</a> : f.titulo}
            {f.data && `, ${dataPorExtenso(f.data)}`}.{f.nota && ` ${f.nota}`}
            {f.consultado && <span className="text-tinta-suave"> Consultado em {dataPorExtenso(f.consultado)}.</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
