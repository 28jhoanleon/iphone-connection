"use client";

import { useState } from "react";

/**
 * Publica los cambios pendientes al sitio.
 *
 * Todo lo que se hace en el panel —fotos, correcciones, precios— queda en los
 * archivos del proyecto hasta que se publica. Este botón cierra ese último paso
 * sin volver a la terminal.
 */
export default function BotonPublicar() {
  const [estado, setEstado] = useState<"libre" | "publicando" | "listo" | "error">("libre");
  const [mensaje, setMensaje] = useState("");

  async function publicar() {
    setEstado("publicando");
    setMensaje("");
    try {
      const r = await fetch("/api/publicar", { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setEstado("listo");
      setMensaje(
        d.sinCambios
          ? "No había nada nuevo para publicar."
          : `${d.archivos} archivo(s) publicados. El sitio se actualiza en 1 o 2 minutos.`,
      );
    } catch (e) {
      setEstado("error");
      setMensaje(e instanceof Error ? e.message : "No se pudo publicar.");
    }
  }

  return (
    <div className="rounded-lg border border-line p-5">
      <h2 className="text-[15px] font-semibold">Publicar cambios</h2>
      <p className="mt-1 text-[13.5px] leading-relaxed text-mute">
        Sube al sitio todo lo que hiciste acá: fotos, correcciones y precios.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={publicar}
          disabled={estado === "publicando"}
          className="inline-flex h-11 items-center rounded-full bg-ink px-6 text-[14px] font-medium text-paper transition hover:-translate-y-px disabled:opacity-40"
        >
          {estado === "publicando" ? "Publicando…" : "Publicar"}
        </button>
        {mensaje && (
          <span className={`text-[13px] ${estado === "error" ? "text-aviso-texto" : "text-mute"}`}>
            {mensaje}
          </span>
        )}
      </div>
    </div>
  );
}
