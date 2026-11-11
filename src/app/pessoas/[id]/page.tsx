import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Artigo, Cita, imagemParaQuadro, LinkPagina, Quadro, Secao, SiglaPartido, TextoEscrito, type LinhaQuadro } from "@/components/artigo";
import { TabelaLeis, TabelaProjetos, TabelaVetos } from "@/components/camara";
import { CAMARA, leisDe, perfilCamara, projetosDe, vetosDe } from "@/lib/camara";
import { escrita, escritas } from "@/lib/conteudo";
import { TabelaConvocacoes } from "@/components/convocacoes";
import { convocacoesDe, licencasDe } from "@/lib/convocacoes";
import { EXERCERAM, ANOS_MUNICIPAIS, mandatosCamara, chavePartido, emOsasco, partidoDe, pessoa, pessoas, rotuloResultado, siglaExibida, venceu } from "@/lib/dados";
import { Referencias } from "@/lib/fontes";
import { sucessaoPrefeitura } from "@/lib/prefeitos";
import { fonteEdicao, homenagensA, idLeiIomo, leiIomo, leisAssinadasPor } from "@/lib/leis";
import { anoSancao, FONTE_SANCOES, leisDeAutoriaTodas, textoVeto, vetadosDeAutoria, vetoDe } from "@/lib/sancoes";
import { Autoria as AutoriaLei } from "@/components/camara";
import { imagemDe, imagemPagina } from "@/lib/imagens";
import { comArtigo, instituicao, ordemCargo } from "@/lib/cargos";
import { markdown } from "@/lib/markdown";
import { dataPorExtenso, listaE, nomeProprio, numero, slugify } from "@/lib/texto";
import { campanha2024, detalhe, lugar, minusculas, reais, semPrefixo, siglasDaComposicao } from "@/lib/detalhes";

type Props = { params: Promise<{ id: string }> };

