"use client";
// Busca por nome em todas as páginas do arquivo. A lista vem pronta da montagem do site; a busca acontece no aparelho.
import Link from "next/link";
import { useMemo, useState } from "react";

type Pagina = { caminho: string; titulo: string; tipo: string };

const dobra = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

export function Busca({ paginas, rotulo = "Buscar no arquivo" }: { paginas: Pagina[]; rotulo?: string }) {
  const [q, setQ] = useState("");
  const achadas = useMemo(() => {
    const t = dobra(q.trim());
    if (t.length < 2) return [];
    return paginas.filter((p) => dobra(p.titulo).includes(t)).slice(0, 30);
  }, [q, paginas]);
  return (
    <div>
      <label className="mb-1 block font-bold" htmlFor="busca">
        {rotulo}
      </label>
      <input
        id="busca"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Nome, partido ou ano"
        className="w-full max-w-xl rounded-md border border-tinta-suave px-3 py-2 text-base"
        autoComplete="off"
      />
      {q.trim().length >= 2 && (
        <ul className="mt-3 max-w-xl divide-y divide-fio" aria-live="polite">
          {achadas.length === 0 && <li className="py-2 text-tinta-suave">Nada encontrado.</li>}
          {achadas.map((p) => (
            <li key={p.caminho} className="flex justify-between gap-4 py-2">
              <Link className="link" href={`/${p.caminho}/`}>
                {p.titulo}
              </Link>
              <span className="shrink-0 text-sm text-tinta-suave">{p.tipo}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
