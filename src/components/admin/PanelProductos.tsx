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
  const [alta, setAlta] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

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

  /** Alta manual · genera la referencia y respeta la nomenclatura del Doc 00. */
  function agregar(f: FormData) {
    const modelo = String(f.get("modelo") || "").trim();
    const precioPesos = Number(f.get("precio"));
    if (!modelo || !precioPesos) return setAviso("Modelo y precio son obligatorios.");

    const estado = String(f.get("estado")) as Unidad["estado"];
    const bateria = f.get("bateria") ? Number(f.get("bateria")) : null;
    if (estado !== "nuevo_sellado" && !bateria)
      return setAviso("Un equipo usado no se puede publicar sin salud de batería declarada.");

    const capacidad = f.get("capacidad") ? Number(f.get("capacidad")) : null;
    const color = String(f.get("color") || "").trim() || null;
    const etiquetas: Record<string, string> = {
      nuevo_sellado: "Nuevo sellado", seleccionado_a: "Seleccionado A",
      seleccionado_b: "Seleccionado B", seleccionado_c: "Seleccionado C",
    };
    const nombre = [modelo, capacidad ? `${capacidad} GB` : "", color].filter(Boolean).join(" ");
    const n = items.length + 101;

    const nueva: Unidad = {
      ref: `A${n}`, modelo, config: null, modeloSlug: modelo.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      nombre, nombreCompleto: `${nombre} — ${etiquetas[estado]}`,
      marca: String(f.get("marca") || "Apple"), categoria: String(f.get("categoria") || "iPhone"),
      arquetipo: "telefono", capacidadGb: capacidad, color, colores: null,
      estado, estadoEtiqueta: etiquetas[estado], bateria,
      bateriaPosibleReemplazo: bateria === 100 && estado !== "nuevo_sellado", defecto: null,
      costoCentavos: null, precioCentavos: Math.round(precioPesos * 100),
      origen: "propio", disponibilidad: "disponible", publicado: false,
      actualizado: new Date().toISOString().slice(0, 10),
    };
    setItems((p) => [nueva, ...p]);
    setSucio(true);
    setAlta(false);
    setAviso(`Cargado como #${nueva.ref}, en borrador. Revisalo y publicalo.`);
  }

  /** Importación CSV · mismo criterio que el importador de la planilla. */
  async function importar(archivo: File) {
    const texto = await archivo.text();
    const filas = texto.split(/\r?\n/).filter(Boolean);
    const sep = filas[0].includes(";") ? ";" : ",";
    const cab = filas[0].split(sep).map((h) => h.trim().toLowerCase());
    const col = (n: string) => cab.findIndex((h) => h.includes(n));
    const iModelo = col("modelo") >= 0 ? col("modelo") : col("producto");
    const iPrecio = col("precio");
    if (iModelo < 0 || iPrecio < 0) return setAviso("El CSV necesita al menos columna de modelo y de precio.");

    let n = 0;
    const nuevos: Unidad[] = [];
    for (const linea of filas.slice(1)) {
      const c = linea.split(sep);
      const modelo = (c[iModelo] || "").trim();
      const precioNum = Number((c[iPrecio] || "").replace(/[^\d]/g, ""));
      if (!modelo || !precioNum) continue;
      n++;
      nuevos.push({
        ref: `I${items.length + n}`, modelo, config: null, modeloSlug: modelo.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        nombre: modelo, nombreCompleto: `${modelo} — Nuevo sellado`, marca: "Apple", categoria: "iPhone",
        arquetipo: "telefono", capacidadGb: null, color: null, colores: null,
        estado: "nuevo_sellado", estadoEtiqueta: "Nuevo sellado", bateria: 100,
        bateriaPosibleReemplazo: false, defecto: null,
        costoCentavos: null, precioCentavos: precioNum * 100, origen: "propio",
        disponibilidad: "disponible", publicado: false,
        actualizado: new Date().toISOString().slice(0, 10),
      });
    }
    setItems((p) => [...nuevos, ...p]);
    setSucio(true);
    setAviso(`${n} productos importados en borrador. Ninguno se publica hasta que lo revises.`);
  }

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
        <button onClick={() => setAlta((v) => !v)} className="rounded-full border border-line px-4 py-2 text-sm transition hover:border-ink">
          {alta ? "Cancelar" : "Agregar producto"}
        </button>
        <label className="cursor-pointer rounded-full border border-line px-4 py-2 text-sm transition hover:border-ink">
          Importar CSV
          <input type="file" accept=".csv,text/csv" className="hidden"
                 onChange={(e) => e.target.files?.[0] && importar(e.target.files[0])} />
        </label>
        {sucio && <span className="font-data text-[11px] text-[#8A6A2A]">CAMBIOS SIN EXPORTAR</span>}
      </div>

      {aviso && (
        <p className="mb-5 rounded-md border border-line bg-surface px-4 py-3 text-sm">{aviso}</p>
      )}

      {alta && (
        <form
          onSubmit={(e) => { e.preventDefault(); agregar(new FormData(e.currentTarget)); }}
          className="mb-6 grid gap-3 rounded-lg border border-line p-5 sm:grid-cols-3"
        >
          <label className="text-sm">Modelo *
            <input name="modelo" required placeholder="iPhone 15 Pro" className={input} /></label>
          <label className="text-sm">Capacidad (GB)
            <input name="capacidad" type="number" className={input} /></label>
          <label className="text-sm">Color
            <input name="color" placeholder="Titanio Natural" className={input} /></label>
          <label className="text-sm">Estado
            <select name="estado" className={input}>
              <option value="nuevo_sellado">Nuevo sellado</option>
              <option value="seleccionado_a">Seleccionado A</option>
              <option value="seleccionado_b">Seleccionado B</option>
              <option value="seleccionado_c">Seleccionado C</option>
            </select></label>
          <label className="text-sm">Batería (%)
            <input name="bateria" type="number" min={0} max={100} className={input} /></label>
          <label className="text-sm">Precio de venta *
            <input name="precio" type="number" required className={input} /></label>
          <div className="sm:col-span-3">
            <button type="submit" className="btn-solido">Agregar en borrador</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-surface font-data text-[10.5px] uppercase tracking-[.1em] text-mute">
            <tr>
              {["Ref", "Producto", "Estado", "Batería", "Precio", "Disponibilidad", "Publicado"].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((u) => (
              <tr key={u.ref} className="border-t border-line align-middle">
                <td className="px-3 py-2 font-data text-[12.5px]">#{u.ref}</td>
                <td className="px-3 py-2">{u.nombre}</td>
                <td className="px-3 py-2 text-mute">{u.estadoEtiqueta}</td>
                <td className="px-3 py-2 font-data text-[12.5px]">{u.bateria ?? "—"}</td>
                <td className="w-36 px-3 py-2">
                  <input
                    type="number"
                    className={input}
                    value={Math.round(u.precioCentavos / 100)}
                    onChange={(e) => editar(u.ref, { precioCentavos: Number(e.target.value) * 100 })}
                  />
                  <span className="font-data text-[10.5px] text-mute">{precio(u.precioCentavos)}</span>
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
