import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

/**
 * Correcciones sobre productos del proveedor.
 *
 * El catálogo se regenera con cada sincronización, así que editar el JSON
 * directamente se pierde. Las correcciones viven aparte y se reaplican después
 * de cada importación: quedan aunque el proveedor vuelva a mandar el dato mal.
 */

const ARCHIVO = "data/correcciones.json";
export const runtime = "nodejs";

interface Correccion {
  ref: string;
  nombre?: string;
  color?: string;
  categoria?: string;
  marca?: string;
  oculto?: boolean;
}

async function leer(): Promise<Record<string, Correccion>> {
  if (!existsSync(ARCHIVO)) return {};
  try {
    return JSON.parse(await readFile(ARCHIVO, "utf8"));
  } catch {
    return {};
  }
}

export async function GET() {
  return NextResponse.json(await leer());
}

export async function POST(req: NextRequest) {
  if (process.env.VERCEL === "1") {
    return NextResponse.json(
      { error: "Sólo funciona con el servidor local: npm run dev" },
      { status: 400 },
    );
  }

  try {
    const c = (await req.json()) as Correccion;
    if (!/^[A-Z]\d{3}$/.test(c.ref ?? "")) {
      return NextResponse.json({ error: "Referencia inválida." }, { status: 400 });
    }

    const todas = await leer();
    const limpia: Correccion = { ref: c.ref };
    for (const k of ["nombre", "color", "categoria", "marca"] as const) {
      const v = c[k]?.trim();
      if (v) limpia[k] = v;
    }
    if (c.oculto) limpia.oculto = true;

    // una corrección sin contenido se elimina en vez de guardarse vacía
    if (Object.keys(limpia).length === 1) delete todas[c.ref];
    else todas[c.ref] = limpia;

    await writeFile(ARCHIVO, JSON.stringify(todas, null, 2), "utf8");
    return NextResponse.json({ ok: true, total: Object.keys(todas).length });
  } catch {
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
}
