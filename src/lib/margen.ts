/**
 * Resolución del margen de una unidad.  src/lib/margen.ts
 *
 * El margen fijo por categoría es correcto en la mayoría del catálogo, pero se
 * vuelve regresivo en la gama alta: 60 dólares sobre un iPhone 11 de 180 es un
 * 33%; sobre un 17 Pro Max de 1211 es un 4,9%. Le cobrás cinco veces más margen
 * relativo al equipo barato, que es el que menos capital inmoviliza y más rápido
 * rota. Estaba al revés.
 *
 * Las bandas corrigen eso sin volver al porcentaje —que inflaba la gama alta
 * fuera de mercado— porque el monto sigue siendo un número que elegís vos.
 *
 * Jerarquía, de más específico a más general. La primera que coincide gana:
 *   1. margenPorRef      — una unidad puntual. Es el único que gana siempre.
 *   2. margenPorModelo    — coincidencia por texto en el nombre del modelo.
 *   3. bandas[categoria]  — tramos por costo en dólares.
 *   4. margenPorCategoria — monto fijo.
 *   5. margenPorDefecto
 *
 * La ref manda sobre todo lo demás a propósito: en la gama alta el precio no lo
 * define la fórmula, lo define lo que cobran los demás en Rosario. La fórmula es
 * el piso, no el precio.
 */
import cfg from "../../data/precios.json";

export type Banda = { hasta: number | null; margen: number };

type ConMargen = {
  ref?: string;
  modelo: string;
  categoria: string;
  costoCentavos?: number | null;
};

export type Origen = "ref" | "modelo" | "banda" | "categoria" | "defecto";

/** Devuelve el margen y de dónde salió, para poder mostrarlo en el panel. */
export function resolverMargen(u: ConMargen): { usd: number; origen: Origen } {
  const c = cfg as Record<string, unknown>;

  const porRef = (c.margenPorRef ?? {}) as Record<string, number>;
  if (u.ref && Number.isFinite(porRef[u.ref])) {
    return { usd: porRef[u.ref], origen: "ref" };
  }

  const porModelo = (c.margenPorModelo ?? {}) as Record<string, number>;
  for (const [clave, usd] of Object.entries(porModelo)) {
    if (u.modelo.toLowerCase().includes(clave.toLowerCase())) {
      return { usd, origen: "modelo" };
    }
  }

  const bandas = (c.bandasPorCategoria ?? {}) as Record<string, Banda[]>;
  const tramos = bandas[u.categoria];
  if (tramos?.length && u.costoCentavos) {
    const costoUSD = u.costoCentavos / 100;
    // Se recorre en orden: el primer tramo cuyo techo supera al costo.
    // hasta: null es el último tramo, sin techo.
    for (const t of tramos) {
      if (t.hasta === null || costoUSD <= t.hasta) {
        return { usd: t.margen, origen: "banda" };
      }
    }
  }

  const porCat = (c.margenPorCategoria ?? {}) as Record<string, number>;
  if (Number.isFinite(porCat[u.categoria])) {
    return { usd: porCat[u.categoria], origen: "categoria" };
  }

  return { usd: (c.margenPorDefecto as number) ?? 50, origen: "defecto" };
}

/** Margen en centavos de dólar. Reemplaza a la versión de formato.ts. */
export function margenCentavos(u: ConMargen): number {
  return Math.round(resolverMargen(u).usd * 100);
}
