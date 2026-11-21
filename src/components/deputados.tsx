// Seções das páginas de pessoas com a atuação na Câmara dos Deputados e na Assembleia Legislativa de São Paulo,
// como os dados abertos de cada casa registram. Só dados: nada de comentário sobre eles.
import { Cita, Secao } from "@/components/artigo";
import {
  FONTE_ALESP_COMISSOES,
  FONTE_ALESP_PROPOSITURAS,
  FONTE_ALESP_VERBA,
  fatosMandato,
  fonteCota,
  fonteFederal,
  limpaEmenta,
  nomeDespesa,
  nomeTipoFederal,
  periodoLegislatura,
  pluralTipo,
  urlProposicaoFederal,
  urlPropositEstadual,
  type DeputadoEstadual,
  type DeputadoFederal,
} from "@/lib/deputados";
import { reais } from "@/lib/detalhes";
import type { Referencias } from "@/lib/fontes";
import { dataCurta, listaE, numero } from "@/lib/texto";

const OSASCO = /osasco/i;

// Lista longa fica recolhida, com um resumo para abrir.
function Recolhe({ n, limite = 12, rotulo, children }: { n: number; limite?: number; rotulo: string; children: React.ReactNode }) {
  if (n <= limite) return <>{children}</>;
  return (
    <details className="mb-4">
      <summary className="cursor-pointer font-bold text-cidade">{rotulo}</summary>
      {children}
    </details>
  );
}

function contagem(por: Record<string, number>, nome: (k: string) => string) {
  return Object.entries(por)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([k, n]) => `${numero(n)} ${pluralTipo(nome(k), n)}`);
}

function TabelaValores({ porAno, porTipo, n }: { porAno: Record<string, number>; porTipo: Record<string, number>; n: number }) {
  const anos = Object.entries(porAno).filter(([, v]) => v > 0).sort();
  const tipos = Object.entries(porTipo).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (!anos.length) return null;
  const total = anos.reduce((s, [, v]) => s + v, 0);
  return (
    <>
      <div className="mb-3 overflow-x-auto">
        <table className="tabela">
          <thead>
            <tr>
              <th>Ano</th>
              <th className="text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {anos.map(([a, v]) => (
              <tr key={a}>
                <td>{a}</td>
                <td className="text-right">{reais(v)}</td>
              </tr>
            ))}
            <tr>
              <td className="font-bold">Total</td>
              <td className="text-right font-bold">
                {reais(total)}
                <Cita n={n} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {tipos.length > 0 && (
        <p className="mb-4">
          Tipos de despesa de maior valor no total:{" "}
          {listaE(tipos.map(([t, v]) => `${nomeDespesa(t)} (${reais(v)})`))}.
          <Cita n={n} />
        </p>
      )}
    </>
  );
}

