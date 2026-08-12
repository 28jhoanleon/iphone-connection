"use client";

import { useEffect, useState } from "react";

type Estado = "consultando" | "al_dia" | "hay_cambios" | "sin_conexion";

/**
 * Aviso y disparador de sincronización.
 *
 * Consulta la planilla al abrir el panel y avisa si cambió. Ofrece primero ver
 * los cambios y recién después aplicarlos: el paso intermedio existe porque la
 * planilla es del proveedor y sus errores no deberían llegar al sitio.
 */
export default function BotonSincronizar({ local }: { local: boolean }) {
  const [estado, setEstado] = useState<Estado>("consultando");
  const [filas, setFilas] = useState<number | null>(null);
  const [corriendo, setCorriendo] = useState<null | "ver" | "aplicar">(null);
  const [salida, setSalida] = useState("");

  useEffect(() => {
    fetch("/api/sincronizar")
      .then((r) => r.json())
      .then((d) => {
        setEstado(d.estado);
        setFilas(d.filas ?? null);
      })
      .catch(() => setEstado("sin_conexion"));
  }, []);

  async function correr(aplicar: boolean) {
    setCorriendo(aplicar ? "aplicar" : "ver");
    setSalida("");
    try {
      const r = await fetch("/api/sincronizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aplicar }),
      });
      const d = await r.json();
      setSalida(d.salida ?? d.error ?? "");
      if (aplicar && r.ok) setEstado("al_dia");
    } catch {
      setSalida("No se pudo ejecutar. ¿Está corriendo npm run dev?");
    } finally {
      setCorriendo(null);
    }
  }

  if (estado === "consultando") {
    return (
      <div className="rounded-lg border border-line p-5">
        <p className="text-[13.5px] text-mute-soft">Consultando la planilla…</p>
      </div>
    );
  }

  if (estado === "al_dia") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-line p-5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-paper">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12.5l5.5 5.5L20 7" />
          </svg>
        </span>
        <div>
          <p className="text-[15px] font-semibold">Catálogo al día</p>
          <p className="mt-0.5 text-[13px] text-mute">
            La planilla no cambió desde la última sincronización.
          </p>
        </div>
      </div>
    );
  }

  if (estado === "sin_conexion") {
    return (
      <div className="rounded-lg border border-line p-5">
        <p className="text-[15px] font-semibold">No pude leer la planilla</p>
        <p className="mt-1 text-[13.5px] text-mute">
          Revisá la conexión, o que la planilla siga publicada como CSV.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-aviso-linea bg-aviso-fondo p-5">
      <div className="flex items-start gap-3">
        <span className="relative mt-1 flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aviso-texto opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-aviso-texto" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">Hay una actualización disponible</p>
          <p className="mt-1 text-[13.5px] leading-relaxed text-mute">
            La planilla del proveedor cambió{filas ? ` · ${filas} filas` : ""}. Mirá qué
            cambió antes de publicarlo.
          </p>

          {!local && (
            <p className="mt-3 text-[13px] text-mute">
              Para aplicarlo, levantá el servidor local: <code className="font-data">npm run dev</code>
            </p>
          )}

          {local && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => correr(false)}
                disabled={corriendo !== null}
                className="inline-flex h-11 items-center rounded-full border border-ink px-5 text-[13.5px] font-medium transition hover:bg-ink hover:text-paper disabled:opacity-40"
              >
                {corriendo === "ver" ? "Revisando…" : "Ver qué cambió"}
              </button>
              <button
                onClick={() => correr(true)}
                disabled={corriendo !== null}
                className="inline-flex h-11 items-center rounded-full bg-ink px-5 text-[13.5px] font-medium text-paper transition hover:-translate-y-px disabled:opacity-40"
              >
                {corriendo === "aplicar" ? "Actualizando…" : "Actualizar catálogo"}
              </button>
            </div>
          )}

          {salida && (
            <pre className="mt-4 max-h-72 overflow-auto rounded-md bg-paper p-4 font-data text-[11.5px] leading-relaxed">
              {salida}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
