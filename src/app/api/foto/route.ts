/**
 * Tipo de cambio y márgenes.  src/app/api/precios/route.ts  (reemplaza al actual)
 *
 * Cambia respecto de la versión anterior:
 *   - acepta margenPorRef y bandasPorCategoria además del margen por categoría
 *   - escribe por la capa `escribir`, así que funciona en Vercel además de local
 *
 * Los topes de seguridad se mantienen y se amplían: este endpoint define el
 * precio de todo el sitio de una sola vez, y ahora además se puede tocar desde
 * un teléfono. Un cero de más acá se publica solo.
 */
import { NextRequest, NextResponse } from "next/server";
import { leer, guardar, puedeEscribir } from "@/lib/escribir";

const ARCHIVO = "data/precios.json";
export const runtime = "nodejs";

const MARGEN_MAX = 2000;

export async function GET() {
  return NextResponse.json(JSON.parse(await leer(ARCHIVO)));
}

export async function POST(req: NextRequest) {
  if (!puedeEscribir()) {
    return NextResponse.json(
      { error: "Falta configurar GITHUB_TOKEN para guardar desde el sitio publicado." },
      { status: 400 },
    );
  }

  try {
    const body = await req.json();
    const cfg = JSON.parse(await leer(ARCHIVO));
    const detalle: string[] = [];

    if (body.tcRespaldo !== undefined) {
      const tc = Number(body.tcRespaldo);
      if (!Number.isFinite(tc) || tc < 100 || tc > 100000) {
        return NextResponse.json({ error: "El tipo de cambio no parece válido." }, { status: 400 });
      }
      if (Math.round(tc) !== cfg.tcRespaldo) {
        detalle.push(`TC ${cfg.tcRespaldo} → ${Math.round(tc)}`);
        cfg.tcRespaldo = Math.round(tc);
      }
    }

    if (body.margenPorCategoria) {
      for (const [cat, usd] of Object.entries(body.margenPorCategoria as Record<string, number>)) {
        if (!Number.isFinite(usd) || usd < 0 || usd > MARGEN_MAX) {
          return NextResponse.json({ error: `El margen de ${cat} no parece válido.` }, { status: 400 });
        }
      }
      cfg.margenPorCategoria = { ...cfg.margenPorCategoria, ...body.margenPorCategoria };
      detalle.push(`márgenes por categoría`);
    }

    // null borra el override y devuelve el producto a la regla general.
    if (body.margenPorRef) {
      const actual = { ...(cfg.margenPorRef ?? {}) };
      for (const [ref, usd] of Object.entries(body.margenPorRef as Record<string, number | null>)) {
        if (usd === null) {
          delete actual[ref];
          continue;
        }
        if (!Number.isFinite(usd) || usd < 0 || usd > MARGEN_MAX) {
          return NextResponse.json({ error: `El margen de ${ref} no parece válido.` }, { status: 400 });
        }
        actual[ref] = usd;
      }
      cfg.margenPorRef = actual;
      detalle.push(`${Object.keys(body.margenPorRef).length} producto(s)`);
    }

    if (body.bandasPorCategoria) {
      for (const [cat, tramos] of Object.entries(
        body.bandasPorCategoria as Record<string, { hasta: number | null; margen: number }[]>,
      )) {
        if (!Array.isArray(tramos) || tramos.length === 0) {
          return NextResponse.json({ error: `Las bandas de ${cat} están vacías.` }, { status: 400 });
        }
        // El último tramo debe ser abierto, si no hay costos que caen fuera de
        // toda banda y el producto se cobra con la regla de categoría sin aviso.
        if (tramos[tramos.length - 1].hasta !== null) {
          return NextResponse.json(
            { error: `La última banda de ${cat} tiene que ser "en adelante".` },
            { status: 400 },
          );
        }
        for (const t of tramos) {
          if (!Number.isFinite(t.margen) || t.margen < 0 || t.margen > MARGEN_MAX) {
            return NextResponse.json({ error: `Una banda de ${cat} no parece válida.` }, { status: 400 });
          }
        }
      }
      cfg.bandasPorCategoria = { ...cfg.bandasPorCategoria, ...body.bandasPorCategoria };
      detalle.push(`bandas`);
    }

    const { via } = await guardar(
      ARCHIVO,
      JSON.stringify(cfg, null, 2),
      `precios: ${detalle.join(", ") || "ajuste"}`,
    );

    return NextResponse.json({ ok: true, via, ...cfg });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo guardar." },
      { status: 500 },
    );
  }
}
