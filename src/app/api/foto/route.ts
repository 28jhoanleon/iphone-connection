import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

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

/** Recorta el fondo, normaliza la escala y agrega la sombra de apoyo. */
async function normalizar(buffer: Buffer): Promise<Buffer> {
  // aplanar transparencia sobre blanco antes de medir
  const plano = await sharp(buffer)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .toColorspace("srgb")
    .toBuffer();

  const { data, info } = await sharp(plano)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // El fondo no siempre es blanco: muchas fotos vienen sobre gris claro o beige.
  // Se toma el tono de las cuatro esquinas y, si coinciden, se usa ese valor
  // como fondo. Así se recorta igual de bien sea cual sea el color.
  const esquinas = [
    data[0],
    data[info.width - 1],
    data[(info.height - 1) * info.width],
    data[info.height * info.width - 1],
  ];
  const fondoTono = Math.round(esquinas.reduce((a, b) => a + b, 0) / 4);
  const uniforme = Math.max(...esquinas) - Math.min(...esquinas) < 12;
  const limite = uniforme && fondoTono > 150 ? fondoTono - 10 : UMBRAL_FONDO;

  // recuadro del producto: primera y última fila y columna con contenido
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[y * info.width + x] < limite) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error("La imagen está vacía o es toda blanca.");

  const ancho = x1 - x0 + 1;
  const alto = y1 - y0 + 1;

  // escala por superficie: un teléfono vertical y una consola apaisada
  // terminan ocupando la misma presencia visual
  let escala = (LADO * OBJETIVO) / Math.sqrt(ancho * alto);
  escala = Math.min(escala, (LADO * TOPE) / alto, (LADO * TOPE) / ancho);

  const nw = Math.max(1, Math.round(ancho * escala));
  const nh = Math.max(1, Math.round(alto * escala));

  const producto = await sharp(plano)
    .extract({ left: x0, top: y0, width: ancho, height: alto })
    .resize(nw, nh, { fit: "fill" })
    .toBuffer();

  // sombra elíptica bajo la base, igual para todos
  const cx = LADO / 2;
  const baseY = Math.round((LADO - nh) / 2 + nh);
  const rx = Math.max(12, Math.round((nw * 0.86) / 2));
  const ry = Math.max(5, Math.round((LADO * 0.03) / 2));
  const cy = Math.min(LADO - ry - 4, baseY + 10);

  const sombra = Buffer.from(
    `<svg width="${LADO}" height="${LADO}">
       <defs><filter id="b"><feGaussianBlur stdDeviation="18"/></filter></defs>
       <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"
                fill="#000" opacity="0.24" filter="url(#b)"/>
     </svg>`,
  );

  return sharp({
    create: { width: LADO, height: LADO, channels: 3, background: "#FFFFFF" },
  })
    .composite([
      { input: sombra, top: 0, left: 0 },
      { input: producto, top: Math.round((LADO - nh) / 2), left: Math.round((LADO - nw) / 2) },
    ])
    .webp({ quality: 90 })
    .toBuffer();
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
    const salida = await normalizar(entrada);

    // se borran las otras extensiones para que no queden dos fotos del mismo producto
    for (const ext of [".jpg", ".jpeg", ".png"]) {
      const viejo = path.join(DESTINO, ref + ext);
      if (existsSync(viejo)) await unlink(viejo);
    }
    await writeFile(path.join(DESTINO, `${ref}.webp`), salida);

    return NextResponse.json({ ok: true, ref, bytes: salida.length });
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
