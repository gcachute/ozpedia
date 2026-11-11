import type { Metadata } from "next";
import Link from "next/link";
import { Figura } from "@/components/artigo";
import { imagemPagina } from "@/lib/imagens";

export const metadata: Metadata = { title: "Como o arquivo é feito" };

export default function Sobre() {
  return (
    <div className="prosa max-w-3xl">
      <h1 className="titulo mb-4 text-4xl">Como o arquivo é feito</h1>
      <Figura imagem={imagemPagina("sobre")} />
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
          <strong>Câmara Municipal, legislatura atual:</strong> proposições lidas, leis sancionadas e vetos comunicados nas sessões, como registrados
          nas planilhas de cada sessão, e o perfil oficial de cada vereador. Cada lei é ligada ao projeto de que veio quando os dois têm a mesma
          autoria e o mesmo texto de ementa.
        </li>
        <li>
          <strong>Leis municipais:</strong> lidas no texto de cada edição da Imprensa Oficial do Município de Osasco publicada no site da Prefeitura.
          De cada lei ficam o número, a data, a ementa, o projeto de origem e a autoria (quando a publicação informa), quem sancionou ou
          promulgou, os secretários que assinaram junto e o texto. A autoria e a assinatura são ligadas às páginas das pessoas pelo nome
          publicado. As edições até 2014 são diagramadas em colunas e são lidas coluna por coluna; nelas a transcrição pode ter quebras de linha
          fora do lugar. O site da Prefeitura não tem edições de 2011 a 2013, e tem poucas de 2009 e 2010. Leis publicadas mais de uma vez ficam com a primeira publicação. Leis promulgadas pela Presidência da Câmara (quando a Câmara rejeita o veto da Prefeitura) entram com quem as promulgou. Quando o ano do cabeçalho difere do ano do fecho no mesmo dia e mês, vale o que cabe na numeração das leis vizinhas, e a página mostra as duas datas. Na transcrição, números de documentos pessoais e
          datas de nascimento são omitidos; quando o fim da lei não é reconhecido, a página mostra só os dados e o endereço da edição.
        </li>
        <li>
          <strong>Decretos:</strong> lidos nas mesmas edições da Imprensa Oficial, pelo cabeçalho ("DECRETO Nº 9.270, DE 13 DE JANEIRO DE 2004"); ficam o número,
          a data, a ementa e quem assinou. Não entram os atos sobre pessoas (nomeações, exonerações, designações, aposentadorias, pensões, permissões dadas a
          uma pessoa física), as desapropriações e os créditos orçamentários. Decreto publicado mais de uma vez fica com a primeira publicação.
        </li>
        <li>
          <strong>Sanções de leis da Câmara:</strong> a tabela publicada pela Câmara Municipal, de 1996 em diante, com o autor de cada projeto aprovado, o número
          e a data da lei e o veto. Nas leis lidas na Imprensa Oficial, completa a autoria quando a publicação não informa (a linha da Câmara precisa ter o
          mesmo número e a mesma data ou uma ementa parecida). As leis que só a tabela registra ganham página quando o número não se repete com outro assunto
          e a data cabe entre as das leis vizinhas já lidas; as demais ficam como números não encontrados. Os autores, escritos de forma abreviada na tabela
          ("C. PITERI", "ANDRÉ SAC."), são ligados aos vereadores da legislatura daquele ano.
        </li>
        <li>
          <strong>Contas anuais da Prefeitura:</strong> decretos legislativos da Câmara que aprovam ou rejeitam as contas de cada ano, lidos nas edições da
          Imprensa Oficial do Município e transcritos à mão (exercício, resultado, número do decreto, data da votação e o que o decreto diz do parecer do
          Tribunal de Contas do Estado).
        </li>
        <li>
          <strong>Suplentes convocados:</strong> atos da Presidência da Câmara publicados nas mesmas edições da Imprensa Oficial, que dizem quem foi convocado,
          no lugar de quem, por qual motivo (licença, licença para assumir cargo na Prefeitura, renúncia, impedimento do suplente anterior ou decisão judicial) e
          a partir de quando. O artigo da lei citado no ato, que distingue o tipo de licença, não é reproduzido. Quando o mesmo ato aparece de novo (na ata da
          sessão em que foi lido ou republicado), fica a primeira publicação. Os nomes são ligados às páginas pelo nome completo da lista oficial da Câmara ou
          pelo nome de urna da eleição que formou a legislatura; os casos em que o nome publicado difere foram conferidos à mão pelo partido ou coligação do
          titular.
        </li>
        <li>
          <strong>O que vem antes de 1996 e os textos das páginas:</strong> escritos à mão, frase a frase, com documentos oficiais, leis, publicações e
          jornais citados como fonte.
        </li>
        <li>
          <strong>Imagens:</strong> só imagens de uso livre: as do Wikimedia Commons, o acervo de imagens usado pela Wikipédia, e as fotos de
          candidatura publicadas pelo Tribunal Superior Eleitoral no seu portal de dados abertos (licença CC BY 4.0). Cada imagem tem legenda e
          uma referência com o autor, a licença e o endereço do arquivo. Quem não tem foto de uso livre aparece com a imagem da legislatura ou da
          eleição de que participou; partido sem logotipo de uso livre aparece com a foto da urna eletrônica.
        </li>
      </ul>
      <h2>Como ler</h2>
      <ul>
        <li>
          O nome de cada pessoa é o <strong>nome de urna</strong>, como registrado no Tribunal Superior Eleitoral. Para quem exerceu mandato na Câmara na
          legislatura atual, o quadro mostra também nome completo, naturalidade, ocupação e instrução, como estão no perfil oficial da Câmara. CPF,
          endereço, telefone e outros dados pessoais não são publicados.
        </li>
        <li>
          Tem página quem venceu alguma eleição em Osasco desde 1996, quem disputou a Prefeitura (como titular ou vice), quem exerceu mandato na Câmara na legislatura atual (inclusive suplentes) e quem já tem texto escrito. As
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
