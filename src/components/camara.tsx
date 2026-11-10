// Peças das páginas que mostram o que passou pela Câmara: leis, vetos e projetos, cada um com o link para a planilha
// da sessão em que foi lido.
import { LinkPagina, NomePessoa } from "@/components/artigo";
import { idLei, nomeProjeto, nomeSessao, resumoSemAutoria, sessao, TIPOS_PROJETO, type Lei, type Projeto, type Veto } from "@/lib/camara";
import { pessoa } from "@/lib/dados";
import { numero } from "@/lib/texto";

export function LinkSessao({ id }: { id: string }) {
  const s = sessao(id);
  if (!s) return null;
  return (
    <a className="link" href={s.url}>
      {nomeSessao(s)}
    </a>
  );
}

export function Autoria({ autores, autorTexto }: { autores: string[]; autorTexto?: string | null }) {
  if (autorTexto === "Prefeitura") return <LinkPagina caminho="prefeitura" />;
  if (!autores.length) return <>não identificada</>;
  return (
    <>
      {autores.map((a, i) => (
        <span key={a}>
          {i > 0 && (i === autores.length - 1 ? " e " : ", ")}
          <NomePessoa id={a} nome={pessoa(a)?.nome ?? a} />
        </span>
      ))}
    </>
  );
}

const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function TabelaLeis({ leis, comAutoria = true }: { leis: Lei[]; comAutoria?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="tabela">
        <thead>
          <tr>
            <th>Lei</th>
            <th>Data</th>
            {comAutoria && <th>Autoria</th>}
            <th>O que diz o texto lido na sessão</th>
          </tr>
        </thead>
        <tbody>
          {leis.map((l) => (
            <tr key={l.key}>
              <td className="whitespace-nowrap">
                <LinkPagina caminho={`leis/${idLei(l)}`}>{l.lei.replace("Lei ", "")}</LinkPagina>
              </td>
              <td className="whitespace-nowrap">{l.data}</td>
              {comAutoria && (
                <td>
                  <Autoria autores={l.autores} />
                </td>
              )}
              <td>{maiuscula(resumoSemAutoria(l.resumo))}.</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TabelaVetos({ vetos }: { vetos: Veto[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="tabela">
        <thead>
          <tr>
            <th>Veto</th>
            <th>Projeto</th>
            <th>Projeto de autoria de</th>
            <th>Assunto</th>
            <th>Lido na</th>
          </tr>
        </thead>
        <tbody>
          {vetos.map((v) => (
            <tr key={v.key}>
              <td className="whitespace-nowrap">
                {v.tipo === "total" ? "Total" : "Parcial"} nº {v.numero}
              </td>
              <td className="whitespace-nowrap">{v.projeto}</td>
              <td>
                <Autoria autores={v.autores} />
              </td>
              <td>{maiuscula(resumoSemAutoria(v.resumo))}.</td>
              <td>
                <LinkSessao id={v.sessao} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Lista de projetos; com muitos itens, fica fechada e abre ao tocar.
export function TabelaProjetos({ projetos, comAutoria = true, resumo }: { projetos: Projeto[]; comAutoria?: boolean; resumo?: string }) {
  const tabela = (
    <div className="mt-3 overflow-x-auto">
      <table className="tabela">
        <thead>
          <tr>
            <th>Projeto</th>
            {comAutoria && <th>Autoria</th>}
            <th>Ementa</th>
            <th>Lido na</th>
          </tr>
        </thead>
        <tbody>
          {projetos.map((p) => (
            <tr key={p.key}>
              <td className="whitespace-nowrap" title={TIPOS_PROJETO[p.tipo] ?? p.tipo}>
                {nomeProjeto(p)}
              </td>
              {comAutoria && (
                <td>
                  <Autoria autores={p.autores} autorTexto={p.autorTexto} />
                </td>
              )}
              <td>{p.ementa}</td>
              <td>
                <LinkSessao id={p.sessao} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  if (projetos.length <= 8) return tabela;
  return (
    <details>
      <summary className="cursor-pointer font-bold text-cidade">{resumo ?? `Ver as ${numero(projetos.length)} proposições`}</summary>
      {tabela}
    </details>
  );
}
