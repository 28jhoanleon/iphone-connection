/**
 * Escritura de datos.  src/lib/escribir.ts
 *
 * En local escribe el archivo. En Vercel hace un commit por la API de GitHub y
 * Vercel redeploya solo. El repo sigue siendo la fuente de verdad y cada cambio
 * queda con autor y fecha.
 *
 * RUTAS_PERMITIDAS es la parte importante. El token puede escribir todo el repo,
 * pero este módulo solo deja tocar datos e imágenes de producto. Si mañana un
 * endpoint recibe una ruta armada desde el navegador, no puede terminar
 * escribiendo código fuente. No cubre el caso de que el token se filtre —para
 * eso está que los WhatsApp vivan en variables de entorno y no en el repo.
 *
 * Variables en Vercel:
 *   GITHUB_TOKEN   fine-grained, solo este repo, Contents: Read+Write, con vencimiento
 *   GITHUB_REPO    28jhoanleon/iphone-connection
 *   GITHUB_RAMA    main
 */
import { readFile, writeFile } from "node:fs/promises";

const EN_VERCEL = process.env.VERCEL === "1";

const RUTAS_PERMITIDAS = [/^data\/[\w.-]+\.json$/, /^public\/productos\/[\w.-]+\.(webp|jpg|png)$/];

function validar(ruta: string) {
  if (!RUTAS_PERMITIDAS.some((r) => r.test(ruta))) {
    throw new Error(`Ruta no permitida: ${ruta}`);
  }
}

export function puedeEscribir(): boolean {
  return !EN_VERCEL || Boolean(process.env.GITHUB_TOKEN);
}

export async function leer(ruta: string): Promise<string> {
  validar(ruta);
  if (!EN_VERCEL) return readFile(ruta, "utf8");
  const r = await fetch(api(ruta), { headers: cabeceras(), cache: "no-store" });
  if (!r.ok) throw new Error(`No se pudo leer ${ruta} (${r.status})`);
  return Buffer.from((await r.json()).content, "base64").toString("utf8");
}

/** @param motivo mensaje del commit: es el historial que después explica un cambio de precio. */
export async function guardar(ruta: string, contenido: string | Buffer, motivo: string) {
  validar(ruta);
  const buf = typeof contenido === "string" ? Buffer.from(contenido, "utf8") : contenido;

  if (!EN_VERCEL) {
    await writeFile(ruta, buf);
    return { via: "archivo" as const };
  }
  if (!process.env.GITHUB_TOKEN) throw new Error("Falta GITHUB_TOKEN en Vercel.");

  // Se relee el sha justo antes de escribir: si Jhoan y Bryan tocan lo mismo a
  // la vez, GitHub rechaza el segundo en vez de pisarlo en silencio.
  const previo = await fetch(api(ruta), { headers: cabeceras(), cache: "no-store" });
  const sha = previo.ok ? (await previo.json()).sha : undefined;

  const r = await fetch(api(ruta), {
    method: "PUT",
    headers: { ...cabeceras(), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: motivo,
      content: buf.toString("base64"),
      branch: process.env.GITHUB_RAMA || "main",
      sha,
    }),
  });

  if (r.status === 409) throw new Error("Alguien más guardó recién. Recargá y probá otra vez.");
  if (!r.ok) throw new Error(`GitHub rechazó el cambio (${r.status}).`);
  return { via: "github" as const };
}

function api(ruta: string) {
  const repo = process.env.GITHUB_REPO || "28jhoanleon/iphone-connection";
  const rama = process.env.GITHUB_RAMA || "main";
  return `https://api.github.com/repos/${repo}/contents/${ruta}?ref=${rama}`;
}

function cabeceras() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
  };
}
