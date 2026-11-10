"use client";
// Filtro de tabela longa: esconde as linhas que não têm o texto digitado (procura no atributo data-busca de cada linha).
import { useEffect, useState } from "react";

const dobra = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

export function Filtro({ alvo, rotulo }: { alvo: string; rotulo: string }) {
  const [q, setQ] = useState("");
  const [vistas, setVistas] = useState<number | null>(null);
  useEffect(() => {
    const linhas = document.querySelectorAll<HTMLTableRowElement>(`#${alvo} tbody tr`);
    const t = dobra(q.trim());
    let n = 0;
    linhas.forEach((tr) => {
      const mostra = !t || dobra(tr.dataset.busca ?? tr.textContent ?? "").includes(t);
      tr.hidden = !mostra;
      if (mostra) n++;
    });
    setVistas(t ? n : null);
  }, [q, alvo]);
  return (
    <div>
      <label className="mb-1 block font-bold" htmlFor={`filtro-${alvo}`}>
        {rotulo}
      </label>
      <input
        id={`filtro-${alvo}`}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full max-w-xl rounded-md border border-tinta-suave px-3 py-2 text-base"
        autoComplete="off"
      />
      {vistas != null && (
        <p className="mt-1 text-sm text-tinta-suave" aria-live="polite">
          {vistas === 1 ? "1 resultado" : `${vistas} resultados`}
        </p>
      )}
    </div>
  );
}
