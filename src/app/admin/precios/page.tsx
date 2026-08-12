import fs from "node:fs";
import { todasLasUnidades } from "@/lib/catalogo";
import EditarPrecios, { type Ejemplo } from "@/components/admin/EditarPrecios";

export const metadata = { title: "Precios", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function Precios() {
  const cfg = JSON.parse(fs.readFileSync("data/precios.json", "utf8"));
  const local = process.env.VERCEL !== "1";
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
        local={local}
      />

      <div className="mt-4 rounded-lg border border-line p-5">
        <h2 className="text-[15px] font-semibold">Después de cambiarlos</h2>
        <p className="mt-1 text-[13.5px] leading-relaxed text-mute">
          Los precios se recalculan al actualizar el catálogo desde el panel.
        </p>
      </div>
    </div>
  );
}
