"use client";

import { useState } from "react";

export interface Ejemplo {
  categoria: string;
  nombre: string;
  costoUSD: number;
  unidades: number;
}

/**
 * Tipo de cambio y márgenes.
 *
 * El margen es un monto fijo en dólares por categoría, no un porcentaje: el
 * trabajo por venta —revisión, garantía, asesoramiento— no depende del precio
 * del equipo. Un 15% deja 2 dólares en un cargador y 375 en una notebook.
 *
 * Cada fila muestra en vivo cómo queda un producto real de esa categoría, para
 * que el efecto se vea antes de guardar y no después en el sitio.
 */
export default function EditarPrecios({
  tcInicial, margenes, porDefecto, redondeo, ejemplos, local,
}: {
  tcInicial: number;
  margenes: Record<string, number>;
  porDefecto: number;
  redondeo: number;
  ejemplos: Ejemplo[];
  local: boolean;
}) {
  const [tc, setTc] = useState(String(tcInicial));
  const [vals, setVals] = useState<Record<string, string>>(
    Object.fromEntries(ejemplos.map((e) => [e.categoria, String(margenes[e.categoria] ?? porDefecto)])),
  );
  const [estado, setEstado] = useState<"libre" | "guardando" | "listo" | "error">("libre");
  const [mensaje, setMensaje] = useState("");

  const tcNum = Number(tc) || 0;

  function precioDe(e: Ejemplo) {
    const m = Number(vals[e.categoria]) || 0;
    const bruto = (e.costoUSD + m) * tcNum;
    return Math.round(bruto / redondeo) * redondeo;
  }

  async function guardar() {
    setEstado("guardando");
    setMensaje("");
    try {
      const r = await fetch("/api/precios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tcRespaldo: tcNum,
          margenPorCategoria: Object.fromEntries(
            Object.entries(vals).map(([k, v]) => [k, Number(v) || 0]),
          ),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setEstado("listo");
      setMensaje("Guardado. Actualizá el catálogo para recalcular los precios.");
    } catch (e) {
      setEstado("error");
      setMensaje(e instanceof Error ? e.message : "No se pudo guardar.");
    }
  }

  const campo =
    "h-11 w-full rounded-md border border-line bg-paper px-3 text-[15px] outline-none transition focus:border-ink disabled:opacity-60";

  return (
    <>
      <div className="rounded-lg border border-line p-5">
        <h2 className="text-[15px] font-semibold">Tipo de cambio</h2>
        <p className="mt-1 text-[13.5px] leading-relaxed text-mute">
          Es interno: define los precios pero no se publica en ningún lado.
        </p>
        <div className="mt-3 max-w-[200px]">
          <input
            inputMode="numeric"
            value={tc}
            onChange={(e) => setTc(e.target.value.replace(/\D/g, ""))}
            className={campo}
            disabled={!local}
            aria-label="Tipo de cambio"
          />
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-line p-5">
        <h2 className="text-[15px] font-semibold">Margen por categoría</h2>
        <p className="mt-1 text-[13.5px] leading-relaxed text-mute">
          Monto fijo en dólares que se suma al costo. A la derecha, cómo queda un
          producto real de esa categoría con el valor actual.
        </p>

        <div className="mt-4 space-y-2">
          {ejemplos.map((e) => (
            <div key={e.categoria} className="rounded-md border border-line p-3">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium">{e.categoria}</p>
                  <p className="font-data text-[10.5px] tracking-[.06em] text-mute-soft">
                    {e.unidades} PRODUCTOS
                  </p>
                </div>
                <div className="w-[86px] shrink-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[13px] text-mute">+US$</span>
                    <input
                      inputMode="numeric"
                      value={vals[e.categoria] ?? ""}
                      onChange={(ev) =>
                        setVals((v) => ({
                          ...v,
                          [e.categoria]: ev.target.value.replace(/\D/g, ""),
                        }))
                      }
                      className={`${campo} text-center`}
                      disabled={!local}
                      aria-label={`Margen de ${e.categoria}`}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-line pt-2">
                <span className="min-w-0 truncate text-[12.5px] text-mute">
                  {e.nombre} · USD {e.costoUSD}
                </span>
                <b className="whitespace-nowrap text-[15px] font-semibold tracking-[-.02em]">
                  $ {precioDe(e).toLocaleString("es-AR")}
                </b>
              </div>
            </div>
          ))}
        </div>

        {local ? (
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              onClick={guardar}
              disabled={estado === "guardando"}
              className="inline-flex h-11 items-center rounded-full bg-ink px-6 text-[14px] font-medium text-paper transition hover:-translate-y-px disabled:opacity-40"
            >
              {estado === "guardando" ? "Guardando…" : "Guardar"}
            </button>
            {mensaje && (
              <span className={`text-[13px] ${estado === "error" ? "text-aviso-texto" : "text-mute"}`}>
                {mensaje}
              </span>
            )}
          </div>
        ) : (
          <p className="mt-5 text-[13px] text-mute">
            Para modificarlos, levantá el servidor local con{" "}
            <code className="font-data">npm run dev</code>.
          </p>
        )}
      </div>
    </>
  );
}
