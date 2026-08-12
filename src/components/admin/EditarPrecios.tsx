"use client";

import { useState } from "react";

/**
 * Ajuste del tipo de cambio y el margen.
 *
 * Muestra en vivo cómo queda un producto de referencia antes de guardar: sin
 * eso, cambiar el margen es a ciegas y el error recién se ve en el sitio.
 */
export default function EditarPrecios({
  tcInicial, margenInicial, ejemploCosto, ejemploNombre, redondeo, local,
}: {
  tcInicial: number;
  margenInicial: number;
  ejemploCosto: number;
  ejemploNombre: string;
  redondeo: number;
  local: boolean;
}) {
  const [tc, setTc] = useState(String(tcInicial));
  const [margen, setMargen] = useState(String(Math.round(margenInicial * 100)));
  const [estado, setEstado] = useState<"libre" | "guardando" | "listo" | "error">("libre");
  const [mensaje, setMensaje] = useState("");

  const tcNum = Number(tc) || 0;
  const margenNum = (Number(margen) || 0) / 100;
  const bruto = ejemploCosto * tcNum * (1 + margenNum);
  const previo = Math.round(bruto / redondeo) * redondeo;
  const cambio = tcNum !== tcInicial || margenNum !== margenInicial;

  async function guardar() {
    setEstado("guardando");
    try {
      const r = await fetch("/api/precios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tcRespaldo: tcNum, margen: margenNum }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setEstado("listo");
      setMensaje("Guardado. Recargá el sitio para ver los precios nuevos.");
    } catch (e) {
      setEstado("error");
      setMensaje(e instanceof Error ? e.message : "No se pudo guardar.");
    }
  }

  const campo =
    "h-12 w-full rounded-md border border-line bg-paper px-3 text-[16px] outline-none transition focus:border-ink";

  return (
    <div className="rounded-lg border border-line p-5">
      <h2 className="text-[15px] font-semibold">Precios</h2>
      <p className="mt-1 text-[13.5px] leading-relaxed text-mute">
        Estos dos números definen todos los precios del sitio. El dólar es interno:
        no se publica en ningún lado.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] text-mute">Tipo de cambio</span>
          <input
            inputMode="numeric"
            value={tc}
            onChange={(e) => setTc(e.target.value.replace(/\D/g, ""))}
            className={campo}
            disabled={!local}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] text-mute">Margen (%)</span>
          <input
            inputMode="numeric"
            value={margen}
            onChange={(e) => setMargen(e.target.value.replace(/[^\d]/g, ""))}
            className={campo}
            disabled={!local}
          />
        </label>
      </div>

      <div className="mt-4 rounded-md bg-surface p-4">
        <p className="font-data text-[10.5px] uppercase tracking-[.1em] text-mute-soft">
          Vista previa
        </p>
        <p className="mt-1.5 text-[13.5px] text-mute">{ejemploNombre}</p>
        <p className="mt-1 text-[24px] font-semibold tracking-[-.03em]">
          $ {previo.toLocaleString("es-AR")}
        </p>
        <p className="mt-1 text-[12px] text-mute-soft">
          costo USD {ejemploCosto} × {tcNum} × {(1 + margenNum).toFixed(2)}
        </p>
      </div>

      {local ? (
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={guardar}
            disabled={!cambio || estado === "guardando"}
            className="inline-flex h-11 items-center rounded-full bg-ink px-6 text-[14px] font-medium text-paper transition hover:-translate-y-px disabled:opacity-40"
          >
            {estado === "guardando" ? "Guardando…" : "Guardar"}
          </button>
          {mensaje && (
            <span className={`text-[12.5px] ${estado === "error" ? "text-aviso-texto" : "text-mute"}`}>
              {mensaje}
            </span>
          )}
        </div>
      ) : (
        <p className="mt-4 text-[13px] text-mute">
          Para modificarlos, levantá el servidor local con <code className="font-data">npm run dev</code>.
        </p>
      )}
    </div>
  );
}
