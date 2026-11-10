import type { Metadata } from "next";
import Link from "next/link";
import { Archivo, Atkinson_Hyperlegible_Next } from "next/font/google";
import "./globals.css";

const texto = Atkinson_Hyperlegible_Next({ variable: "--font-texto", subsets: ["latin"], weight: ["400", "700"] });
const titulo = Archivo({ variable: "--font-titulo", subsets: ["latin"], axes: ["wdth"] });

export const metadata: Metadata = {
  title: { default: "OZpédia: arquivo da política de Osasco", template: "%s · OZpédia" },
  description: "Pessoas, partidos, eleições, legislaturas e fatos da política de Osasco (SP), com a fonte de cada informação.",
};

const MENU = [
  ["/pessoas/", "Pessoas"],
  ["/partidos/", "Partidos"],
  ["/eleicoes/", "Eleições"],
  ["/camara/", "Câmara"],
  ["/prefeitura/", "Prefeitura"],
  ["/leis/", "Leis"],
  ["/fatos/", "Fatos"],
] as const;

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${texto.variable} ${titulo.variable}`}>
      <body className="min-h-screen bg-white font-sans text-tinta antialiased">
        <header className="border-b border-fio">
          <div className="mx-auto flex max-w-6xl flex-wrap items-baseline gap-x-8 gap-y-2 px-4 py-4">
            <Link href="/" className="flex items-baseline gap-2 no-underline">
              <span className="titulo text-2xl text-tinta">
                OZ<span className="text-cidade">pédia</span>
              </span>
              <span className="hidden text-sm text-tinta-suave sm:inline">arquivo da política de Osasco</span>
            </Link>
            <nav aria-label="Seções" className="flex flex-wrap gap-x-4 gap-y-1 text-[0.95rem]">
              {MENU.map(([h, t]) => (
                <Link key={h} href={h} className="text-tinta hover:text-cidade hover:underline">
                  {t}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mt-12 border-t border-fio">
          <div className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-2 px-4 py-6 text-sm text-tinta-suave">
            <Link href="/sobre/" className="link">
              Como o arquivo é feito
            </Link>
            <Link href="/fontes/" className="link">
              Todas as fontes
            </Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
