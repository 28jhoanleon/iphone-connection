import { NextRequest, NextResponse } from "next/server";
import { leer as leerArchivo, guardar, puedeEscribir } from "@/lib/escribir";

/**
 * Correcciones sobre productos del proveedor.
 *
 * El catálogo se regenera con cada sincronización, así que editar el JSON
 * directamente se pierde. Las correcciones viven aparte y se reaplican después
 * de cada importación: quedan aunque el proveedor vuelva a mandar el dato mal.
 *
 * Escribe por la capa `escribir`, así que funciona igual desde el servidor local
 * y desde el sitio publicado. Antes se bloqueaba en Vercel y era una de las
 * cosas que el panel tenía que poder hacer desde el teléfono.
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
  try {
    return JSON.parse(await leerArchivo(ARCHIVO));
  } catch {
    // archivo inexistente o ilegible: se arranca vacío en vez de romper el panel
    return {};
  }
}

export async function GET() {
  return NextResponse.json(await leer());
}

export async function POST(req: NextRequest) {
  if (!puedeEscribir()) {
    return NextResponse.json(
      { error: "Falta configurar GITHUB_TOKEN para guardar desde el sitio publicado." },
      { status: 400 },
    );
  }

  const quien = req.headers.get("x-panel-usuario") || "panel";

  try {
    const c = (await req.json()) as Correccion;
    // acepta A192 y también A192-2, las que salen de expandir-colores.py
    if (!/^[A-Z]\d{3}(-\d+)?$/.test(c.ref ?? "")) {
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

    const { via } = await guardar(
      ARCHIVO,
      JSON.stringify(todas, null, 2),
      `correccion ${c.ref} (${quien})`,
    );
    return NextResponse.json({ ok: true, via, total: Object.keys(todas).length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo guardar." },
      { status: 500 },
    );
  }
}
