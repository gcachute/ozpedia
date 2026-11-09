import type { NextConfig } from "next";

// Site todo estático: `npm run build` gera a pasta out/. O arquivo vai morar em deolhoemoz.com.br/arquivo,
// por isso o prefixo /arquivo em todos os endereços (também na máquina: http://localhost:3300/arquivo).
const BASE = process.env.BASE_PATH ?? "/arquivo";
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: BASE,
  env: { NEXT_PUBLIC_BASE_PATH: BASE },
  images: { unoptimized: true },
};

export default nextConfig;
