import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Artigo, Cita, LinkPagina, NomePessoa, Quadro, Secao, TextoEscrito, type LinhaQuadro, imagemParaQuadro } from "@/components/artigo";
import { Autoria, LinkSessao } from "@/components/camara";
import { CAMARA, idLei, leiPorId, nomeProjeto, projetoDeOrigem, resumoSemAutoria, TIPOS_PROJETO } from "@/lib/camara";
import { escrita, escritas } from "@/lib/conteudo";
import { Referencias } from "@/lib/fontes";
import { imagemPagina } from "@/lib/imagens";
import { autoresDe, cargoAssinatura, fonteEdicao, idLeiIomo, leiIomo, leisIomo, quemAssinou } from "@/lib/leis";
import { titulo as tituloPagina } from "@/lib/links";
import { autoresSancao, ehMesa, ehPrefeitura, FONTE_SANCOES, idLeiCamara, leiSoCamara, leisSoCamara, sancaoDaLei, textoVeto, vetoDe, type Sancao } from "@/lib/sancoes";
import { markdown } from "@/lib/markdown";
import { pessoa } from "@/lib/dados";
import { dataPorExtenso } from "@/lib/texto";

type Props = { params: Promise<{ id: string }> };

// Página de lei: as publicadas na Imprensa Oficial do Município, as comunicadas nas sessões da Câmara e as escritas à mão.
export const generateStaticParams = () =>
  [...new Set([...CAMARA.leis.map(idLei), ...leisIomo().map(idLeiIomo), ...leisSoCamara().map(idLeiCamara), ...escritas("leis").map((e) => e.id)])].map((id) => ({ id }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = (await params).id;
  return { title: tituloPagina(`leis/${id}`) ?? "Lei" };
}

const minuscula = (s: string) => (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);

// Texto publicado: parágrafos separados por linha em branco ou começando em "Art.", "§", "Parágrafo", "I –"...
function paragrafos(texto: string) {
  const saida: string[] = [];
  for (const linha of texto.split("\n")) {
    const t = linha.trim();
    if (!t) {
      if (saida.at(-1) !== "") saida.push("");
      continue;
    }
    const novo = /^(Art\.|§|Parágrafo|[IVXLC]+\s*[–—-]|[a-z]\)|Osasco,|FAZ SABER|CAPÍTULO|SEÇÃO|TÍTULO|ANEXO)/.test(t);
    if (novo || saida.length === 0 || saida.at(-1) === "") saida.push(t);
    else saida[saida.length - 1] += " " + t;
  }
  return saida.filter(Boolean).map((p) => p.replace(/(\p{Ll}) ?- (\p{Ll})/gu, "$1$2"));
}

