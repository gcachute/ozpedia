// Fontes: as escritas à mão em conteudo/fontes.yml e as dos dados do TSE, montadas aqui para cada eleição.
import { readFileSync } from "node:fs";
import path from "node:path";
import { load as lerYaml } from "js-yaml";
import tse from "../../dados/tse.json";
import { CAMARA, nomeSessao } from "./camara";
import { fontesDeImagens } from "./imagens";
import { dadosLeis, edicoesUsadas } from "./leis";
import { edicoesConvocacoes } from "./convocacoes";
import { contasPrefeitura } from "./contas";
import { edicoesDecretos } from "./decretos";
import { dadosTce, sessoesTce, urlTce } from "./tce";
import { dadosSancoes, FONTE_SANCOES } from "./sancoes";

export type Fonte = {
  id: string;
  titulo: string;
  autor: string;
  url?: string;
  data?: string;
  consultado?: string;
  nota?: string;
};

const ANOS_TSE = [1996, 1998, 2000, 2002, 2004, 2006, 2008, 2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024, 2026];

function geradas(): Fonte[] {
  const coleta = tse.coletadoEm;
  const lista: Fonte[] = [];
  for (const ano of ANOS_TSE) {
    lista.push({
      id: `tse-candidatos-${ano}`,
      titulo: `Candidatos ${ano}: arquivo consulta_cand_${ano} (São Paulo)`,
      autor: "Tribunal Superior Eleitoral, Portal de Dados Abertos",
      url: `https://dadosabertos.tse.jus.br/dataset/candidatos-${ano}`,
      consultado: coleta,
      nota: "Cargo, partido, número, situação da candidatura e resultado.",
    });
    lista.push({
      id: `tse-resultados-${ano}`,
      titulo: `Resultados ${ano}: votação nominal por município e zona, arquivo votacao_candidato_munzona_${ano} (São Paulo)`,
      autor: "Tribunal Superior Eleitoral, Portal de Dados Abertos",
      url: `https://dadosabertos.tse.jus.br/dataset/resultados-${ano}`,
      consultado: coleta,
      nota: "Votos somados nas zonas de Osasco.",
    });
  }
  for (const ano of ANOS_TSE.filter((a) => a % 4 === 0)) {
    lista.push({
      id: `tse-comparecimento-${ano}`,
      titulo: `Resultados ${ano}: detalhe da votação por município e zona, arquivo detalhe_votacao_munzona_${ano} (São Paulo)`,
      autor: "Tribunal Superior Eleitoral, Portal de Dados Abertos",
      url: `https://dadosabertos.tse.jus.br/dataset/resultados-${ano}`,
      consultado: "2026-11-09",
      nota: "Eleitorado apto, comparecimento, abstenções, votos válidos, brancos e nulos, somados nas zonas de Osasco.",
    });
    lista.push({
      id: `tse-votos-partido-${ano}`,
      titulo: `Resultados ${ano}: votação por partido, município e zona, arquivo votacao_partido_munzona_${ano} (São Paulo)`,
      autor: "Tribunal Superior Eleitoral, Portal de Dados Abertos",
      url: `https://dadosabertos.tse.jus.br/dataset/resultados-${ano}`,
      consultado: "2026-11-09",
      nota: "Votos nominais e de legenda de cada partido para a Câmara, somados nas zonas de Osasco.",
    });
    lista.push({
      id: `tse-vagas-${ano}`,
      titulo: `Candidatos ${ano}: vagas por cargo, arquivo consulta_vagas_${ano} (São Paulo)`,
      autor: "Tribunal Superior Eleitoral, Portal de Dados Abertos",
      url: `https://dadosabertos.tse.jus.br/dataset/candidatos-${ano}`,
      consultado: "2026-11-09",
      nota: "Número de vagas, data da eleição e data da posse.",
    });
  }
  lista.push({
    id: "tse-contas-2024",
    titulo: "Prestação de contas eleitorais 2024: receitas e despesas de candidatos (São Paulo)",
    autor: "Tribunal Superior Eleitoral, Portal de Dados Abertos",
    url: "https://dadosabertos.tse.jus.br/dataset/prestacao-de-contas-eleitorais-2024",
    consultado: "2026-11-01",
    nota: "Totais declarados pela própria candidatura.",
  });
  lista.push({
    id: "tse-bens-2024",
    titulo: "Candidatos 2024: bens declarados, arquivo bem_candidato_2024 (São Paulo)",
    autor: "Tribunal Superior Eleitoral, Portal de Dados Abertos",
    url: "https://dadosabertos.tse.jus.br/dataset/candidatos-2024",
    consultado: "2026-11-01",
    nota: "Soma dos valores informados pela própria candidatura.",
  });
  lista.push({
    id: "camara-legislaturas",
    titulo: "Todas as Legislaturas: vereadores e Mesa Diretora de cada sessão legislativa, desde 1962",
    autor: "Câmara Municipal de Osasco",
    url: "https://www.osasco.sp.leg.br/vereadores/legislaturas",
    consultado: "2026-11-09",
  });
  lista.push({
    id: "camara-historico",
    titulo: "Histórico da Câmara de Osasco",
    autor: "Câmara Municipal de Osasco",
    url: "https://www.osasco.sp.leg.br/historico-da-camara",
    consultado: "2026-11-09",
    nota: "Texto institucional com relatos de vereadores e do primeiro prefeito.",
  });
  lista.push({
    id: "camara-presidentes",
    titulo: "Galeria dos Presidentes",
    autor: "Câmara Municipal de Osasco",
    url: "https://www.osasco.sp.leg.br/vereadores/presidentes",
    consultado: "2026-11-09",
  });
  lista.push({
    id: "tse-trajetorias",
    titulo: "Candidaturas de 1996 a 2026 (arquivos consulta_cand e votacao_candidato_munzona de cada eleição)",
    autor: "Tribunal Superior Eleitoral, Portal de Dados Abertos",
    url: "https://dadosabertos.tse.jus.br/",
    consultado: coleta,
    nota:
      "A mesma pessoa é reconhecida de uma eleição para outra pelos dados do próprio TSE. Votos só em Osasco; nas eleições estaduais e federais, só o resultado.",
  });
  lista.push({
    id: "tse-partidos-candidaturas",
    titulo: "Nome do partido em cada eleição municipal (coluna NM_PARTIDO dos arquivos consulta_cand, candidaturas de Osasco)",
    autor: "Tribunal Superior Eleitoral, Portal de Dados Abertos",
    url: "https://dadosabertos.tse.jus.br/",
    consultado: coleta,
  });
  // Câmara Municipal: a planilha de cada sessão e o perfil oficial de cada vereador.
  for (const s of CAMARA.sessoes)
    lista.push({
      id: `camara-sessao-${s.id}`,
      titulo: `Planilha da ${nomeSessao(s)}`,
      autor: "Câmara Municipal de Osasco",
      url: s.url,
      consultado: CAMARA.coletadoEm,
    });
  lista.push({
    id: "camara-sessoes",
    titulo: `Planilhas de votação e expediente das sessões de ${CAMARA.periodo.inicio.split("-").reverse().join("/")} a ${CAMARA.periodo.fim.split("-").reverse().join("/")}`,
    autor: "Câmara Municipal de Osasco",
    url: "https://www.osasco.sp.leg.br/",
    consultado: CAMARA.coletadoEm,
    nota: "Projetos lidos, leis sancionadas e vetos comunicados em cada sessão; cada item tem o link para a planilha da sessão.",
  });
  for (const v of CAMARA.vereadores)
    lista.push({
      id: `camara-perfil-${v.pessoa}`,
      titulo: `Perfil de ${v.nome}`,
      autor: "Câmara Municipal de Osasco",
      url: v.perfilOficial,
      consultado: CAMARA.coletadoEm,
    });
  lista.push({
    id: "iomo-edicoes",
    titulo: "Imprensa Oficial do Município de Osasco: edições de 2002 a 2026",
    autor: "Prefeitura de Osasco",
    url: "https://osasco.sp.gov.br/imprensa-oficial/",
    consultado: dadosLeis().coletadoEm || undefined,
    nota: "As leis foram lidas no texto de cada edição: número, data, ementa, projeto de origem, autoria e quem assinou. Os atos de convocação de suplentes da Câmara, também.",
  });
  lista.push({
    id: FONTE_SANCOES,
    titulo: "Sanções de Leis (tabela de autógrafos, leis e vetos, de 1996 em diante)",
    autor: "Câmara Municipal de Osasco",
    url: dadosSancoes().url,
    consultado: dadosSancoes().coletadoEm || undefined,
    nota: "Uma linha por projeto aprovado e enviado à Prefeitura: autor, número e data da lei e veto. Inclui as páginas por ano de 2017 em diante e a de leis complementares.",
  });
  // Imprensa Oficial do Município: uma fonte por edição em que uma lei foi publicada.
  for (const e of new Map([...edicoesUsadas(), ...edicoesConvocacoes(), ...contasPrefeitura().flatMap((c) => (c.edicao ? [c.edicao] : [])), ...edicoesDecretos()].map((e) => [e.numero, e])).values())
    lista.push({
      id: `iomo-${e.numero}`,
      titulo: `Imprensa Oficial do Município de Osasco, nº ${e.numero}`,
      autor: "Prefeitura de Osasco",
      url: e.url,
      data: e.data,
      consultado: dadosLeis().coletadoEm,
    });
  // Tribunal de Contas do Estado: uma fonte por sessão com julgamento de órgão de Osasco.
  lista.push({
    id: "tce-sessoes",
    titulo: "Resultados das sessões de julgamento do Tribunal Pleno, da Primeira Câmara e da Segunda Câmara",
    autor: "Tribunal de Contas do Estado de São Paulo",
    url: "https://www.tce.sp.gov.br/",
    consultado: dadosTce().coletadoEm,
    nota: "Um arquivo por sessão, com o assunto e o resultado de cada processo.",
  });
  const ORGAO_TCE: Record<string, string> = { Pleno: "do Tribunal Pleno", PrimeiraCamara: "da Primeira Câmara", SegundaCamara: "da Segunda Câmara" };
  for (const j of sessoesTce()) {
    const [d, o] = j.arquivo.split("_");
    lista.push({
      id: `tce-sessao-${j.arquivo}`,
      titulo: `Resultado da sessão ${ORGAO_TCE[o] ?? o} de ${d.slice(6)}/${d.slice(4, 6)}/${d.slice(0, 4)}`,
      autor: "Tribunal de Contas do Estado de São Paulo",
      url: urlTce(j.arquivo),
      data: j.data,
      consultado: dadosTce().coletadoEm,
    });
  }
  // Imagens: cada uma é citada na legenda, como na Wikipédia.
  for (const { id, img: i } of fontesDeImagens())
    lista.push({
      id,
      titulo: `Arquivo: ${i.arquivo}`,
      autor: `${i.autor}; licença ${i.licenca}${i.pagina.includes("commons.wikimedia.org") ? "; via Wikimedia Commons" : ""}`,
      url: i.pagina,
      data: i.data ?? undefined,
    });
  return lista;
}

