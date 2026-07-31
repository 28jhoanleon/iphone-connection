"use client";

import { useState, useMemo } from "react";
import type { Unidad } from "@/lib/tipos";
import { precio } from "@/lib/formato";

/**
 * Panel V1 · edición en memoria + exportación del catálogo.
 * La persistencia llega con Supabase (V2): este componente ya trabaja contra el
 * mismo contrato de datos, así que solo cambia el guardado, no la interfaz.
 */
export default function PanelProductos({ inicial }: { inicial: Unidad[] }) {
  const [items, setItems] = useState<Unidad[]>(inicial);
  const [q, setQ] = useState("");
  const [sucio, setSucio] = useState(false);

  const visibles = useMemo(
    () => items.filter((u) => (u.nombre + u.ref).toLowerCase().includes(q.toLowerCase())),
    [items, q],
  );

  function editar(ref: string, cambios: Partial<Unidad>) {
    setItems((prev) => prev.map((u) => (u.ref === ref ? { ...u, ...cambios } : u)));
    setSucio(true);
  }

  function exportar() {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "catalogo.json";
    a.click();
    setSucio(false);
  }

  const input = "w-full rounded border border-line bg-paper px-2 py-1.5 text-sm";

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o referencia…"
          className={`${input} max-w-xs`}
        />
        <button onClick={exportar} className="rounded-full border border-ink px-4 py-2 text-sm transition hover:bg-ink hover:text-paper">
          Exportar catálogo.json
        </button>
        {sucio && <span className="font-data text-[11px] text-[#8A6A2A]">CAMBIOS SIN EXPORTAR</span>}
      </div>

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-surface font-data text-[10px] uppercase tracking-[.1em] text-mute">
            <tr>
              {["Ref", "Producto", "Estado", "Batería", "Precio", "Disponibilidad", "Publicado"].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((u) => (
              <tr key={u.ref} className="border-t border-line align-middle">
                <td className="px-3 py-2 font-data text-[12px]">#{u.ref}</td>
                <td className="px-3 py-2">{u.nombre}</td>
                <td className="px-3 py-2 text-mute">{u.estadoEtiqueta}</td>
                <td className="px-3 py-2 font-data text-[12px]">{u.bateria ?? "—"}</td>
                <td className="w-36 px-3 py-2">
                  <input
                    type="number"
                    className={input}
                    value={Math.round(u.precioCentavos / 100)}
                    onChange={(e) => editar(u.ref, { precioCentavos: Number(e.target.value) * 100 })}
                  />
                  <span className="font-data text-[10px] text-mute">{precio(u.precioCentavos)}</span>
                </td>
                <td className="px-3 py-2">
                  <select
                    className={input}
                    value={u.disponibilidad}
                    onChange={(e) => editar(u.ref, { disponibilidad: e.target.value as Unidad["disponibilidad"] })}
                  >
                    <option value="disponible">Disponible</option>
                    <option value="por_encargo">Por encargo</option>
                    <option value="sin_stock">Sin stock</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => editar(u.ref, { publicado: !u.publicado })}
                    className={`rounded-full border px-3 py-1 text-xs ${u.publicado ? "border-ink bg-ink text-paper" : "border-line text-mute"}`}
                  >
                    {u.publicado ? "Visible" : "Oculto"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-mute">
        V1: los cambios se exportan como <code>catalogo.json</code> y se reemplaza el archivo en el repo.
        Con Supabase (V2) el guardado pasa a ser directo y esta interfaz no cambia.
      </p>
    </div>
  );
}