export default async function PaginaLei({ params }: Props) {
  const { id } = await params;
  const l = leiPorId(id);
  const io = leiIomo(id);
  const e = escrita("leis", id);
  const cam = !io ? leiSoCamara(id) : null;
  if (!l && !io && !e && !cam) notFound();
  const refs = new Referencias();
  const imgPagina = imagemPagina(`leis/${id}`, "lei");
  const imagemQ = imgPagina ? imagemParaQuadro(refs, imgPagina, imgPagina.legenda) : null;
  const titulo = tituloPagina(`leis/${id}`) ?? e?.cab.titulo ?? id;
  const linhas: LinhaQuadro[] = [];
  const nIo = io ? refs.cita(fonteEdicao(io)) : 0;
  const nSessao = l ? refs.cita(`camara-sessao-${l.sessao}`) : 0;

  // Linha da tabela de sanções da Câmara: completa a autoria quando a Imprensa Oficial não traz, e registra veto parcial.
  const san: Sancao | null = io ? sancaoDaLei(io) : cam?.sancao ?? null;
  const nSan = san ? refs.cita(FONTE_SANCOES) : 0;
  const vetoSan = san ? vetoDe(san) : null;
  const autoresSan = san ? autoresSancao(san) : [];
  const autores = io ? autoresDe(io) : [];
  const assinou = io ? quemAssinou(io) : null;
  const origemSessao = l ? projetoDeOrigem(l) : null;
  const nOrigem = origemSessao ? refs.cita(`camara-sessao-${origemSessao.sessao}`) : 0;

  if (io || l) linhas.push({ rotulo: "Número", valor: (io?.lei ?? l!.lei).replace(/^Lei (Complementar )?/, ""), cita: io ? nIo : nSessao });
  if (io?.complementar) linhas.push({ rotulo: "Tipo", valor: "Lei complementar", cita: nIo });
  if (io || l) linhas.push({ rotulo: "Data", valor: io ? dataPorExtenso(io.data) : l!.data, cita: io ? nIo : nSessao });
  if (io?.projeto || origemSessao)
    linhas.push({
      rotulo: "Projeto de origem",
      valor: io?.projeto ? `${io.complementar ? "PLC" : "PL"} ${io.projeto.numero}/${io.projeto.ano}` : nomeProjeto(origemSessao!),
      cita: io?.projeto ? nIo : nOrigem,
    });
  if (l?.autores.length || autores.length)
    linhas.push({ rotulo: "Autoria", valor: <Autoria autores={l?.autores.length ? l.autores : autores} />, cita: l?.autores.length ? nSessao : nIo });
  else if (io?.autoriaTexto) linhas.push({ rotulo: "Autoria", valor: io.autoriaTexto, cita: nIo });
  else if (san && (autoresSan.length || ehPrefeitura(san) || ehMesa(san)))
    linhas.push({
      rotulo: "Autoria",
      valor: autoresSan.length ? <Autoria autores={autoresSan} /> : ehPrefeitura(san) ? <LinkPagina caminho="prefeitura" /> : "Mesa Diretora da Câmara",
      cita: nSan,
    });
  if (cam) {
    linhas.unshift(
      { rotulo: "Número", valor: cam.numero.toLocaleString("pt-BR"), cita: nSan },
      ...(cam.complementar ? [{ rotulo: "Tipo", valor: "Lei complementar", cita: nSan }] : []),
      { rotulo: cam.data ? "Data" : "Ano", valor: cam.data ? dataPorExtenso(cam.data) : String(cam.ano), cita: nSan },
    );
    if (cam.sancao.projeto) linhas.push({ rotulo: "Projeto de origem", valor: /^\d/.test(cam.sancao.projeto) ? `${cam.complementar ? "PLC" : "PL"} ${cam.sancao.projeto}` : cam.sancao.projeto, cita: nSan });
  }
  if (vetoSan && !io?.vetoRejeitado) linhas.push({ rotulo: "Veto", valor: textoVeto(vetoSan), cita: nSan });
  if (io)
    linhas.push({
      rotulo: /Presidente/i.test(io.assinatura.cargo) ? "Promulgada por" : "Sancionada por",
      valor: assinou ? <NomePessoa id={assinou} nome={pessoa(assinou)!.nome} /> : io.assinatura.nome,
      cita: nIo,
    });
  if (io) linhas.push({ rotulo: "Publicação", valor: `Imprensa Oficial nº ${io.edicao.numero}, ${dataPorExtenso(io.edicao.data)}`, cita: nIo });
  if (l) linhas.push({ rotulo: "Sanção comunicada na", valor: <LinkSessao id={l.sessao} />, cita: nSessao });
  if (e?.cab.quando) linhas.push({ rotulo: "Data", valor: dataPorExtenso(e.cab.quando), cita: e.cab.fonteQuando ? refs.cita(e.cab.fonteQuando) : undefined });
  const html = e?.corpo ? markdown(e.corpo, refs) : null;

  return (
    <Artigo tipo="Lei municipal" titulo={titulo} refs={refs} quadro={<Quadro titulo={io?.lei ?? l?.lei ?? titulo} linhas={linhas} imagem={imagemQ} />}>
      <div className="prosa">
        {io ? (
          <p>
            A <strong>{io.lei}</strong>, de {dataPorExtenso(io.data)}, {minuscula(io.ementa.replace(/\.$/, ""))}.
            <Cita n={nIo} /> Foi publicada na Imprensa Oficial do Município de Osasco nº {io.edicao.numero}, de {dataPorExtenso(io.edicao.data)}, com a assinatura de{" "}
            {assinou ? <NomePessoa id={assinou} nome={pessoa(assinou)!.nome} /> : io.assinatura.nome} ({cargoAssinatura(io.assinatura.cargo)}).
            <Cita n={nIo} />
            {io.vetoRejeitado && (
              <>
                {" "}
                Segundo o texto publicado, a <LinkPagina caminho="camara" /> rejeitou o {io.vetoRejeitado === "sim" ? "veto" : `veto ${io.vetoRejeitado}`} da Prefeitura ao
                projeto, e a lei foi promulgada pela Presidência da Câmara.
                <Cita n={nIo} />
              </>
            )}
            {io.dataCabecalho && (
              <>
                {" "}
                No cabeçalho publicado, a data é {dataPorExtenso(io.dataCabecalho)}; no fecho do texto, {dataPorExtenso(io.data)}.
                <Cita n={nIo} />
              </>
            )}
          </p>
        ) : (
          l && (
            <p>
              A <strong>{l.lei}</strong>, de {l.data}, {resumoSemAutoria(l.resumo)}, segundo o texto lido na <LinkSessao id={l.sessao} /> da <LinkPagina caminho="camara" />,
              que comunicou a sanção.
              <Cita n={nSessao} />
            </p>
          )
        )}
        {cam && (
          <p>
            A <strong>{cam.lei}</strong>
            {cam.data ? `, de ${dataPorExtenso(cam.data)},` : `, de ${cam.ano},`} tem como assunto: “{cam.ementa.replace(/\.$/, "")}”, segundo a tabela de sanções de leis
            da <LinkPagina caminho="camara" />
            {autoresSan.length > 0 ? (
              <>
                , que registra a autoria de <Autoria autores={autoresSan} />
              </>
            ) : ehPrefeitura(cam.sancao) ? (
              <>
                , que registra o projeto como da <LinkPagina caminho="prefeitura" />
              </>
            ) : cam.sancao.autor ? (
              `, que registra como autor “${cam.sancao.autor}”`
            ) : (
              ""
            )}
            .<Cita n={nSan} /> O texto desta lei não foi encontrado nas edições da Imprensa Oficial do Município disponíveis no site da Prefeitura.
          </p>
        )}
        {io && !autores.length && !io.autoriaTexto && autoresSan.length > 0 && (
          <p>
            Segundo a tabela de sanções de leis da <LinkPagina caminho="camara" />, o projeto foi de autoria de <Autoria autores={autoresSan} />.
            <Cita n={nSan} />
          </p>
        )}
        {io?.referendos && io.referendos.length > 0 && (
          <p>
            Assinaram também:{" "}
            {io.referendos.map((r, i) => (
              <span key={r.nome}>
                {i > 0 && (i === io.referendos!.length - 1 ? " e " : ", ")}
                {r.nome} ({r.cargo})
              </span>
            ))}
            .<Cita n={nIo} />
          </p>
        )}
        {io?.projeto && (
          <p>
            Teve origem no {io.complementar ? "projeto de lei complementar" : "projeto de lei"} nº {io.projeto.numero}/{io.projeto.ano}
            {autores.length ? (
              <>
                , de autoria de <Autoria autores={autores} />
              </>
            ) : io.autoriaTexto ? (
              `, de autoria ${/^(d[oa]s?) /i.test(io.autoriaTexto) ? "" : "de "}${io.autoriaTexto}`
            ) : (
              ""
            )}
            .<Cita n={nIo} />
          </p>
        )}
        {!io?.projeto && origemSessao && (
          <p>
            Projeto de origem: {(TIPOS_PROJETO[origemSessao.tipo] ?? origemSessao.tipo).toLowerCase()} nº {origemSessao.numero}/{origemSessao.ano}, lido na{" "}
            <LinkSessao id={origemSessao.sessao} />, com a mesma autoria e a ementa “{origemSessao.ementa.replace(/\.$/, "")}”.
            <Cita n={nOrigem} />
          </p>
        )}
        {io && l && (
          <p>
            A sanção foi comunicada na <LinkSessao id={l.sessao} /> da <LinkPagina caminho="camara" />.
            <Cita n={nSessao} />
          </p>
        )}
      </div>
      {html && <TextoEscrito html={html} />}
      {io && !html && io.texto && (
        <Secao titulo="Texto publicado">
          <div className="prosa text-[0.95rem]">
            {paragrafos(io.texto).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            <p className="text-sm text-tinta-suave">
              Transcrito da Imprensa Oficial do Município de Osasco nº {io.edicao.numero}.<Cita n={nIo} />{" "}
              {io.edicao.data < "2015"
                ? "A edição é diagramada em colunas, lidas uma a uma: palavras e trechos podem sair fora do lugar ou faltar; o original está no endereço da referência."
                : "Tabelas e anexos podem aparecer desalinhados; o original está no endereço da referência."}
            </p>
          </div>
        </Secao>
      )}
      <p className="mt-6 text-sm text-tinta-suave">
        Outras leis em <LinkPagina caminho="leis">Leis e projetos</LinkPagina>.
      </p>
    </Artigo>
  );
}
