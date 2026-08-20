"use client";

/**
 * Margen por producto.  src/components/admin/MargenProducto.tsx
 *
 * La categoría define el 95% del catálogo y está bien que así sea. Este panel es
 * para el 5% donde la fórmula no manda: el equipo que hay que mover, el que está
 * caro contra el mercado, el que entró barato y conviene defender.
 *
 * Muestra siempre de dónde sale el margen vigente (categoría, banda, modelo o
 * ref) porque el error más caro acá no es poner un número mal: es tocar un
 * producto sin saber que ya estaba pisado por otra regla.
 *
 * El precio se recalcula en vivo. Ver el número final antes de guardar es lo que
 * evita publicar 300 precios rotos por un dedazo.
 */
import { useMemo, useState } from "react";

export interface Fila {
  ref: string;
  nombre: string;
  categoria: string;
  costoUSD: number;
  margenVigente: number;
  origen: "ref" | "modelo" | "banda" | "categoria" | "defecto";
}

const ETIQUETA: Record<Fila["origen"], string> = {
  ref: "propio",
  modelo: "por modelo",
  banda: "por banda",
  categoria: "por categoría",
  defecto: "por defecto",
};

export default function MargenProducto({
  filas, tc, redondeo, local,
}: { filas: Fila[]; tc: number; redondeo: number; local: boolean }) {
  const [busca, setBusca] = useState("");
  const [cambios, setCambios] = useState<Record<string, string>>({});
  const [estado, setEstado] = useState<"libre" | "guardando" | "listo" | "error">("libre");
  const [mensaje, setMensaje] = useState("");

  const visibles = useMemo(() => {
    const t = busca.trim().toLowerCase();
    const base = t
      ? filas.filter((f) => f.nombre.toLowerCase().includes(t) || f.ref.toLowerCase() === t)
      : filas.filter((f) => f.origen === "ref");
    return base.slice(0, 40);
  }, [filas, busca]);

  const precioDe = (f: Fila) => {
    const m = cambios[f.ref] === undefined ? f.margenVigente : Number(cambios[f.ref]) || 0;
    return Math.round(((f.costoUSD + m) * tc) / redondeo) * redondeo;
  };

  const pendientes = Object.keys(cambios).length;

  async function guardar() {
    setEstado("guardando");
    setMensaje("");
    try {
      const margenPorRef: Record<string, number | null> = {};
      for (const [ref, v] of Object.entries(cambios)) {
        // Vacío = borrar el override y volver a la regla general. Es importante
        // que se pueda deshacer sin editar el JSON a mano.
        margenPorRef[ref] = v.trim() === "" ? null : Number(v);
      }
      const r = await fetch("/api/precios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ margenPorRef }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "No se pudo guardar.");
      setEstado("listo");
      setMensaje(j.via === "github" ? "Guardado. El sitio se actualiza en un minuto." : "Guardado.");
      setCambios({});
    } catch (e) {
      setEstado("error");
      setMensaje(e instanceof Error ? e.message : "No se pudo guardar.");
    }
  }

  return (
    <section className="mt-10">
      <p className="etiqueta mb-2.5">Margen por producto</p>

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar producto o ref…"
        className="mb-4 w-full rounded-xl border border-black/10 px-4 py-3 text-[15px] outline-none focus:border-black/30"
      />

      {!busca && (
        <p className="mb-4 text-[13px] text-mute">
          {visibles.length
            ? `${visibles.length} con margen propio.`
            : "Ningún producto tiene margen propio. Buscá uno para ajustarlo."}
        </p>
      )}

      <div className="divide-y divide-black/[.06]">
        {visibles.map((f) => (
          <div key={f.ref} className="flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-medium">{f.nombre}</p>
              <p className="text-[12px] text-mute">
                {f.ref} · costo USD {f.costoUSD} ·{" "}
                {cambios[f.ref] !== undefined && cambios[f.ref].trim() !== ""
                  ? "propio"
                  : ETIQUETA[f.origen]}
              </p>
            </div>
            <input
              inputMode="numeric"
              value={cambios[f.ref] ?? String(f.margenVigente)}
              onChange={(e) => setCambios({ ...cambios, [f.ref]: e.target.value })}
              className="w-[68px] rounded-lg border border-black/10 px-2 py-2 text-center text-[14px] outline-none focus:border-black/30"
            />
            <span className="w-[104px] whitespace-nowrap text-right text-[14px] font-semibold tracking-[-.02em]">
              {"$ " + precioDe(f).toLocaleString("es-AR", { maximumFractionDigits: 0 })}
            </span>
          </div>
        ))}
      </div>

      {pendientes > 0 && (
        <div className="sticky bottom-4 mt-5">
          <button
            onClick={guardar}
            disabled={estado === "guardando" || !local}
            className="w-full rounded-full bg-black px-6 py-3.5 text-[15px] font-medium text-white disabled:opacity-40"
          >
            {estado === "guardando"
              ? "Guardando…"
              : `Guardar ${pendientes} cambio${pendientes > 1 ? "s" : ""}`}
          </button>
        </div>
      )}

      {mensaje && (
        <p className={`mt-3 text-[13px] ${estado === "error" ? "text-aviso-texto" : "text-mute"}`}>
          {mensaje}
        </p>
      )}
    </section>
  );
}
