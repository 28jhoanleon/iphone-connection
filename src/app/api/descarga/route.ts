import { NextResponse } from "next/server";
import { readdir, stat, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Devuelve la imagen más reciente de la carpeta de Descargas.
 *
 * Evita el paso de buscar el archivo en el explorador: se busca la foto en el
 * navegador, se descarga, y el panel la levanta sola. Es el flujo que ya
 * funcionaba con foto-hunter, ahora dentro del panel.
 */

const CARPETAS = [
  `${process.env.HOME}/storage/shared/Download`,
  `${process.env.HOME}/storage/shared/Pictures`,
  `${process.env.HOME}/Downloads`,
  "/sdcard/Download",
];

export const runtime = "nodejs";

export async function GET() {
  const carpeta = CARPETAS.find((c) => existsSync(c));
  if (!carpeta) {
    return NextResponse.json({ error: "No encontré la carpeta de Descargas." }, { status: 404 });
  }

  try {
    const archivos = await readdir(carpeta);
    const imagenes = archivos.filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
    if (imagenes.length === 0) {
      return NextResponse.json({ error: "No hay imágenes en Descargas." }, { status: 404 });
    }

    const conFecha = await Promise.all(
      imagenes.map(async (f) => {
        const s = await stat(path.join(carpeta, f));
        return { f, t: s.mtimeMs };
      }),
    );
    conFecha.sort((a, b) => b.t - a.t);
    const ultima = conFecha[0];

    const datos = await readFile(path.join(carpeta, ultima.f));
    return NextResponse.json({
      nombre: ultima.f,
      base64: datos.toString("base64"),
    });
  } catch {
    return NextResponse.json({ error: "No pude leer la carpeta." }, { status: 500 });
  }
}
