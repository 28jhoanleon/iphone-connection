"use client";

/**
 * Revisión de incoherencias antes de sincronizar.
 * src/components/admin/RevisarIncoherencias.tsx
 *
 * Aparece sobre la previsualización, antes de aplicar. Ese momento importa: las
 * correcciones se guardan en correcciones.json y aplicar-correcciones.py corre
 * DESPUÉS de importar, así que lo que se acepta acá ya entra arreglado. Hacerlo
 * al revés significa que el dato malo llegó al sitio aunque sea por un rato.
 *
 * Cada fila se acepta de a una y a propósito. Un "aceptar todo" convierte esto
 * en la automatización que decidimos no hacer: el sistema detecta bien, pero no
 * puede saber si "iPhone S25 Ultra" es un Samsung mal categorizado o un iPhone
 * mal nombrado, y esa diferencia la tiene que resolver alguien que conozca el
 * stock.
 */
import { useMemo, useState } from "react";
import { detectar, type Sospecha } from "@/lib/incoherencias";
import type { Cambio } from "./PanelCambios";

interface Fila {
  cambio: Cambio;
  sospechas: Sospecha[];
}

export default function RevisarIncoherencias({ nuevos }: { nuevos: Cambio[] }) {
  const [resueltas, setResueltas] = useState<Record<string, "guardando" | "listo" | "descartada">>({});
  const [error, setError] = useState("");

  const filas = useMemo<Fila[]>(
    () =>
      nuevos
        .map((c) => ({ cambio: c, sospechas: detectar(c) }))
        .filter((f) => f.sospechas.length > 0),
    [nuevos],
  );

  const pendientes = filas.filter((f) => !resueltas[clave(f)]);

  function clave(f: Fila) {
    return f.cambio.ref ?? f.cambio.nombre;
  }

  async function aceptar(f: Fila) {
    const k = clave(f);
    if (!f.cambio.ref) {
      // Sin ref no hay dónde guardar la corrección: correcciones.json se indexa
      // por referencia. Pasa con productos que todavía no se importaron.
      setError("Ese producto todavía no tiene referencia. Aplicá la sincronización y corregilo después.");
      return;
    }
    setResueltas((r) => ({ ...r, [k]: "guardando" }));
    setError("");
    try {
      const cuerpo: Record<string, string> = { ref: f.cambio.ref };
      for (const s of f.sospechas) cuerpo[s.campo] = s.sugerido;

      const res = await fetch("/api/correccion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpo),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "No se pudo guardar.");
      setResueltas((r) => ({ ...r, [k]: "listo" }));
    } catch (e) {
      setResueltas((r) => {
        const n = { ...r };
        delete n[k];
        return n;
      });
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    }
  }

  if (filas.length === 0) return null;

  return (
    <section className="mt-8 rounded-lg border border-aviso-linea bg-aviso-fondo p-5">
      <p className="etiqueta mb-1">Revisar antes de aplicar</p>
      <p className="text-[15px] font-semibold">
        {pendientes.length === 0
          ? "Listo, no queda nada por revisar"
          : `${pendientes.length} producto${pendientes.length > 1 ? "s" : ""} con datos que no cierran`}
      </p>
      <p className="mt-1 text-[13px] text-mute">
        El nombre, la marca y la categoría no coinciden entre sí. Si aceptás, la corrección
        queda guardada y se aplica sola al actualizar el catálogo.
      </p>

      <div className="mt-4 divide-y divide-black/[.08]">
        {filas.map((f) => {
          const k = clave(f);
          const estado = resueltas[k];
          return (
            <div key={k} className="py-3.5">
              <p className="text-[14px] font-medium leading-tight">{f.cambio.nombre}</p>
              {f.cambio.ref && (
                <p className="font-data text-[11.5px] text-mute">#{f.cambio.ref}</p>
              )}

              <ul className="mt-2 space-y-1">
                {f.sospechas.map((s, i) => (
                  <li key={i} className="text-[12.5px] text-mute">
                    {s.motivo}{" "}
                    <span className="text-ink">
                      {s.campo} · {s.actual || "vacío"} → <strong>{s.sugerido}</strong>
                    </span>
                  </li>
                ))}
              </ul>

              {estado === "listo" ? (
                <p className="mt-2 text-[12.5px] text-mute">Corrección guardada.</p>
              ) : estado === "descartada" ? (
                <p className="mt-2 text-[12.5px] text-mute">Se deja como está.</p>
              ) : (
                <div className="mt-2.5 flex gap-2">
                  <button
                    onClick={() => aceptar(f)}
                    disabled={estado === "guardando"}
                    className="rounded-full bg-black px-4 py-1.5 text-[12.5px] font-medium text-white disabled:opacity-40"
                  >
                    {estado === "guardando" ? "Guardando…" : "Aceptar"}
                  </button>
                  <button
                    onClick={() => setResueltas((r) => ({ ...r, [k]: "descartada" }))}
                    className="rounded-full border border-black/15 px-4 py-1.5 text-[12.5px] font-medium"
                  >
                    Dejar así
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="mt-3 text-[12.5px] text-aviso-texto">{error}</p>}
    </section>
  );
}
