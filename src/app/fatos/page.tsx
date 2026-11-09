import type { Metadata } from "next";
import { LinkPagina } from "@/components/artigo";
import { escritas } from "@/lib/conteudo";
import { dataPorExtenso } from "@/lib/texto";

export const metadata: Metadata = { title: "Fatos" };

export default function Fatos() {
  const lista = [...escritas("fatos")].sort((a, b) => (a.cab.quando ?? "").localeCompare(b.cab.quando ?? ""));
  return (
    <div>
      <h1 className="titulo text-4xl">Fatos</h1>
      <p className="mt-2 max-w-2xl">Episódios da política de Osasco, em ordem de data.</p>
      <ul className="mt-8 divide-y divide-fio">
        {lista.map((f) => (
          <li key={f.id} className="flex flex-wrap justify-between gap-x-6 py-2">
            <LinkPagina caminho={`fatos/${f.id}`} />
            <span className="text-tinta-suave">{dataPorExtenso(f.cab.quando)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