export const generateStaticParams = () => [...pessoas().keys()].map((id) => ({ id }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = pessoa((await params).id);
  return { title: p?.nome ?? "Pessoa" };
}

export default async function PaginaPessoa({ params }: Props) {
  const { id } = await params;
  const p = pessoa(id);
  if (!p) notFound();
  const e = escrita("pessoas", id);
  const refs = new Referencias();
  const cs = p.candidaturas;
  const temTse = cs.length > 0;
  const nTse = temTse ? refs.cita("tse-trajetorias") : 0;
  const perfil = perfilCamara(id);
  const nPerfil = perfil ? refs.cita(`camara-perfil-${id}`) : 0;

  // ---------- Quadro de dados ----------
  // Foto da pessoa; sem foto, a imagem da primeira legislatura em que exerceu mandato, a da eleição de que
  // participou em Osasco ou, por fim, a imagem padrão.
  const foto = imagemDe(id);
  const semFoto = () => {
    const legs = [...mandatosCamara(id)].sort((a, b) => a.leg.inicio.localeCompare(b.leg.inicio));
    for (const m of legs) {
      const i = imagemPagina(`legislaturas/${m.leg.inicio.slice(0, 4)}-${m.leg.fim.slice(0, 4)}`);
      if (i) return i;
    }
    for (const c of [...cs].filter((c) => emOsasco(c)).sort((a, b) => b.ano - a.ano)) {
      const i = imagemPagina(`eleicoes/${c.ano}`);
      if (i) return i;
    }
    return imagemPagina("padrao/pessoa");
  };
  const img = foto ?? semFoto();
  const imagemQuadro = img ? imagemParaQuadro(refs, img, foto ? `Foto de ${p.nome}` : img.legenda) : null;
  const linhas: LinhaQuadro[] = [];
  // Cargos na Prefeitura, com antecessor e sucessor (mandatos seguidos da mesma pessoa contam como um só período).
  const sucessao = sucessaoPrefeitura();
  for (let i = 0; i < sucessao.length; i++) {
    if (sucessao[i].pessoa !== id || sucessao[i - 1]?.pessoa === id) continue;
    let j = i;
    while (sucessao[j + 1]?.pessoa === id) j++;
    const ini = sucessao[i].periodo.split(/ a |–/)[0];
    const fim = sucessao[j].periodo.split(/ a |–/).at(-1);
    const ant = sucessao[i - 1];
    const suc = sucessao[j + 1];
    linhas.push({
      rotulo: "Prefeitura de Osasco",
      valor: (
        <>
          <span className="block">{i === j ? sucessao[i].periodo.replace(" a ", " – ") : `${ini} – ${fim}`}</span>
          {ant && (
            <span className="block">
              Antecessor: {ant.pessoa ? <LinkPagina caminho={`pessoas/${ant.pessoa}`}>{ant.nome}</LinkPagina> : ant.nome}
            </span>
          )}
          {suc && (
            <span className="block">
              Sucessor: {suc.pessoa ? <LinkPagina caminho={`pessoas/${suc.pessoa}`}>{suc.nome}</LinkPagina> : suc.nome}
            </span>
          )}
        </>
      ),
      cita: [...new Set(sucessao.slice(i, j + 1).flatMap((m) => m.fontes))].map((f) => refs.cita(f)),
    });
  }
  for (const m of sucessao.filter((m) => m.vicePessoa === id))
    linhas.push({
      rotulo: "Vice-prefeitura de Osasco",
      valor: (
        <>
          <span className="block">{m.periodo.replace(" a ", " – ")}</span>
          <span className="block">Na Prefeitura: {m.pessoa ? <LinkPagina caminho={`pessoas/${m.pessoa}`}>{m.nome}</LinkPagina> : m.nome}</span>
        </>
      ),
      cita: m.fontes.map((f) => refs.cita(f)),
    });
  const urnaRecente = [...cs].reverse().find((c) => c.urna)?.urna ?? null;
  if (temTse) linhas.push({ rotulo: "Nome de urna", valor: urnaRecente ?? "", cita: nTse });
  if (perfil?.perfil.nomeCompleto) linhas.push({ rotulo: "Nome completo", valor: perfil.perfil.nomeCompleto, cita: nPerfil });
  // O que a pessoa declarou ao TSE nas candidaturas municipais em Osasco (a mais recente que tem o dado).
  const declarado = cs
    .filter(emOsasco)
    .map((c) => ({ c, d: detalhe(c.ano, c.cargo, c.numero) }))
    .filter((x) => x.d)
    .reverse();
  const ultimo = <K extends "ocupacao" | "instrucao" | "naturalidade">(k: K) => declarado.find((x) => x.d![k]);
  const natTse = ultimo("naturalidade");
  const ocuTse = ultimo("ocupacao");
  const insTse = ultimo("instrucao");
  if (perfil?.perfil.naturalidade) linhas.push({ rotulo: "Naturalidade", valor: perfil.perfil.naturalidade, cita: nPerfil });
  else if (natTse) linhas.push({ rotulo: "Naturalidade", valor: lugar(natTse.d!.naturalidade), cita: refs.cita(`tse-candidatos-${natTse.c.ano}`) });
  if (perfil?.perfil.ocupacao) linhas.push({ rotulo: "Ocupação", valor: perfil.perfil.ocupacao, cita: nPerfil });
  if (ocuTse)
    linhas.push({ rotulo: "Ocupação declarada ao TSE", valor: `${minusculas(ocuTse.d!.ocupacao)} (${ocuTse.c.ano})`, cita: refs.cita(`tse-candidatos-${ocuTse.c.ano}`) });
  if (perfil?.perfil.instrucao) linhas.push({ rotulo: "Instrução", valor: perfil.perfil.instrucao, cita: nPerfil });
  else if (insTse)
    linhas.push({ rotulo: "Escolaridade declarada ao TSE", valor: `${minusculas(insTse.d!.instrucao)} (${insTse.c.ano})`, cita: refs.cita(`tse-candidatos-${insTse.c.ano}`) });
  // Campanha de 2024: totais da prestação de contas e bens declarados.
  const c2024 = cs.find((c) => c.ano === 2024 && emOsasco(c));
  const camp = c2024 ? campanha2024(c2024.cargo, c2024.numero) : null;

  const vitorias = new Map<string, { anos: number[]; ordem: number }>();
  for (const c of cs.filter(venceu)) {
    const k = instituicao(c);
    const v = vitorias.get(k) ?? { anos: [], ordem: ordemCargo(c.cargo) };
    v.anos.push(c.ano);
    vitorias.set(k, v);
  }
  const listaVitorias = [...vitorias.entries()].sort((a, b) => a[1].ordem - b[1].ordem);
  const venceuPara: React.ReactNode[] = listaVitorias.map(([k, v]) => (
    <span key={k} className="block">
      {k} ({listaE(v.anos.map(String))})
    </span>
  ));
  if (venceuPara.length) linhas.push({ rotulo: "Venceu a eleição para", valor: venceuPara, cita: nTse });
  // Mandatos registrados em biografias e documentos (o que os dados do TSE não cobrem), cada um com a fonte.
  const prefeitoNaSucessao = sucessao.some((m) => m.pessoa === id);
  const viceNaSucessao = sucessao.some((m) => m.vicePessoa === id);
  const escritos = (e?.cab.cargos ?? [])
    .filter((c) => !(prefeitoNaSucessao && c.cargo === "Prefeitura de Osasco") && !(viceNaSucessao && c.cargo === "Vice-prefeitura de Osasco"))
    .map((c) => (
    <span key={c.cargo + (c.eleicao ?? c.periodo)} className="block">
      {c.cargo} ({c.periodo ?? `eleição de ${c.eleicao}`})
      <Cita n={refs.cita(c.fonte)} />
    </span>
  ));
  if (escritos.length) linhas.push({ rotulo: "Mandatos", valor: escritos });

  const mandatos = mandatosCamara(id);
  const nLeg = mandatos.length ? refs.cita("camara-legislaturas") : 0;
  if (mandatos.length)
    linhas.push({
      rotulo: "Câmara Municipal",
      valor: mandatos.map((m) => (
        <span key={m.leg.numero} className="block">
          <LinkPagina caminho={`legislaturas/${m.leg.inicio.slice(0, 4)}-${m.leg.fim.slice(0, 4)}`}>{`${m.leg.numero}ª Legislatura`}</LinkPagina> ({m.leg.inicio.slice(0, 4)}–{m.leg.fim.slice(0, 4)}
          {m.suplente ? ", suplente" : ""})
        </span>
      )),
      cita: nLeg,
    });
  const presidencias = mandatos.flatMap((m) => m.mesa.filter((x) => x.cargo === "Presidente").map((x) => x.inicio.slice(0, 4)));
  if (presidencias.length) linhas.push({ rotulo: "Presidência da Câmara", valor: listaE([...new Set(presidencias)]), cita: nLeg });

  // Partidos, na ordem em que aparecem, com os anos.
  const porPartido: { sigla: string; ano: number; anos: number[] }[] = [];
  for (const c of cs) {
    const k = chavePartido(c.partido, c.ano);
    const ult = porPartido.at(-1);
    if (ult && chavePartido(ult.sigla, ult.ano) === k) {
      if (!ult.anos.includes(c.ano)) ult.anos.push(c.ano);
    } else porPartido.push({ sigla: c.partido ?? "", ano: c.ano, anos: [c.ano] });
  }
  if (porPartido.length)
    linhas.push({
      rotulo: porPartido.length > 1 ? "Partidos nas candidaturas" : "Partido nas candidaturas",
      valor: porPartido.map((x, i) => (
        <span key={i} className="block">
          <SiglaPartido sigla={x.sigla} ano={x.ano} /> ({x.anos.length > 1 ? `${x.anos[0]}–${x.anos.at(-1)}` : x.anos[0]})
        </span>
      )),
      cita: nTse,
    });

  const cargosMesa = [
    ...mandatos
      .flatMap((m) => m.mesa)
      .reduce((acc, x) => {
        const anos = acc.get(x.cargo) ?? [];
        if (!anos.includes(x.inicio.slice(0, 4))) anos.push(x.inicio.slice(0, 4));
        acc.set(x.cargo, anos);
        return acc;
      }, new Map<string, string[]>())
      .entries(),
  ];

  // ---------- Câmara, legislatura atual ----------
  const leis = leisDe(id);
  const vetos = vetosDe(id);
  const projetos = projetosDe(id);
  const temCamara = leis.length + vetos.length + projetos.length > 0;
  const nSessoes = temCamara ? refs.cita("camara-sessoes") : 0;

  // ---------- Leis publicadas na Imprensa Oficial do Município ----------
  const leisAutoria = leisDeAutoriaTodas(id);
  const vetados = vetadosDeAutoria(id);
  const nSan = leisAutoria.some((l) => l.fonte === "camara") || vetados.length ? refs.cita(FONTE_SANCOES) : 0;
  const leisAssinadas = leisAssinadasPor(id);
  const nIomo = leisAutoria.some((l) => l.fonte === "iomo") || leisAssinadas.length ? refs.cita("iomo-edicoes") : 0;
  const assinadasPorAno = [...leisAssinadas.reduce((m, l) => m.set(l.data.slice(0, 4), (m.get(l.data.slice(0, 4)) ?? 0) + 1), new Map<string, number>())].sort();

  // ---------- Convocações de suplentes (atos da Presidência da Câmara) ----------
  const convocado = convocacoesDe(id);
  const substituido = licencasDe(id);
  const homenagens = homenagensA(id);
  // Páginas de fatos que citam a pessoa (link no texto ou na lista de páginas relacionadas).
  const fatos = escritas("fatos").filter(
    (f) => f.corpo.includes(`[[pessoas/${id}|`) || f.corpo.includes(`[[pessoas/${id}]]`) || f.cab.relacionados?.includes(`pessoas/${id}`),
  );

  // ---------- Texto ----------
  // Modelo de verbete: abertura e seções escritas primeiro; "Controvérsias" e "Prêmios e honrarias" depois do desempenho eleitoral.
  const corte = e?.corpo ? e.corpo.search(/^## (Controvérsias|Prêmios e honrarias)/m) : -1;
  const corpoInicio = e?.corpo ? (corte >= 0 ? e.corpo.slice(0, corte) : e.corpo) : "";
  const corpoFim = e?.corpo && corte >= 0 ? e.corpo.slice(corte) : "";
  const html = corpoInicio.trim() ? markdown(corpoInicio, refs) : null;
  const anos = [...new Set(cs.map((c) => c.ano))];
  const siglas = [...new Set(porPartido.map((x) => { const pt = partidoDe(x.sigla, x.ano); return pt ? siglaExibida(pt) : x.sigla; }))];
  const derrotas = cs.filter((c) => !venceu(c)).length;
  const periodo = `${dataPorExtenso(CAMARA.periodo.inicio)} e ${dataPorExtenso(CAMARA.periodo.fim)}`;

  const resumo = (
    <>
      {!temTse && mandatos.length > 0 && (
        <div className="prosa">
          <p>
            <strong>{p.nome}</strong> exerceu mandato na <LinkPagina caminho="camara" /> {mandatos.length === 1 ? "na" : "nas"}{" "}
            {listaE(mandatos.map((m) => `${m.leg.numero}ª`))} {mandatos.length === 1 ? "legislatura" : "legislaturas"} (
            {listaE(mandatos.map((m) => `${m.leg.inicio.slice(0, 4)}–${m.leg.fim.slice(0, 4)}`))})
            {mandatos.some((m) => m.suplente) ? `, ${mandatos.every((m) => m.suplente) ? "como suplente que assumiu a vaga" : "em parte como suplente"}` : ""}, segundo a lista
            oficial da Câmara.
            <Cita n={nLeg} />
            {cargosMesa.length > 0 && (
              <>
                {" "}
                Na Mesa Diretora, ocupou {listaE(cargosMesa.map(([c, anos]) => `o cargo de ${c.toLowerCase()} (${listaE(anos)})`))}.
                <Cita n={nLeg} />
              </>
            )}
          </p>
        </div>
      )}
      {temTse && (
        <div className="prosa">
          <p>
            <strong>{p.nome}</strong>
            {p.escrita && urnaRecente && slugify(urnaRecente) !== slugify(p.nome) ? ` (nome de urna mais recente: ${nomeProprio(urnaRecente)}) disputou ` : " é o nome de urna de quem disputou "}
            {anos.length === 1 ? `uma eleição, em ${anos[0]}` : `${anos.length} eleições, de ${anos[0]} a ${anos.at(-1)}`}, de acordo com o Tribunal Superior Eleitoral.
            <Cita n={nTse} />
            {perfil?.perfil.naturalidade && (
              <>
                {" "}
                Nasceu em {perfil.perfil.naturalidade.replace("/", ", ")}.
                <Cita n={nPerfil} />
              </>
            )}
          </p>
          <p>
            {listaVitorias.length > 0 ? (
              <>
                Venceu {listaE(listaVitorias.map(([k, v]) => `para ${comArtigo(k)} em ${listaE(v.anos.map(String))}`))}
                {derrotas > 0 ? `; nas outras ${derrotas === 1 ? "candidatura" : `${derrotas} candidaturas`}, não venceu` : ""}.
              </>
            ) : (
              <>Não venceu nenhuma das candidaturas.</>
            )}{" "}
            {siglas.length > 1 ? `Candidatou-se por ${siglas.length} partidos: ${listaE(siglas)}.` : cs.length === 1 ? `Partido da candidatura: ${siglas[0]}.` : `Partido em todas as candidaturas: ${siglas[0]}.`}
            <Cita n={nTse} />
          </p>
          {mandatos.length > 0 && (
            <p>
              Exerceu mandato na <LinkPagina caminho="camara" /> {mandatos.length === 1 ? "na" : "nas"} {listaE(mandatos.map((m) => `${m.leg.numero}ª`))}{" "}
              {mandatos.length === 1 ? "legislatura" : "legislaturas"} ({listaE(mandatos.map((m) => `${m.leg.inicio.slice(0, 4)}–${m.leg.fim.slice(0, 4)}`))})
              {mandatos.some((m) => m.suplente) ? `, ${mandatos.every((m) => m.suplente) ? "como suplente que assumiu a vaga" : "em parte como suplente"}` : ""}.
              <Cita n={nLeg} />
              {cargosMesa.length > 0 && (
                <>
                  {" "}
                  Na Mesa Diretora, ocupou {listaE(cargosMesa.map(([c, anos]) => `o cargo de ${c.toLowerCase()} (${listaE(anos)})`))}.
                  <Cita n={nLeg} />
                </>
              )}
            </p>
          )}
          {EXERCERAM.filter((x) => x.pessoa === id).map((x) => (
            <p key={x.legislatura}>
              Exerceu mandato de vereador na <LinkPagina caminho={`legislaturas/${x.legislatura}`} />, como suplente, com o nome {x.nomes.at(-1)}. {x.nota}
              <Cita n={x.fontes.map((f) => refs.cita(f))} />
            </p>
          ))}
          {convocado.length > 0 && (
            <p>
              {convocado.length === 1 ? "Uma convocação" : `${convocado.length} convocações`} da Presidência da <LinkPagina caminho="camara" /> para assumir a vaga de um
              titular, como suplente, {convocado.length === 1 ? "foi publicada" : "foram publicadas"} na Imprensa Oficial do Município
              {convocado.length === 1 ? `, em ${dataPorExtenso(convocado[0].edicao.data)}` : `, a primeira em ${dataPorExtenso(convocado[0].edicao.data)}`}.
              <Cita n={refs.cita(`iomo-${convocado[0].edicao.numero}`)} />
            </p>
          )}
          {temCamara && (
            <p>
              Nas sessões da <LinkPagina caminho="camara" /> realizadas entre {periodo}, {projetos.length === 1 ? "foi lida uma proposição" : `foram lidas ${numero(projetos.length)} proposições`} de sua autoria
              {leis.length > 0 && `, e ${leis.length === 1 ? "foi comunicada a sanção de uma lei" : `foi comunicada a sanção de ${leis.length} leis`} de sua autoria`}
              {vetos.length > 0 && `; ${vetos.length === 1 ? "um projeto de sua autoria foi vetado" : `${vetos.length} projetos de sua autoria foram vetados`} pela Prefeitura`}.
              <Cita n={nSessoes} />
            </p>
          )}
        </div>
      )}

    </>
  );

  return (
    <Artigo tipo="Pessoa" titulo={p.nome} refs={refs} quadro={<Quadro titulo={p.nome} linhas={linhas} imagem={imagemQuadro} />}>
      {html ? <TextoEscrito html={html} /> : resumo}

      {temCamara && (
        <Secao titulo="Na Câmara, legislatura 2025–2028">
          <p className="mb-4 text-sm text-tinta-suave">
            Sessões realizadas entre {periodo}. Cada item leva à planilha da sessão em que foi lido.
            <Cita n={nSessoes} />
          </p>
          {leis.length > 0 && (
            <>
              <h3 className="mb-2 font-bold">Leis sancionadas</h3>
              <div className="mb-6">
                <TabelaLeis leis={leis} comAutoria={leis.some((l) => l.autores.length > 1)} />
              </div>
            </>
          )}
          {vetos.length > 0 && (
            <>
              <h3 className="mb-2 font-bold">Projetos vetados</h3>
              <div className="mb-6">
                <TabelaVetos vetos={vetos} />
              </div>
            </>
          )}
          {projetos.length > 0 && (
            <>
              <h3 className="mb-2 font-bold">Proposições apresentadas ({numero(projetos.length)})</h3>
              <TabelaProjetos projetos={projetos} comAutoria={projetos.some((x) => x.autores.length > 1)} />
            </>
          )}
        </Secao>
      )}

      {(leisAutoria.length > 0 || leisAssinadas.length > 0 || vetados.length > 0) && (
        <Secao titulo="Leis municipais">
          {leisAssinadas.length > 0 && (
            <p className="mb-4">
              Assinou {numero(leisAssinadas.length)} {leisAssinadas.length === 1 ? "lei publicada" : "leis publicadas"} na Imprensa Oficial do Município, por ano:{" "}
              {assinadasPorAno.map(([ano, n], i) => (
                <span key={ano}>
                  {i > 0 && ", "}
                  <LinkPagina caminho={`leis/ano/${ano}`}>{ano}</LinkPagina> ({numero(n)})
                </span>
              ))}
              .<Cita n={nIomo} />
            </p>
          )}
          {leisAutoria.length > 0 && (
            <>
              <h3 className="mb-2 font-bold">Leis de projetos de sua autoria ({numero(leisAutoria.length)})</h3>
              <p className="mb-2 text-sm text-tinta-suave">
                Autoria como publicada na Imprensa Oficial do Município, junto do texto de cada lei; quando a publicação não informa, a da tabela de sanções de
                leis da Câmara. Leis marcadas com * só aparecem nessa tabela.
                <Cita n={[nIomo, nSan].filter(Boolean)} />
              </p>
              <div className="mb-6 overflow-x-auto">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Lei</th>
                      <th>Data</th>
                      <th>Ementa</th>
                      {leisAutoria.some((l) => l.outros.length > 1) && <th>Autoria</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {leisAutoria.map((l) => (
                      <tr key={l.id}>
                        <td className="whitespace-nowrap">
                          <LinkPagina caminho={`leis/${l.id}`}>{l.lei.replace("Lei nº", "Lei").replace("Lei Complementar nº", "LC")}</LinkPagina>
                          {!leiIomo(l.id) && "*"}
                        </td>
                        <td className="whitespace-nowrap">{l.data ? l.data.split("-").reverse().join("/") : l.ano}</td>
                        <td>{l.ementa}</td>
                        {leisAutoria.some((x) => x.outros.length > 1) && (
                          <td>
                            <AutoriaLei autores={l.outros} />
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {vetados.length > 0 && (
            <>
              <h3 className="mb-2 font-bold">Projetos de sua autoria vetados ({numero(vetados.length)})</h3>
              <p className="mb-2 text-sm text-tinta-suave">
                Projetos aprovados pela Câmara que a tabela de sanções de leis registra como vetados pela Prefeitura, sem número de lei.
                <Cita n={nSan} />
              </p>
              <div className="mb-6 overflow-x-auto">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Ano</th>
                      <th>Projeto</th>
                      <th>Veto</th>
                      <th>Assunto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vetados.map((v, k) => (
                      <tr key={k}>
                        <td>{anoSancao(v) ?? "—"}</td>
                        <td className="whitespace-nowrap">{v.projeto ? `PL ${v.projeto}` : "—"}</td>
                        <td>{textoVeto(vetoDe(v)!)}</td>
                        <td>{v.assunto}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Secao>
      )}

      {(convocado.length > 0 || substituido.length > 0) && (
        <Secao titulo="Convocações de suplentes">
          <p className="mb-3 text-sm text-tinta-suave">
            Atos da Presidência da Câmara publicados na Imprensa Oficial do Município, com os nomes como publicados. Lista completa em{" "}
            <LinkPagina caminho="camara/suplentes" />.
          </p>
          {convocado.length > 0 && (
            <>
              <h3 className="mb-2 font-bold">Convocações para assumir a vaga</h3>
              <div className="mb-6">
                <TabelaConvocacoes lista={convocado} refs={refs} />
              </div>
            </>
          )}
          {substituido.length > 0 && (
            <>
              <h3 className="mb-2 font-bold">Suplentes convocados na sua vaga</h3>
              <TabelaConvocacoes lista={substituido} refs={refs} />
            </>
          )}
        </Secao>
      )}

      {homenagens.length > 0 && (
        <Secao titulo="Nome dado a lugares públicos">
          <ul className="prosa">
            {homenagens.map((l) => (
              <li key={l.key}>
                <LinkPagina caminho={`leis/${idLeiIomo(l)}`}>{l.lei}</LinkPagina>, de {dataPorExtenso(l.data)}: {l.ementa.replace(/\s*Indica[çc][ãa]o.*$/i, "").replace(/[”"]/g, "")}
                <Cita n={refs.cita(fonteEdicao(l))} />
              </li>
            ))}
          </ul>
        </Secao>
      )}

      {fatos.length > 0 && (
        <Secao titulo="Fatos relacionados">
          <ul className="prosa">
            {fatos.map((f) => (
              <li key={f.id}>
                <LinkPagina caminho={`fatos/${f.id}`} />
              </li>
            ))}
          </ul>
        </Secao>
      )}

      {html && !temTse && mandatos.length > 0 && <Secao titulo="Mandatos na Câmara">{resumo}</Secao>}
      {temTse && (
        <Secao titulo="Desempenho eleitoral">
          {html && resumo}
          <div className="overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Ano</th>
                  <th>Disputa</th>
                  <th>Partido</th>
                  <th className="num">Número</th>
                  <th className="num">Votos em Osasco</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {[...cs].reverse().map((c, i) => (
                  <tr key={i}>
                    <td>
                      {emOsasco(c) && ANOS_MUNICIPAIS.includes(c.ano) ? (
                        <LinkPagina caminho={`eleicoes/${c.ano}`}>{c.ano}</LinkPagina>
                      ) : !emOsasco(c) ? (
                        <LinkPagina caminho="eleicoes/estaduais-e-federais">{c.ano}</LinkPagina>
                      ) : (
                        c.ano
                      )}
                    </td>
                    <td>
                      {instituicao(c)}
                      <DetalheDisputa ano={c.ano} cargo={c.cargo} numero={c.numero} osasco={emOsasco(c)} />
                    </td>
                    <td>
                      <SiglaPartido sigla={c.partido} ano={c.ano} />
                    </td>
                    <td className="num">{c.numero}</td>
                    <td className="num">
                      {emOsasco(c) ? numero(c.votos) || "—" : "—"}
                      {c.votos2turno != null && <span className="block text-tinta-suave">2º turno: {numero(c.votos2turno)}</span>}
                    </td>
                    <td>{rotuloResultado(c)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-sm text-tinta-suave">
            Fonte: Tribunal Superior Eleitoral.
            <Cita n={nTse} /> Nas eleições estaduais e federais, só o resultado; os votos são os de Osasco nas eleições municipais.
          </p>
        </Secao>
      )}
      {camp && c2024 && <Campanha2024 camp={camp} cargo={instituicao(c2024)} nContas={refs.cita("tse-contas-2024")} nBens={refs.cita("tse-bens-2024")} />}
      {corpoFim && <TextoEscrito html={markdown(corpoFim, refs)} />}
    </Artigo>
  );
}

function DetalheDisputa({ ano, cargo, numero: n, osasco }: { ano: number; cargo: string; numero: string | null; osasco: boolean }) {
  const d = osasco ? detalhe(ano, cargo, n) : null;
  if (!d) return null;
  const coligacao = d.coligacao && !/^PARTIDO ISOLADO$/i.test(d.coligacao) ? d.coligacao : null;
  const grupo = semPrefixo(coligacao) ?? semPrefixo(d.federacao) ?? null;
  const siglas = siglasDaComposicao(d.composicao ?? d.composicaoFederacao);
  return (
    <span className="block text-sm text-tinta-suave">
      {grupo && (
        <>
          {coligacao ? "Coligação" : "Federação"} {grupo}
          {siglas.length > 1 ? ` (${siglas.join(", ")})` : ""}.{" "}
        </>
      )}
      {d.reeleicao && "Concorria à reeleição."}
    </span>
  );
}

function Campanha2024({ camp, cargo, nContas, nBens }: { camp: NonNullable<ReturnType<typeof campanha2024>>; cargo: string; nContas: number; nBens: number }) {
  const origens = Object.entries(camp.receitasPorOrigem).sort((a, b) => b[1] - a[1]);
  return (
    <Secao titulo="Campanha de 2024">
      <div className="prosa">
        <p>
          Na disputa pela {cargo.replace(/^Câmara/, "Câmara")} em 2024, a candidatura declarou ao Tribunal Superior Eleitoral receitas de {reais(camp.receitas)} e despesas
          contratadas de {reais(camp.despesas)}.
          <Cita n={nContas} />
          {origens.length > 0 && (
            <>
              {" "}
              Origem das receitas: {listaE(origens.map(([o, v]) => `${o.toLowerCase()} (${reais(v)})`))}.
              <Cita n={nContas} />
            </>
          )}
          {camp.maioresDespesas.length > 0 && (
            <>
              {" "}
              Maiores despesas: {listaE(camp.maioresDespesas.map(([t, v]) => `${t.toLowerCase()} (${reais(v)})`))}.
              <Cita n={nContas} />
            </>
          )}
          {camp.bens != null && (
            <>
              {" "}
              Bens declarados no registro da candidatura: {camp.bens > 0 ? reais(camp.bens) : "nenhum"}.
              <Cita n={nBens} />
            </>
          )}
        </p>
      </div>
    </Secao>
  );
}
