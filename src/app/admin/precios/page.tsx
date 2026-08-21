/**
 * Panel de precios.  src/app/admin/precios/page.tsx  (reemplaza al actual)
 *
 * Suma el margen por producto debajo del de categoría. El orden importa: la
 * categoría es lo que define el 95% del catálogo y tiene que verse primero; el
 * ajuste por producto es la excepción y va abajo.
 */
import { todasLasUnidades } from "@/lib/catalogo";
import { resolverMargen } from "@/lib/margen";
import { puedeEscribir } from "@/lib/escribir";
import EditarPrecios, { type Ejemplo } from "@/components/admin/EditarPrecios";
import MargenProducto, { type Fila } from "@/components/admin/MargenProducto";
import cfg from "@/data/precios.json";

export const metadata = { title: "Precios", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function Precios() {
  const editable = puedeEscribir();
  const unidades = todasLasUnidades();

  // un producto real por categoría, el de precio medio: los extremos engañan
  const porCat = new Map<string, typeof unidades>();
  for (const u of unidades) {
    if (!u.costoCentavos) continue;
    porCat.set(u.categoria, [...(porCat.get(u.categoria) ?? []), u]);
  }

  const ejemplos: Ejemplo[] = [...porCat.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([categoria, us]) => {
      const ord = [...us].sort((a, b) => (a.costoCentavos ?? 0) - (b.costoCentavos ?? 0));
      const medio = ord[Math.floor(ord.length / 2)];
      return {
        categoria,
        nombre: medio.nombre,
        costoUSD: Math.round((medio.costoCentavos ?? 0) / 100),
        unidades: us.length,
      };
    });

  const filas: Fila[] = unidades
    .filter((u) => u.costoCentavos)
    .map((u) => {
      const { usd, origen } = resolverMargen({
        ref: u.ref,
        modelo: u.modelo,
        categoria: u.categoria,
        costoCentavos: u.costoCentavos,
      });
      return {
        ref: u.ref,
        nombre: u.nombreCompleto ?? u.nombre,
        categoria: u.categoria,
        costoUSD: Math.round((u.costoCentavos ?? 0) / 100),
        margenVigente: usd,
        origen,
      };
    });

  return (
    <div className="contenedor max-w-[720px] py-8">
      <p className="etiqueta mb-2">Panel interno</p>
      <h1 className="mb-6 text-[clamp(26px,6vw,36px)] font-semibold tracking-[-.035em]">
        Precios
      </h1>

      <EditarPrecios
        tcInicial={cfg.tcRespaldo}
        margenes={cfg.margenPorCategoria ?? {}}
        porDefecto={cfg.margenPorDefecto ?? 50}
        redondeo={cfg.redondeoPesos}
        ejemplos={ejemplos}
        local={editable}
        totalPublicados={filas.length}
      />

      <MargenProducto
        filas={filas}
        tc={cfg.tcRespaldo}
        redondeo={cfg.redondeoPesos}
        local={editable}
      />

      <div className="mt-8 rounded-lg border border-line p-5">
        <h2 className="text-[15px] font-semibold">Cómo se resuelve un margen</h2>
        <p className="mt-1 text-[13.5px] leading-relaxed text-mute">
          Gana el primero que coincide: margen propio del producto, después por
          modelo, después la banda por costo de la categoría, y al final el monto
          fijo de la categoría.
        </p>
      </div>
    </div>
  );
}