let todas: Map<string, Fonte> | null = null;
export function fontes(): Map<string, Fonte> {
  if (todas && process.env.NODE_ENV === "production") return todas;
  const escritas = lerYaml(readFileSync(path.join(process.cwd(), "conteudo", "fontes.yml"), "utf8")) as Record<string, Omit<Fonte, "id">>;
  todas = new Map();
  for (const [id, f] of Object.entries(escritas ?? {})) todas.set(id, { id, ...f, consultado: f.consultado ? String(f.consultado) : undefined, data: f.data ? String(f.data) : undefined });
  // As edições do Diário Oficial descritas à mão em fontes.yml ficam com a descrição de lá.
  for (const f of geradas()) if (!(f.id.startsWith("iomo-") && todas.has(f.id))) todas.set(f.id, f);
  return todas;
}

export function fonte(id: string): Fonte {
  const f = fontes().get(id);
  if (!f) throw new Error(`Fonte "${id}" não existe em conteudo/fontes.yml`);
  return f;
}

// Referências de uma página: cada fonte citada ganha um número, na ordem em que aparece pela primeira vez.
export class Referencias {
  ids: string[] = [];
  cita(id: string): number {
    fonte(id); // confere que existe
    const i = this.ids.indexOf(id);
    if (i >= 0) return i + 1;
    this.ids.push(id);
    return this.ids.length;
  }
}
