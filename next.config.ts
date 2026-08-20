import type { NextConfig } from "next";

/**
 * Dos modos de despliegue con la misma base de código:
 *
 * - Vercel (por defecto): runtime completo. Habilita optimización de imágenes,
 *   rutas de API, revalidación por evento y, más adelante, el panel con Supabase.
 * - Export estático (STATIC_EXPORT=1): genera /out para GitHub Pages.
 *   Se mantiene como salida de respaldo, no como destino final.
 *
 * serverExternalPackages: sharp solo existe en Vercel. En Termux no hay binario
 * para android-arm64, y aunque el import está dentro de una rama que en local
 * nunca se ejecuta, webpack igual intenta resolverlo al compilar y la ruta de
 * fotos falla entera. Marcarlo como externo lo deja fuera del bundle: se
 * requiere recién al ejecutarse, o sea nunca en local.
 */
const estatico = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(estatico
    ? { output: "export" as const, images: { unoptimized: true }, trailingSlash: true }
    : { images: { formats: ["image/avif", "image/webp"] as const } }),
  serverExternalPackages: ["sharp"],
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
};

export default nextConfig;
