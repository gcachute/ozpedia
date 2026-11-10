// O que a Câmara Municipal publicou na legislatura atual (dados/camara.json): sessões, leis sancionadas e vetos lidos
// nas sessões, projetos apresentados e o perfil oficial de cada vereador.
import camara from "../../dados/camara.json";
import { dataCurta } from "./texto";

export type Sessao = { id: string; numero: number; tipo: string; data: string; url: string };
export type Lei = { key: string; lei: string; data: string; autores: string[]; resumo: string; sessao: string };
export type Veto = { key: string; tipo: string; numero: string; projeto: string; autores: string[]; resumo: string; sessao: string };
export type Projeto = { key: string; tipo: string; numero: number; ano: number; autores: string[]; autorTexto: string | null; ementa: string; sessao: string };
export type PerfilCamara = {
  pessoa: string;
  nome: string;
  perfilOficial: string;
  emExercicio: boolean;
  perfil: { nomeCompleto: string | null; naturalidade: string | null; ocupacao: string | null; instrucao: string | null };
};

export const CAMARA = camara as unknown as {
  fonte: string;
  periodo: { inicio: string; fim: string };
  coletadoEm: string;
  sessoes: Sessao[];
  leis: Lei[];
  vetos: Veto[];
  projetos: Projeto[];
  vereadores: PerfilCamara[];
};

const sessoes = new Map(CAMARA.sessoes.map((s) => [s.id, s]));
export const sessao = (id: string) => sessoes.get(id) ?? null;
export const nomeSessao = (s: Sessao) =>
  `${s.numero}ª sessão ${s.tipo === "ordinaria" ? "ordinária" : s.tipo === "extraordinaria" ? "extraordinária" : s.tipo} de ${dataCurta(s.data)}`;

export const perfilCamara = (pessoa: string) => CAMARA.vereadores.find((v) => v.pessoa === pessoa) ?? null;

// "Lei nº 5.448" → "lei-5448"; "Lei Complementar nº 312" → "lei-complementar-312".
export const idLei = (l: Lei) =>
  l.lei
    .toLowerCase()
    .replace(/nº\s*/g, "")
    .replace(/\./g, "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export const leiPorId = (id: string) => CAMARA.leis.find((l) => idLei(l) === id) ?? null;

// O resumo vem do texto lido na sessão ("veda a nomeação de..., de autoria do vereador Fulano."): a autoria sai do fim,
// porque o site mostra os autores com link.
export const resumoSemAutoria = (s: string) =>
  s
    .replace(/,?\s*de autoria d[oa]s?\s.*$/i, "")
    .replace(/\s*\(/g, " (")
    .replace(/\.$/, "")
    .trim();

const numeroLei = (l: Lei) => Number(l.lei.replace(/\D/g, ""));
export const leisOrdenadas = () => [...CAMARA.leis].sort((a, b) => numeroLei(b) - numeroLei(a));

export const leisDe = (pessoa: string) => leisOrdenadas().filter((l) => l.autores.includes(pessoa));
export const vetosDe = (pessoa: string) => CAMARA.vetos.filter((v) => v.autores.includes(pessoa));
export const projetosDe = (pessoa: string) =>
  CAMARA.projetos.filter((p) => p.autores.includes(pessoa)).sort((a, b) => b.ano - a.ano || b.numero - a.numero);
export const projetosDoExecutivo = () => CAMARA.projetos.filter((p) => p.autorTexto === "Prefeitura").sort((a, b) => b.ano - a.ano || b.numero - a.numero);

export const TIPOS_PROJETO: Record<string, string> = {
  PL: "Projeto de lei",
  PLC: "Projeto de lei complementar",
  PR: "Projeto de resolução",
  PDL: "Projeto de decreto legislativo",
  PELO: "Proposta de emenda à Lei Orgânica",
};
export const nomeProjeto = (p: Projeto) => `${p.tipo} ${p.numero}/${p.ano}`;

// Título da página de uma lei (as escritas à mão sem lei correspondente usam o título do cabeçalho; ver links.ts).
export const tituloLei = (id: string): string | null => {
  const l = leiPorId(id);
  return l ? `${l.lei}, de ${l.data}` : null;
};
