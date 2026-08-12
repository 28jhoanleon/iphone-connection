import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const ejecutar = promisify(execFile);

/**
 * Subida de fotos desde el panel.
 *
 * Aplica la misma normalización que el pipeline de scripts, para que una foto
 * subida a mano quede indistinguible del resto del catálogo: recorte del fondo,
 * escala por superficie aparente, lienzo blanco de 1000x1000 y sombra de apoyo.
 *
 * Sólo funciona con el servidor de desarrollo corriendo en la máquina propia:
 * el sistema de archivos de Vercel es de sólo lectura. Es intencional — el
 * trabajo de carga se hace en local y se publica con git.
 */

const DESTINO = "public/productos";
const LADO = 1000;
const OBJETIVO = 0.62;      // media geométrica del producto sobre el lienzo
const TOPE = 0.86;          // ningún producto supera esto de alto o ancho
const UMBRAL_FONDO = 244;

export const runtime = "nodejs";

function esProduccion() {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
}

/**
 * Normaliza con Python en lugar de sharp.
 *
 * sharp necesita binarios nativos que no existen para android-arm64, así que en
 * Termux no carga. Pillow ya está instalado y produce el mismo resultado, así
 * que la normalización se delega al script que el proyecto usa para el catálogo.
 */
async function normalizar(buffer: Buffer, ref: string): Promise<void> {
  const tmp = path.join(DESTINO, `_tmp_${ref}`);
  await writeFile(tmp, buffer);
  try {
    await ejecutar("python3", ["scripts/normalizar-una.py", tmp, ref]);
  } finally {
    if (existsSync(tmp)) await unlink(tmp);
  }
}

export async function POST(req: NextRequest) {
  if (esProduccion()) {
    return NextResponse.json(
      { error: "La subida sólo funciona con el servidor local: npm run dev" },
      { status: 400 },
    );
  }

  try {
    const form = await req.formData();
    const ref = String(form.get("ref") ?? "").trim().toUpperCase();
    const archivo = form.get("archivo") as File | null;

    if (!/^[A-Z]\d{3}$/.test(ref)) {
      return NextResponse.json({ error: "Referencia inválida." }, { status: 400 });
    }
    if (!archivo) {
      return NextResponse.json({ error: "No llegó ninguna imagen." }, { status: 400 });
    }
    if (archivo.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "La imagen supera los 25 MB." }, { status: 400 });
    }

    const entrada = Buffer.from(await archivo.arrayBuffer());

    // se borran las otras extensiones para que no queden dos fotos del mismo producto
    for (const ext of [".jpg", ".jpeg", ".png"]) {
      const viejo = path.join(DESTINO, ref + ext);
      if (existsSync(viejo)) await unlink(viejo);
    }
    await normalizar(entrada, ref);

    return NextResponse.json({ ok: true, ref });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo procesar la imagen." },
      { status: 500 },
    );
  }
}

/** Devuelve qué referencias ya tienen fotografía real. */
export async function GET() {
  try {
    const archivos = await readdir(DESTINO);
    const conFoto = archivos
      .filter((f) => /\.(webp|jpg|jpeg|png)$/i.test(f))
      .map((f) => f.replace(/\.[^.]+$/, ""));
    return NextResponse.json({ conFoto, local: !esProduccion() });
  } catch {
    return NextResponse.json({ conFoto: [], local: !esProduccion() });
  }
}
