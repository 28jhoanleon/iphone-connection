/**
 * Permisos de la cuenta secundaria.  src/app/api/permisos/route.ts
 *
 * Sólo la cuenta principal puede escribir acá. El middleware ya distingue quién
 * es y lo manda en x-panel-usuario; sin esa comprobación, la cuenta secundaria
 * podría ampliarse los permisos sola y todo el mecanismo sería decorativo.
 *
 * Sincronizar no figura entre las secciones: está reservado en el middleware y
 * no se negocia desde acá.
 */
import { NextRequest, NextResponse } from "next/server";
import { leer, guardar, puedeEscribir } from "@/lib/escribir";

const ARCHIVO = "data/permisos.json";
const SECCIONES = ["precios", "fotos", "productos", "contenido", "publicar"] as const;

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(JSON.parse(await leer(ARCHIVO)));
}

export async function POST(req: NextRequest) {
  if (req.headers.get("x-panel-usuario") !== "jhoan") {
    return NextResponse.json(
      { error: "Sólo la cuenta principal puede cambiar los permisos." },
      { status: 403 },
    );
  }
  if (!puedeEscribir()) {
    return NextResponse.json(
      { error: "Falta configurar GITHUB_TOKEN para guardar desde el sitio publicado." },
      { status: 400 },
    );
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const actual = JSON.parse(await leer(ARCHIVO)) as Record<string, boolean>;

    for (const s of SECCIONES) {
      if (typeof body[s] === "boolean") actual[s] = body[s] as boolean;
    }

    const { via } = await guardar(
      ARCHIVO,
      JSON.stringify(actual, null, 2),
      "permisos: ajuste de la cuenta secundaria",
    );
    return NextResponse.json({ ok: true, via, ...actual });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo guardar." },
      { status: 500 },
    );
  }
}
