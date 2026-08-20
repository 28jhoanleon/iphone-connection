/**
 * Subida de fotos.  src/app/api/foto/route.ts  (reemplaza al actual)
 *
 * Antes solo andaba en local porque normalizaba con Python y escribía al disco.
 * Ahora hay dos caminos según dónde corra:
 *
 *   local  → Python/Pillow, igual que siempre. sharp no existe para
 *            android-arm64, así que en Termux nunca se toca.
 *   Vercel → sharp, que ahí sí funciona (Linux x64), y commit al repo.
 *
 * sharp va en optionalDependencies y se importa dinámico: si npm no logra
 * instalarlo en Termux, el proyecto sigue funcionando porque en local ese
 * import nunca se ejecuta.
 *
 * Los dos caminos aplican los mismos números que scripts/normalizar-una.py,
 * porque una foto subida a mano tiene que quedar indistinguible del resto.
 */
import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { guardar, puedeEscribir } from "@/lib/escribir";

/**
 * sharp se carga por createRequire y no por import().
 *
 * Con import("sharp") webpack intenta resolver el módulo AL COMPILAR, aunque la
 * rama que lo usa solo corra en Vercel. En Termux no hay binario para
 * android-arm64, así que la ruta entera fallaba antes de ejecutar una línea.
 * serverExternalPackages tampoco alcanza en modo dev.
 *
 * createRequire devuelve un require que webpack no rastrea: el módulo se busca
 * recién cuando la función se ejecuta, o sea nunca en local.
 */
const requerirNativo = createRequire(process.cwd() + "/next.config.ts");

const ejecutar = promisify(execFile);

const DESTINO = "public/productos";
const LADO = 1000;
const OBJETIVO = 0.62;      // media geométrica del producto sobre el lienzo
const TOPE = 0.86;          // ningún producto supera esto de alto o ancho
const UMBRAL_FONDO = 244;
const CENTRO_Y = 0.46;      // centrar matemático se ve bajo cuando hay sombra

// Acepta A192 y también A192-2, las que salen de expandir-colores.py
const REF = /^[A-Z]\d{3}(-\d+)?$/;

export const runtime = "nodejs";
const enVercel = () => process.env.VERCEL === "1";

/** Normaliza con sharp. Solo se usa en Vercel. */
async function normalizarSharp(entrada: Buffer): Promise<Buffer> {
  // El módulo puede llegar como función (CommonJS) o envuelto en { default }
  // según cómo lo empaquete el bundler de producción. Antes se asumía lo primero
  // y en Vercel fallaba con "no es una función", que minificado no dice nada.
  const mod = requerirNativo("sharp");
  const sharp = (mod?.default ?? mod) as typeof import("sharp");
  if (typeof sharp !== "function") {
    throw new Error(
      `sharp no se cargó como función (llegó ${typeof mod}). Revisar la instalación en Vercel.`,
    );
  }

  // Recorte del fondo: se busca la caja del producto ignorando el blanco.
  const gris = await sharp(entrada).greyscale().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = gris;
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[y * info.width + x] < UMBRAL_FONDO) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error("La imagen parece estar en blanco.");

  const ancho = x1 - x0 + 1;
  const alto = y1 - y0 + 1;
  const recorte = await sharp(entrada)
    .extract({ left: x0, top: y0, width: ancho, height: alto })
    .toBuffer();

  // Escala por media geométrica, con tope de alto y de ancho para que nada se
  // desborde. Nunca deforma: mantiene la proporción.
  let escala = (OBJETIVO * LADO) / Math.sqrt(ancho * alto);
  escala = Math.min(escala, (TOPE * LADO) / ancho, (TOPE * LADO) / alto);
  const nw = Math.max(1, Math.round(ancho * escala));
  const nh = Math.max(1, Math.round(alto * escala));

  const escalado = await sharp(recorte).resize(nw, nh, { fit: "fill" }).toBuffer();

  return sharp({
    create: { width: LADO, height: LADO, channels: 3, background: "#ffffff" },
  })
    .composite([
      {
        input: escalado,
        left: Math.round((LADO - nw) / 2),
        top: Math.round((LADO - nh) * CENTRO_Y),
      },
    ])
    .webp({ quality: 92 })
    .toBuffer();
}

/** Normaliza con Python. Solo se usa en local. */
async function normalizarPython(entrada: Buffer, ref: string): Promise<void> {
  const tmp = path.join(DESTINO, `_tmp_${ref}`);
  await writeFile(tmp, entrada);
  try {
    await ejecutar("python3", ["scripts/normalizar-una.py", tmp, ref]);
  } finally {
    if (existsSync(tmp)) await unlink(tmp);
  }
}

export async function POST(req: NextRequest) {
  if (enVercel() && !puedeEscribir()) {
    return NextResponse.json(
      { error: "Falta GITHUB_TOKEN para guardar fotos desde el sitio publicado." },
      { status: 400 },
    );
  }

  try {
    const form = await req.formData();
    const ref = String(form.get("ref") ?? "").trim().toUpperCase();
    const archivo = form.get("archivo") as File | null;

    if (!REF.test(ref)) {
      return NextResponse.json({ error: "Referencia inválida." }, { status: 400 });
    }
    if (!archivo) {
      return NextResponse.json({ error: "No llegó ninguna imagen." }, { status: 400 });
    }
    if (archivo.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "La imagen supera los 25 MB." }, { status: 400 });
    }

    const entrada = Buffer.from(await archivo.arrayBuffer());
    const quien = req.headers.get("x-panel-usuario") || "panel";

    if (enVercel()) {
      const webp = await normalizarSharp(entrada);
      await guardar(`${DESTINO}/${ref}.webp`, webp, `foto ${ref} (${quien})`);
      return NextResponse.json({ ok: true, ref, via: "github" });
    }

    // se borran las otras extensiones para que no queden dos fotos del mismo producto
    for (const ext of [".jpg", ".jpeg", ".png"]) {
      const viejo = path.join(DESTINO, ref + ext);
      if (existsSync(viejo)) await unlink(viejo);
    }
    await normalizarPython(entrada, ref);
    return NextResponse.json({ ok: true, ref, via: "archivo" });
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
    // `local: true` es lo que habilita los botones de subida en el panel. Ahora
    // en Vercel también se puede subir, así que depende del token y no del disco.
    return NextResponse.json({ conFoto, local: puedeEscribir() });
  } catch {
    return NextResponse.json({ conFoto: [], local: puedeEscribir() });
  }
}
