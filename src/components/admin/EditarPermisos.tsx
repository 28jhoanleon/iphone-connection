"use client";

/**
 * Permisos de la cuenta secundaria.
 * src/components/admin/EditarPermisos.tsx
 *
 * Ocultar una sección no evita el daño; lo evitan la confirmación de las
 * acciones masivas y el historial. Esto es la tercera capa, no la primera: sirve
 * para reducir la superficie de error de alguien que recién arranca con el
 * panel, no como control de seguridad.
 *
 * Por eso los textos dicen qué puede hacer, no qué se le prohíbe.
 */
import { useState } from "react";

const SECCIONES: Array<[string, string, string]> = [
  ["precios", "Precios y márgenes", "Cambiar el tipo de cambio y los márgenes. Toca todos los precios del sitio."],
  ["fotos", "Fotos", "Subir y reemplazar fotos de producto."],
  ["productos", "Productos y correcciones", "Corregir nombres, marcas, categorías y colores."],
  ["contenido", "Contenido", "Ver las placas generadas para Instagram."],
  ["publicar", "Publicar", "Enviar los cambios al sitio."],
];

export default function EditarPermisos({
  inicial,
  usuario,
}: {
  inicial: Record<string, boolean>;
  /** Nombre de la cuenta secundaria, sólo para que el texto no sea genérico. */
  usuario: string;
}) {
  const [vals, setVals] = useState(inicial);
  const [estado, setEstado] = useState<"libre" | "guardando" | "listo" | "error">("libre");
  const [mensaje, setMensaje] = useState("");

  const sucio = SECCIONES.some(([k]) => vals[k] !== inicial[k]);

  async function guardar() {
    setEstado("guardando");
    setMensaje("");
    try {
      const r = await fetch("/api/permisos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(vals),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "No se pudo guardar.");
      setEstado("listo");
      setMensaje(d.via === "github" ? "Guardado. Se aplica en un minuto." : "Guardado.");
    } catch (e) {
      setEstado("error");
      setMensaje(e instanceof Error ? e.message : "No se pudo guardar.");
    }
  }

  return (
    <section className="mt-8">
      <p className="etiqueta mb-2.5">Qué puede hacer {usuario}</p>

      <div className="divide-y divide-black/[.06] rounded-lg border border-line">
        {SECCIONES.map(([k, titulo, detalle]) => (
          <label key={k} className="flex cursor-pointer items-start gap-3 p-4">
            <input
              type="checkbox"
              checked={vals[k] !== false}
              onChange={(e) => setVals({ ...vals, [k]: e.target.checked })}
              className="mt-1 h-[18px] w-[18px] shrink-0 accent-black"
            />
            <span className="min-w-0">
              <span className="block text-[14px] font-medium">{titulo}</span>
              <span className="block text-[12.5px] text-mute">{detalle}</span>
            </span>
          </label>
        ))}
      </div>

      <p className="mt-3 text-[12.5px] text-mute">
        Sincronizar el catálogo desde la planilla queda siempre en tu cuenta y no se
        puede habilitar acá.
      </p>

      {sucio && (
        <button
          onClick={guardar}
          disabled={estado === "guardando"}
          className="mt-4 rounded-full bg-black px-6 py-2.5 text-[14px] font-medium text-white disabled:opacity-40"
        >
          {estado === "guardando" ? "Guardando…" : "Guardar permisos"}
        </button>
      )}

      {mensaje && (
        <p className={`mt-3 text-[13px] ${estado === "error" ? "text-aviso-texto" : "text-mute"}`}>
          {mensaje}
        </p>
      )}
    </section>
  );
}
