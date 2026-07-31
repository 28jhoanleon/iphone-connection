import type { NextConfig } from "next";

/**
 * Export estático: el sitio se publica en GitHub Pages sin servidor.
 * Cuando migremos a Supabase y el panel necesite servidor, se quita `output`
 * y el mismo repo se despliega en Vercel sin cambiar una línea de la app.
 */
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
};

export default nextConfig;
