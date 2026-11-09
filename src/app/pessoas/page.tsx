import type { Metadata } from "next";
import { Busca } from "@/components/busca";
import { LinkPagina } from "@/components/artigo";
import { emOsasco, pessoas, venceu } from "@/lib/dados";
import { instituicao, ordemCargo } from "@/lib/cargos";

export const metadata: Metadata = { title: "Pessoas" };

export default function Pessoas() {
  const lista = [...pessoas().values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return (
    <div>
      <h1 className="titulo text-4xl">Pessoas</h1>
      <p className="mt-2 max-w-2xl">
        Tem página quem venceu alguma eleição em Osasco desde 1996, quem disputou a Prefeitura (como titular ou vice) e quem já tem texto escrito. As demais
        candidaturas aparecem nas páginas de cada eleição.
      </p>
      <div className="mt-6">
        <Busca paginas={lista.map((p) => ({ caminho: `pessoas/${p.id}`, titulo: p.nome, tipo: "Pessoa" }))} rotulo="Buscar pessoa" />
      </div>
      <table className="tabela mt-8">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Venceu para, em Osasco</th>
            <th>Eleições</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((p) => {
            const vit = [...new Set(p.candidaturas.filter((c) => emOsasco(c) && venceu(c)).sort((a, b) => ordemCargo(a.cargo) - ordemCargo(b.cargo)).map((c) => instituicao(c).replace(" de Osasco", "")))];
            const anos = p.candidaturas.map((c) => c.ano);
            return (
              <tr key={p.id}>
                <td>
                  <LinkPagina caminho={`pessoas/${p.id}`} />
                </td>
                <td>{vit.join("; ") || "—"}</td>
                <td className="whitespace-nowrap">{anos.length ? (anos[0] === anos.at(-1) ? anos[0] : `${anos[0]}–${anos.at(-1)}`) : "antes de 1996"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