export function NaCamaraDosDeputados({ d, refs }: { d: DeputadoFederal; refs: Referencias }) {
  const n = refs.cita(fonteFederal(d));
  const fatos = fatosMandato(d);
  const orgaos = [...d.orgaos].sort((a, b) => (a.inicio ?? "").localeCompare(b.inicio ?? ""));
  const direcao = orgaos.filter((o) => /presidente|relator|coordenador/i.test(o.cargo));
  const todas = Object.values(d.porTipo).reduce((s, x) => s + x, 0);
  const anosProp = [...new Set([...d.proposicoes, ...d.osasco].map((p) => p.ano))].sort();
  const citamOsasco = [...d.proposicoes.filter((p) => OSASCO.test(p.ementa)), ...d.osasco].sort((a, b) => (a.data ?? "").localeCompare(b.data ?? ""));
  const temCota = Object.values(d.cota.porAno).some((v) => v > 0);
  const nCota = temCota ? refs.cita(fonteCota(d)) : 0;

  const linhaProp = (p: DeputadoFederal["proposicoes"][number]) => (
    <tr key={p.id}>
      <td className="whitespace-nowrap align-top">
        <a className="link" href={urlProposicaoFederal(p.id)}>
          {p.tipo} {p.numero}/{p.ano}
        </a>
      </td>
      <td className="whitespace-nowrap align-top">{p.data ? dataCurta(p.data) : p.ano}</td>
      <td className="align-top text-sm">{limpaEmenta(p.ementa) || "Sem ementa registrada."}</td>
    </tr>
  );
  const tabelaProp = (lista: DeputadoFederal["proposicoes"]) => (
    <div className="mb-4 overflow-x-auto">
      <table className="tabela">
        <thead>
          <tr>
            <th>Proposição</th>
            <th>Data</th>
            <th>Ementa</th>
          </tr>
        </thead>
        <tbody>{lista.map(linhaProp)}</tbody>
      </table>
    </div>
  );

  return (
    <Secao titulo="Na Câmara dos Deputados">
      <p className="mb-4">
        Exerceu mandato na Câmara dos Deputados, por São Paulo,{" "}
        {d.legislaturas.length === 1
          ? `na ${d.legislaturas[0]}ª legislatura (${periodoLegislatura(d.legislaturas[0])})`
          : `nas legislaturas ${listaE(d.legislaturas.map((l) => `${l}ª (${periodoLegislatura(l)})`))}`}
        , segundo a Câmara.
        <Cita n={n} />
      </p>

      {fatos.length > 0 && (
        <>
          <h3 className="mb-2 font-bold">Mandato</h3>
          <div className="mb-6 overflow-x-auto">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Fato</th>
                  <th>Partido</th>
                </tr>
              </thead>
              <tbody>
                {fatos.map((f) => (
                  <tr key={`${f.data}-${f.fato}`}>
                    <td className="whitespace-nowrap">{dataCurta(f.data)}</td>
                    <td>{f.fato}</td>
                    <td>{f.partido}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {orgaos.length > 0 && (
        <>
          <h3 className="mb-2 font-bold">Comissões e outros órgãos</h3>
          <p className="mb-3">
            {numero(orgaos.length)} {orgaos.length === 1 ? "participação" : "participações"} em comissões e outros órgãos da Câmara
            {orgaos[0].inicio ? `, de ${orgaos[0].inicio.slice(0, 4)} a ${(orgaos.at(-1)!.fim ?? orgaos.at(-1)!.inicio ?? "").slice(0, 4)}` : ""}:{" "}
            {listaE(
              [
                [orgaos.filter((o) => o.cargo === "Titular").length, "como titular"],
                [orgaos.filter((o) => o.cargo === "Suplente").length, "como suplente"],
                [direcao.length, `em cargo de direção (${listaE([...new Set(direcao.map((o) => o.cargo.toLowerCase()))])})`],
              ]
                .filter(([k]) => Number(k) > 0)
                .map(([k, t]) => `${numero(Number(k))} ${t}`),
            )}
            .
            <Cita n={n} />
          </p>
          <Recolhe n={orgaos.length} rotulo={`Ver as ${numero(orgaos.length)} participações`}>
            <div className="mb-6 overflow-x-auto">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Órgão</th>
                    <th>Cargo</th>
                    <th>Início</th>
                    <th>Fim</th>
                  </tr>
                </thead>
                <tbody>
                  {orgaos.map((o, k) => (
                    <tr key={`${o.id}-${o.cargo}-${o.inicio}-${k}`}>
                      <td className="align-top text-sm">{o.nome}</td>
                      <td className="align-top">{o.cargo}</td>
                      <td className="whitespace-nowrap align-top">{o.inicio ? dataCurta(o.inicio) : ""}</td>
                      <td className="whitespace-nowrap align-top">{o.fim ? dataCurta(o.fim) : "em curso"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Recolhe>
        </>
      )}

      {todas > 0 && (
        <>
          <h3 className="mb-2 font-bold">Proposições</h3>
          <p className="mb-3">
            Consta entre os autores de {numero(todas)} {todas === 1 ? "proposição registrada" : "proposições registradas"} pela Câmara
            {anosProp.length ? `, de ${anosProp[0]} a ${anosProp.at(-1)}` : ""}: {listaE(contagem(d.porTipo, nomeTipoFederal))}.
            <Cita n={n} />
          </p>
          {d.proposicoes.length > 0 && (
            <Recolhe
              n={d.proposicoes.length}
              rotulo={`Ver os ${numero(d.proposicoes.length)} projetos e propostas (projetos de lei, de lei complementar, de decreto legislativo, de resolução e propostas de emenda à Constituição)`}
            >
              {tabelaProp(d.proposicoes)}
            </Recolhe>
          )}
        </>
      )}

      {citamOsasco.length > 0 && (
        <>
          <h3 className="mb-2 font-bold">Proposições que citam Osasco</h3>
          <p className="mb-3">
            {citamOsasco.length === 1 ? "Uma proposição" : `${numero(citamOsasco.length)} proposições`} com Osasco na ementa.
            <Cita n={n} />
          </p>
          {tabelaProp(citamOsasco)}
        </>
      )}

      {temCota && (
        <>
          <h3 className="mb-2 font-bold">Cota parlamentar</h3>
          <p className="mb-3">
            Despesas reembolsadas pela Cota para o Exercício da Atividade Parlamentar, por ano (valor de cada documento menos a parte não reembolsada).
            <Cita n={nCota} />
          </p>
          <TabelaValores porAno={d.cota.porAno} porTipo={d.cota.porTipo} n={nCota} />
        </>
      )}

      {d.frentes.length > 0 && (
        <>
          <h3 className="mb-2 font-bold">Frentes parlamentares</h3>
          <p className="mb-3">
            Integrou {d.frentes.length === 1 ? "uma frente parlamentar registrada" : `${numero(d.frentes.length)} frentes parlamentares registradas`} na Câmara.
            <Cita n={n} />
          </p>
          <Recolhe n={d.frentes.length} limite={8} rotulo={`Ver as ${numero(d.frentes.length)} frentes`}>
            <ul className="prosa mb-4 text-sm">
              {[...d.frentes]
                .sort((a, b) => a.legislatura - b.legislatura || a.titulo.localeCompare(b.titulo))
                .map((f) => (
                  <li key={f.id}>
                    {f.titulo} ({f.legislatura}ª legislatura)
                  </li>
                ))}
            </ul>
          </Recolhe>
        </>
      )}
    </Secao>
  );
}

export function NaAssembleia({ d, refs }: { d: DeputadoEstadual; refs: Referencias }) {
  const n = refs.cita(FONTE_ALESP_PROPOSITURAS);
  const todas = Object.values(d.porNatureza).reduce((s, x) => s + x, 0);
  const citamOsasco = [...d.proposituras.filter((p) => OSASCO.test(p.ementa)), ...d.osasco].sort((a, b) => (a.data ?? "").localeCompare(b.data ?? ""));
  const temVerba = Object.values(d.verba.porAno).some((v) => v > 0);
  const nVerba = temVerba ? refs.cita(FONTE_ALESP_VERBA) : 0;
  const nCom = d.comissoes.length ? refs.cita(FONTE_ALESP_COMISSOES) : 0;
  const anosVerba = Object.keys(d.verba.porAno).sort();

  const tabela = (lista: DeputadoEstadual["proposituras"]) => (
    <div className="mb-4 overflow-x-auto">
      <table className="tabela">
        <thead>
          <tr>
            <th>Propositura</th>
            <th>Data</th>
            <th>Ementa</th>
          </tr>
        </thead>
        <tbody>
          {lista.map((p) => (
            <tr key={p.id}>
              <td className="align-top">
                <a className="link" href={urlPropositEstadual(p.id)}>
                  {p.natureza} {p.numero}/{p.ano}
                </a>
              </td>
              <td className="whitespace-nowrap align-top">{p.data ? dataCurta(p.data) : p.ano}</td>
              <td className="align-top text-sm">{limpaEmenta(p.ementa) || "Sem ementa registrada."}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <Secao titulo="Na Assembleia Legislativa">
      {todas > 0 && (
        <p className="mb-4">
          Consta na autoria de {numero(todas)} {todas === 1 ? "propositura publicada" : "proposituras publicadas"} pela Assembleia Legislativa de São Paulo
          {d.anos ? (d.anos[0] === d.anos[1] ? ` em ${d.anos[0]}` : ` de ${d.anos[0]} a ${d.anos[1]}`) : ""}: {listaE(contagem(d.porNatureza, (k) => k))}.
          <Cita n={n} />
          {anosVerba.length > 0 && (
            <>
              {" "}
              A verba de gabinete registra despesas em {anosVerba.length === 1 ? anosVerba[0] : `${anosVerba.length} anos, de ${anosVerba[0]} a ${anosVerba.at(-1)}`}.
              <Cita n={nVerba} />
            </>
          )}
        </p>
      )}

      {d.proposituras.length > 0 && (
        <>
          <h3 className="mb-2 font-bold">Projetos e propostas</h3>
          <Recolhe
            n={d.proposituras.length}
            rotulo={`Ver os ${numero(d.proposituras.length)} projetos e propostas (projetos de lei, de lei complementar, de decreto legislativo, de resolução e propostas de emenda à Constituição)`}
          >
            {tabela(d.proposituras)}
          </Recolhe>
        </>
      )}

      {citamOsasco.length > 0 && (
        <>
          <h3 className="mb-2 font-bold">Proposituras que citam Osasco</h3>
          <p className="mb-3">
            {citamOsasco.length === 1 ? "Uma propositura" : `${numero(citamOsasco.length)} proposituras`} com Osasco na ementa
            {(() => {
              const por: Record<string, number> = {};
              for (const p of citamOsasco) por[p.natureza] = (por[p.natureza] ?? 0) + 1;
              return Object.keys(por).length > 1 ? `: ${listaE(contagem(por, (k) => k))}` : "";
            })()}
            .
            <Cita n={n} />
          </p>
          <Recolhe n={citamOsasco.length} limite={15} rotulo={`Ver as ${numero(citamOsasco.length)} proposituras`}>
            {tabela(citamOsasco)}
          </Recolhe>
        </>
      )}

      {temVerba && (
        <>
          <h3 className="mb-2 font-bold">Verba de gabinete</h3>
          <p className="mb-3">
            Despesas pagas com a verba mensal de gabinete, por ano.
            <Cita n={nVerba} />
          </p>
          <TabelaValores porAno={d.verba.porAno} porTipo={d.verba.porTipo} n={nVerba} />
        </>
      )}

      {d.comissoes.length > 0 && (
        <>
          <h3 className="mb-2 font-bold">Comissões permanentes</h3>
          <p className="mb-3">
            Na composição atual:{" "}
            {listaE(d.comissoes.map((c) => `${c.nome ?? c.sigla} (${c.efetivo ? "membro efetivo" : "suplente"}${c.inicio ? `, desde ${dataCurta(c.inicio)}` : ""})`))}.
            <Cita n={nCom} />
          </p>
        </>
      )}
    </Secao>
  );
}
