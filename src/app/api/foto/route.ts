/**
 * Subida de fotos.  src/app/api/foto/route.ts
 *
 * El servidor ya no procesa imágenes. La normalización —recorte, escala a 0.62,
 * centrado en 1000×1000, webp— la hace el navegador en src/lib/normalizar-canvas.ts
 * y acá solo se guarda lo que llega.
 *
 * Antes esto dependía de sharp en Vercel y de Python en local. sharp es un
 * módulo nativo: no hay binario para android-arm64 y en Vercel el bundler nunca
 * terminó de resolverlo, así que subir fotos solo funcionaba levantando el
 * servidor local. Sacarlo del servidor elimina esa clase de problema entera y
 * deja el mismo camino para los dos socios, desde cualquier teléfono.
 *
 * Queda el camino con Python para una subida sin la bandera `yaNormalizada`
 * —un curl, un script—, pero solo en local. Desde el sitio publicado la imagen
 * tiene que venir ya normalizada.
 */
import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { leer, guardar, puedeEscribir } from "@/lib/escribir";


const ejecutar = promisify(execFile);

const DESTINO = "public/productos";
const VALIDADAS = "data/imagenes-validadas.json";
const LADO = 1000;
const OBJETIVO = 0.62;      // media geométrica del producto sobre el lienzo
const TOPE = 0.86;          // ningún producto supera esto de alto o ancho
const UMBRAL_FONDO = 244;
const CENTRO_Y = 0.46;      // centrar matemático se ve bajo cuando hay sombra

// Acepta A192 y también A192-2, las que salen de expandir-colores.py
const REF = /^[A-Z]\d{3}(-\d+)?$/;

export const runtime = "nodejs";
const enVercel = () => process.env.VERCEL === "1";

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
    // El panel normaliza en el navegador con canvas y avisa con esta bandera.
    // Cuando viene, la imagen ya está recortada, escalada y en webp: el servidor
    // solo la guarda. Es lo que permite subir desde el sitio publicado sin
    // depender de sharp ni de Python.
    const yaNormalizada = form.get("yaNormalizada") === "1";

    if (yaNormalizada) {
      await guardar(`${DESTINO}/${ref}.webp`, entrada, `foto ${ref} (${quien})`);

      // Se registra la firma en el índice de validadas. Sin esto la foto queda
      // publicada pero sin validar, que es justo lo que el proyecto no permite:
      // verificar-imagenes falla y clasificar-calidad la sigue contando como
      // "sin fotografía propia".
      const firma = String(form.get("firma") ?? "");
      if (/^[0-9a-f]{16}$/.test(firma)) {
        try {
          const validadas = JSON.parse(await leer(VALIDADAS)) as Record<string, string>;
          if (validadas[ref] !== firma) {
            validadas[ref] = firma;
            await guardar(
              VALIDADAS,
              JSON.stringify(validadas, null, 2),
              `validar foto ${ref} (${quien})`,
            );
          }
        } catch {
          // Si el índice no se puede leer o escribir, la foto ya quedó guardada.
          // Se prefiere avisar en el próximo `npm run datos` antes que perderla.
        }
      }

      // en local pueden haber quedado otras extensiones de una carga anterior
      for (const ext of [".jpg", ".jpeg", ".png"]) {
        const viejo = path.join(DESTINO, ref + ext);
        if (!enVercel() && existsSync(viejo)) await unlink(viejo);
      }
      return NextResponse.json({ ok: true, ref, via: enVercel() ? "github" : "archivo" });
    }

    if (enVercel()) {
      return NextResponse.json(
        { error: "La imagen tiene que normalizarse en el navegador antes de subirse." },
        { status: 400 },
      );
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
