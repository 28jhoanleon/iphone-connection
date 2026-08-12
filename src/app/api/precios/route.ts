import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";

/**
 * Tipo de cambio y margen.
 *
 * Son los dos números que definen todos los precios del sitio: el catálogo
 * guarda el costo en dólares y el precio se calcula al mostrarlo. Cambiar acá
 * recalcula los 285 productos de una vez.
 */

const ARCHIVO = "data/precios.json";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(JSON.parse(await readFile(ARCHIVO, "utf8")));
}

export async function POST(req: NextRequest) {
  if (process.env.VERCEL === "1") {
    return NextResponse.json(
      { error: "Sólo funciona con el servidor local: npm run dev" },
      { status: 400 },
    );
  }

  try {
    const body = await req.json();
    const cfg = JSON.parse(await readFile(ARCHIVO, "utf8"));

    const tc = Number(body.tcRespaldo);
    const margen = Number(body.margen);

    // Rangos de seguridad: un cero o un dedazo acá publica 285 precios rotos.
    if (!Number.isFinite(tc) || tc < 100 || tc > 100000) {
      return NextResponse.json({ error: "El tipo de cambio no parece válido." }, { status: 400 });
    }
    if (!Number.isFinite(margen) || margen < 0 || margen > 2) {
      return NextResponse.json({ error: "El margen debe estar entre 0 y 200%." }, { status: 400 });
    }

    cfg.tcRespaldo = Math.round(tc);
    cfg.margen = Math.round(margen * 1000) / 1000;
    await writeFile(ARCHIVO, JSON.stringify(cfg, null, 2), "utf8");

    return NextResponse.json({ ok: true, ...cfg });
  } catch {
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
}
