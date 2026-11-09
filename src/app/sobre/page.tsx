import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Como o arquivo é feito" };

export default function Sobre() {
  return (
    <div className="prosa max-w-3xl">
      <h1 className="titulo mb-4 text-4xl">Como o arquivo é feito</h1>
      <p>
        A OZpédia reúne a história política de Osasco desde a emancipação, em 1962: pessoas, partidos, eleições, legislaturas da Câmara, mandatos na
        Prefeitura, leis e fatos. Cada informação traz a fonte, numerada ao lado e listada no pé da página.
      </p>
      <h2>De onde vêm as informações</h2>
      <ul>
        <li>
          <strong>Eleições de 1996 em diante:</strong> dados abertos do Tribunal Superior Eleitoral (candidaturas, partidos, números, votos e
          resultados). As tabelas são montadas a partir desses arquivos, sem edição à mão.
        </li>
        <li>
          <strong>Partidos:</strong> nome, número, data de registro, mudanças de nome, fusões e incorporações, como publicados pelo Tribunal Superior
          Eleitoral.
        </li>
        <li>
          <strong>O que vem antes de 1996 e os textos das páginas:</strong> escritos à mão, frase a frase, com documentos oficiais, leis, publicações e
          jornais citados como fonte.
        </li>
      </ul>
      <h2>Como ler</h2>
      <ul>
        <li>
          O nome de cada pessoa é o <strong>nome de urna</strong>, como registrado no Tribunal Superior Eleitoral. Nenhum outro dado pessoal é publicado.
        </li>
        <li>
          Tem página quem venceu alguma eleição em Osasco desde 1996, quem disputou a Prefeitura (como titular ou vice) e quem já tem texto escrito. As
          demais candidaturas aparecem nas páginas de cada eleição.
        </li>
        <li>
          Resultados: <em>Venceu</em>, <em>Suplência</em> (ficou na lista de suplentes) e <em>Não obteve vaga</em>. Candidatura que não chegou à urna
          aparece como não aceita, cancelada ou com renúncia, como no registro.
        </li>
        <li>
          O resultado é o registrado no fim da apuração. Suplentes que assumiram depois, afastamentos e decisões da Justiça entram como texto, com fonte,
          conforme as páginas forem escritas.
        </li>
        <li>
          Partido que mudou de nome aparece com a sigla usada naquela eleição; a página do partido mostra para onde ele foi.
        </li>
      </ul>
      <h2>O arquivo está em construção</h2>
      <p>
        Esta é a primeira versão. As eleições, legislaturas e mandatos de 1962 a 1995 entram conforme forem achadas as fontes. A lista completa de
        documentos usados está em <Link href="/fontes/">Todas as fontes</Link>.
      </p>
    </div>
  );
}
