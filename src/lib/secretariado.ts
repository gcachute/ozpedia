// Secretariado da Prefeitura na data de consulta (conteudo/secretariado.yml), da página "Secretarias" do site da Prefeitura.
import { readFileSync } from "node:fs";
import path from "node:path";
import { load as lerYaml } from "js-yaml";
import { acharPessoa, vereadores } from "./leis";
import { sucessaoPrefeitura } from "./prefeitos";

export type Orgao = { orgao: string; titular?: string; adjunto?: string; nota?: string };
type Arquivo = { consultado: string; fonte: string; orgaos: Orgao[] };
let _s: Arquivo | null = null;
export const secretariado = (): Arquivo => (_s ??= lerYaml(readFileSync(path.join(process.cwd(), "conteudo", "secretariado.yml"), "utf8")) as Arquivo);

// Nome ligado à página da pessoa só entre vereadores, prefeitos e vices (nomes comuns de fora desse grupo não são ligados).
let _grupo: Set<string> | null = null;
export function pessoaDoSecretariado(nome: string | undefined): string | null {
  if (!nome) return null;
  _grupo ??= new Set([...vereadores(), ...sucessaoPrefeitura().flatMap((m) => [m.pessoa, m.vicePessoa]).filter((x): x is string => !!x)]);
  return acharPessoa(nome, _grupo);
}
