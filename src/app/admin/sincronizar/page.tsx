import fs from "node:fs";
import { precio } from "@/lib/formato";

export const metadata = { title: "Sincronización", robots: { index: false } };

interface Cambio { nombre: string; antes?: number; despues?: number; variacion?: number;
  precio?: number; categoria?: string; ref?: string; campo?: string }
interface Pendientes {
  fecha: string; filas: number;
  precios: Cambio[]; nuevos: Cambio[]; salidos: Cambio[]; otros: Cambio[];
}

function leer(): Pendientes | null {
  try {
    return JSON.parse(fs.readFileSync("data/cambios-pendientes.json", "utf8"));
  } catch {
    return null;
  }
}

/**
 * Revisión de cambios de la planilla antes de publicarlos.
 *
 * La planilla es del proveedor: sus errores llegarían al sitio en minutos si se
 * leyera en vivo. Acá se ve qué cambió y recién después se aplica.
 */
export default function Sincronizar() {
  const p = leer();

  return (
    <div className="contenedor max-w-[860px] py-10">
      <p className="etiqueta mb-3">Panel interno</p>
      <h1 className="text-3xl font-semibold tracking-[-.035em]">Sincronización con la planilla</h1>

      {!p ? (
        <div className="mt-8 rounded-lg border border-line p-6">
          <p className="text-mute">Todavía no se leyó la planilla.</p>
          <pre className="mt-4 overflow-x-auto rounded-md bg-surface p-4 font-data text-[12.5px]">
python3 scripts/sincronizar-planilla.py
          </pre>
        </div>
      ) : (
        <>
          <p className="mt-2 font-data text-[11.5px] tracking-[.06em] text-mute-soft">
            ÚLTIMA LECTURA {p.fecha.replace("T", " · ")} — {p.filas} FILAS
          </p>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([["Precios", p.precios.length], ["Nuevos", p.nuevos.length],
               ["Salen", p.salidos.length], ["Otros", p.otros.length]] as const).map(([t, n]) => (
              <div key={t} className="rounded-lg border border-line p-4">
                <p className="text-3xl font-semibold tracking-[-.03em]">{n}</p>
                <p className="mt-0.5 text-[13px] text-mute">{t}</p>
              </div>
            ))}
          </div>

          {p.precios.length > 0 && (
            <section className="mt-9">
              <h2 className="etiqueta mb-3">Cambios de precio</h2>
              <div className="overflow-hidden rounded-lg border border-line">
                {p.precios.map((c, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 text-[14px] last:border-0">
                    <span className="min-w-0 flex-1 truncate">{c.nombre}</span>
                    <span className="whitespace-nowrap font-data text-[12.5px] text-mute">
                      {precio(c.antes!)} → <b className="text-ink">{precio(c.despues!)}</b>
                    </span>
                    <span className={`w-16 text-right font-data text-[12px] ${
                      (c.variacion ?? 0) > 0 ? "text-aviso-texto" : "text-mute"}`}>
                      {(c.variacion ?? 0) > 0 ? "+" : ""}{c.variacion}%
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {p.nuevos.length > 0 && (
            <section className="mt-9">
              <h2 className="etiqueta mb-3">Productos nuevos</h2>
              <p className="mb-3 text-[13.5px] text-mute">
                Van a entrar sin fotografía hasta que se agregue la maestra del modelo.
              </p>
              <div className="overflow-hidden rounded-lg border border-line">
                {p.nuevos.map((c, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 text-[14px] last:border-0">
                    <span className="min-w-0 flex-1 truncate">{c.nombre}</span>
                    <span className="font-data text-[11px] text-mute-soft">{c.categoria}</span>
                    <span className="whitespace-nowrap font-data text-[12.5px]">{precio(c.precio!)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {p.salidos.length > 0 && (
            <section className="mt-9">
              <h2 className="etiqueta mb-3">Ya no están en la planilla</h2>
              <div className="overflow-hidden rounded-lg border border-line">
                {p.salidos.map((c, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 text-[14px] last:border-0">
                    <span className="min-w-0 flex-1 truncate text-mute">{c.nombre}</span>
                    <span className="font-data text-[11px] text-mute-soft">#{c.ref}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="mt-10 rounded-lg border border-line bg-surface p-5">
            <h2 className="mb-2 text-[15px] font-semibold">Para aplicar estos cambios</h2>
            <pre className="overflow-x-auto rounded-md bg-paper p-4 font-data text-[12.5px]">
python3 scripts/sincronizar-planilla.py --aplicar{"\n"}git add -A && git commit -m "sync catalogo" && git push
            </pre>
            <p className="mt-3 text-[13px] text-mute">
              Regenera imágenes, valida el catálogo y actualiza el buscador.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
