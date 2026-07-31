import type { NextConfig } from "next";

/**
 * Dos modos de despliegue con la misma base de código:
 *
 * - Vercel (por defecto): runtime completo. Habilita optimización de imágenes,
 *   rutas de API, revalidación por evento y, más adelante, el panel con Supabase.
 * - Export estático (STATIC_EXPORT=1): genera /out para GitHub Pages.
 *   Se mantiene como salida de respaldo, no como destino final.
 */
const estatico = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(estatico
    ? { output: "export" as const, images: { unoptimized: true }, trailingSlash: true }
    : { images: { formats: ["image/avif", "image/webp"] as const } }),
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
};

export default nextConfig;
