import type { NextConfig } from "next";

// Site todo estático: `npm run build` gera a pasta out/. Por enquanto todos os endereços têm o prefixo
// /arquivo (também na máquina: http://localhost:3300/arquivo); sai quando o site tiver endereço próprio.
const BASE = process.env.BASE_PATH ?? "/arquivo";
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: BASE,
  env: { NEXT_PUBLIC_BASE_PATH: BASE },
  images: { unoptimized: true },
};

export default nextConfig;
