"use client";
// "Sugerir uma correção": janela com o pedido. Ao enviar, abre em outra aba a lista pública de pedidos da OZpédia
// (issues do repositório gcachute/ozpedia), com o título e o texto já preenchidos; quem envia faz um cadastro gratuito lá.
// A OZpédia é separada do De Olho em OZ desde 10/11/2026 e não tem serviço próprio de envio.
// Os textos da janela não usam termos de programação.
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

const LISTA_PUBLICA = "https://github.com/gcachute/ozpedia/issues/new";
type Estado = { tipo: "editando" } | { tipo: "aberto"; url: string };

export function SugerirCorrecao({ pagina }: { pagina: string }) {
  const janela = useRef<HTMLDialogElement>(null);
  const origem = useRef("");
  const [estado, setEstado] = useState<Estado>({ tipo: "editando" });
  const [campos, setCampos] = useState({ titulo: "", descricao: "", fonte: "" });
  const [montado, setMontado] = useState(false);
  const tituloId = useId();
  useEffect(() => setMontado(true), []);
  const muda = (k: keyof typeof campos) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setCampos({ ...campos, [k]: e.target.value });
  const nomePagina = `OZpédia: ${pagina}`.slice(0, 300);

  const abrir = () => {
    origem.current = window.location.href.split("#")[0];
    if (estado.tipo !== "editando") setEstado({ tipo: "editando" });
    janela.current?.showModal();
  };

  const linkLista = () =>
    `${LISTA_PUBLICA}?${new URLSearchParams({
      title: campos.titulo.slice(0, 120),
      body: [`**Página:** ${nomePagina}`, `**Onde conferir:** ${campos.fonte || "não informado"}`, `**Enviado de:** ${origem.current}`, "", campos.descricao].join("\n"),
      labels: "correção",
    })}`;

  const enviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const url = linkLista();
    window.open(url, "_blank", "noopener");
    setEstado({ tipo: "aberto", url });
  };

  const rotulo = "block text-sm font-bold";
  const caixa = "mt-1 w-full rounded-md border border-tinta-suave bg-white px-3 py-2 text-base font-normal";
  const botao = "rounded-md px-4 py-2 font-bold";

  return (
    <>
      <button type="button" onClick={abrir} className="link cursor-pointer text-cidade underline underline-offset-2 hover:text-cidade-escura">
        Sugerir uma correção nesta página
      </button>
      {montado &&
        createPortal(
          <dialog
            ref={janela}
            aria-labelledby={tituloId}
            className="m-auto w-[min(36rem,calc(100vw-2rem))] border-t-4 border-cidade bg-white p-0 text-tinta shadow-xl backdrop:bg-tinta/50"
            onClick={(e) => e.target === janela.current && janela.current?.close()}
          >
            <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <h2 id={tituloId} className="titulo text-2xl">
                  Sugerir uma correção
                </h2>
                <button type="button" onClick={() => janela.current?.close()} className="-m-1 p-1 text-tinta-suave hover:text-tinta" aria-label="Fechar">
                  <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
                    <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <p className="mt-1 text-sm text-tinta-suave">Página: {pagina}</p>

              {estado.tipo === "aberto" ? (
                <div className="mt-4 space-y-4">
                  <p className="bg-cidade-clara p-4">
                    A lista pública de pedidos da OZpédia abriu em outra aba, com o que você escreveu já preenchido. Para registrar o pedido, confirme
                    o envio lá (pede um cadastro gratuito). Toda sugestão é conferida na fonte antes de entrar no arquivo.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a href={estado.url} target="_blank" rel="noreferrer" className={`${botao} bg-tinta text-white`}>
                      Abrir a lista de novo
                    </a>
                    <button type="button" onClick={() => setEstado({ tipo: "editando" })} className={`${botao} border border-tinta-suave`}>
                      Voltar ao pedido
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={enviar} className="mt-4 space-y-4">
                  <label className={rotulo}>
                    O que está errado ou faltando
                    <input required minLength={5} maxLength={100} value={campos.titulo} onChange={muda("titulo")} placeholder="Ex.: partido errado na eleição de 2008" className={caixa} />
                  </label>
                  <label className={rotulo}>
                    Descrição
                    <textarea
                      required
                      minLength={20}
                      maxLength={4000}
                      rows={5}
                      value={campos.descricao}
                      onChange={muda("descricao")}
                      placeholder="O que a página mostra e o que deveria mostrar."
                      className={caixa}
                    />
                  </label>
                  <label className={rotulo}>
                    Fonte para conferir <span className="font-normal text-tinta-suave">(documento, lei, jornal ou endereço do site oficial)</span>
                    <input maxLength={500} value={campos.fonte} onChange={muda("fonte")} className={caixa} />
                  </label>
                  <p className="text-sm text-tinta-suave">
                    O pedido é registrado na lista pública de pedidos da OZpédia, que abre em outra aba com o texto já preenchido (pede um cadastro
                    gratuito). O que você escrever fica visível para todos.
                  </p>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button type="button" onClick={() => janela.current?.close()} className={`${botao} border border-tinta-suave`}>
                      Cancelar
                    </button>
                    <button type="submit" className={`${botao} bg-tinta text-white`}>
                      Continuar na lista de pedidos
                    </button>
                  </div>
                </form>
              )}
            </div>
          </dialog>,
          document.body,
        )}
    </>
  );
}
