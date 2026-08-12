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
    const margenes = body.margenPorCategoria as Record<string, number> | undefined;

    // Rangos de seguridad: un cero o un dedazo acá publica 285 precios rotos.
    if (!Number.isFinite(tc) || tc < 100 || tc > 100000) {
      return NextResponse.json({ error: "El tipo de cambio no parece válido." }, { status: 400 });
    }
    if (margenes) {
      for (const [cat, usd] of Object.entries(margenes)) {
        // tope de seguridad: un dedazo acá cambia el precio de toda una categoría
        if (!Number.isFinite(usd) || usd < 0 || usd > 2000) {
          return NextResponse.json(
            { error: `El margen de ${cat} no parece válido.` },
            { status: 400 },
          );
        }
      }
      cfg.margenPorCategoria = { ...cfg.margenPorCategoria, ...margenes };
    }

    cfg.tcRespaldo = Math.round(tc);
    await writeFile(ARCHIVO, JSON.stringify(cfg, null, 2), "utf8");

    return NextResponse.json({ ok: true, ...cfg });
  } catch {
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
}
