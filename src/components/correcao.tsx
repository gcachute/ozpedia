"use client";
// "Sugerir uma correção": janela com o pedido, enviado para o mesmo serviço do De Olho em OZ (deolhoemoz.com.br/api/correcao,
// a função functions/api/correcao.js do repositório avalia-osasco), que registra o pedido na lista pública do projeto.
// O endereço é absoluto (sem o prefixo /arquivo) porque a OZpédia mora dentro do mesmo domínio.
// Na máquina, sem esse serviço, o envio falha e a janela oferece a lista pública de pedidos.
// Os textos da janela não usam termos de programação.
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

const ENVIO = "/api/correcao";
const LISTA_PUBLICA = "https://github.com/gcachute/avalia-osasco/issues/new";
type Estado = { tipo: "editando" } | { tipo: "enviando" } | { tipo: "ok"; numero: number; url: string } | { tipo: "erro"; mensagem: string };

export function SugerirCorrecao({ pagina }: { pagina: string }) {
  const janela = useRef<HTMLDialogElement>(null);
  const aberto = useRef(0);
  const origem = useRef("");
  const [estado, setEstado] = useState<Estado>({ tipo: "editando" });
  const [campos, setCampos] = useState({ titulo: "", descricao: "", fonte: "" });
  const [montado, setMontado] = useState(false);
  const tituloId = useId();
  useEffect(() => setMontado(true), []);
  const muda = (k: keyof typeof campos) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setCampos({ ...campos, [k]: e.target.value });
  const nomePagina = `OZpédia: ${pagina}`.slice(0, 300);

  const abrir = () => {
    aberto.current = Date.now();
    origem.current = window.location.href.split("#")[0];
    if (estado.tipo !== "editando") setEstado({ tipo: "editando" });
    janela.current?.showModal();
  };

  const linkLista = () =>
    `${LISTA_PUBLICA}?${new URLSearchParams({
      title: `[OZpédia] ${campos.titulo}`,
      body: [`**Página:** ${nomePagina}`, `**Onde conferir:** ${campos.fonte || "não informado"}`, `**Enviado de:** ${origem.current}`, "", campos.descricao].join("\n"),
      labels: "correção",
    })}`;

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEstado({ tipo: "enviando" });
    try {
      const site = (e.currentTarget.elements.namedItem("site") as HTMLInputElement | null)?.value ?? "";
      const r = await fetch(ENVIO, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: `[OZpédia] ${campos.titulo}`.slice(0, 120),
          descricao: campos.descricao,
          fonte: campos.fonte,
          pagina: nomePagina,
          origem: origem.current.slice(0, 300),
          site,
          aberto: aberto.current,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.url) {
        setEstado({ tipo: "ok", numero: d.numero, url: d.url });
        setCampos({ titulo: "", descricao: "", fonte: "" });
      } else setEstado({ tipo: "erro", mensagem: d.erro ?? "Não foi possível enviar agora." });
    } catch {
      setEstado({ tipo: "erro", mensagem: "Não foi possível enviar agora. Confira sua internet e tente de novo." });
    }
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

              {estado.tipo === "ok" ? (
                <div className="mt-4 space-y-4">
                  <p className="bg-cidade-clara p-4">
                    Pedido nº {estado.numero} registrado. Obrigado! Toda sugestão é conferida na fonte antes de entrar no arquivo.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <a href={estado.url} target="_blank" rel="noreferrer" className={`${botao} bg-tinta text-white`}>
                      Acompanhar o pedido
                    </a>
                    <button type="button" onClick={() => setEstado({ tipo: "editando" })} className={`${botao} border border-tinta-suave`}>
                      Enviar outro
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
                  {/* Campo que pessoas não veem e robôs preenchem. */}
                  <input type="text" name="site" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-px w-px opacity-0" />
                  {estado.tipo === "erro" && (
                    <p className="bg-fundo-suave p-3 text-sm" role="alert">
                      {estado.mensagem} Se preferir,{" "}
                      <a href={linkLista()} target="_blank" rel="noreferrer" className="link font-bold">
                        envie pela lista pública de pedidos
                      </a>{" "}
                      (pede um cadastro gratuito; o que você escreveu já vai junto).
                    </p>
                  )}
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button type="button" onClick={() => janela.current?.close()} className={`${botao} border border-tinta-suave`}>
                      Cancelar
                    </button>
                    <button type="submit" disabled={estado.tipo === "enviando"} className={`${botao} bg-tinta text-white disabled:opacity-60`}>
                      {estado.tipo === "enviando" ? "Enviando…" : "Enviar sugestão"}
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
