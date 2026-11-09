import type { Metadata } from "next";
import { LinkPagina } from "@/components/artigo";
import { partidos, siglaExibida, temPaginaPartido } from "@/lib/dados";

export const metadata: Metadata = { title: "Partidos" };

export default function Partidos() {
  const lista = [...partidos().values()].filter(temPaginaPartido).sort((a, b) => siglaExibida(a).localeCompare(siglaExibida(b), "pt-BR"));
  return (
    <div>
      <h1 className="titulo text-4xl">Partidos</h1>
      <p className="mt-2 max-w-2xl">Siglas com candidatura nas eleições municipais de Osasco desde 1996, de acordo com o Tribunal Superior Eleitoral.</p>
      <table className="tabela mt-8">
        <thead>
          <tr>
            <th>Sigla</th>
            <th>Nome</th>
            <th>Eleições em Osasco</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((p) => (
            <tr key={p.id}>
              <td>
                <LinkPagina caminho={`partidos/${p.id}`} />
              </td>
              <td>{p.nome}</td>
              <td>{p.anos.length ? (p.anos.length === 1 ? p.anos[0] : `${p.anos[0]}–${p.anos.at(-1)}`) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
