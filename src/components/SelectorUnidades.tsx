"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import type { Modelo, Unidad } from "@/lib/tipos";
import { precio, precioARS, capacidad } from "@/lib/formato";

/**
 * Núcleo de la navegación aprobada (opción A · wireframe 30/07/2026):
 * capacidad y color son SELECTORES dentro del modelo, no pantallas separadas.
 */
export default function SelectorUnidades({
  modelo, tc, imagenes,
}: { modelo: Modelo; tc: number; imagenes: Record<string, string> }) {
  const [cap, setCap] = useState<number | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  const coloresDe = (u: Unidad) => u.colores ?? (u.color ? [u.color] : []);

  const visibles = useMemo(
    () =>
      modelo.unidades.filter(
        (u) => (!cap || u.capacidadGb === cap) && (!color || coloresDe(u).includes(color)),
      ),
    [modelo, cap, color],
  );

  // La foto sigue a la selección: al elegir un color se ve ese color, no la
  // del primer producto. El cambio se hace con un fundido corto para que se
  // perciba como una transición y no como un salto.
  // Al elegir un color, se prefiere la foto de una unidad que declare ESE color
  // solo. Las unidades con varios colores comparten una única foto, y tomar la
  // primera visible mostraba un equipo de otro color que el seleccionado.
  const refFoto = useMemo(() => {
    if (color) {
      const propia = visibles.find(
        (u) => u.color === color && !(u.colores && u.colores.length > 1),
      );
      if (propia) return propia.ref;
      const conColor = modelo.unidades.find(
        (u) => u.color === color && !(u.colores && u.colores.length > 1),
      );
      if (conColor) return conColor.ref;
    }
    return visibles[0]?.ref ?? modelo.unidades[0].ref;
  }, [color, visibles, modelo.unidades]);

  useEffect(() => {
    setEntrando(true);
    const t = setTimeout(() => setEntrando(false), 30);
    return () => clearTimeout(t);
  }, [refFoto]);

  const chip = (activo: boolean) =>
    `rounded-full border px-4 py-2.5 text-[13.5px] leading-none transition ${
      activo ? "border-ink bg-ink text-paper" : "border-line text-mute hover:border-ink hover:text-ink"
    }`;

  return (
    <>
    <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-white">
      <img
        key={refFoto}
        src={imagenes[refFoto] ?? imagenes[modelo.unidades[0].ref]}
        alt={modelo.nombre}
        width={1000}
        height={1000}
        className={`h-full w-full object-contain transition-all duration-500 ease-out ${
          entrando ? "scale-[.97] opacity-0" : "scale-100 opacity-100"
        }`}
      />
    </div>

    <div>
      <h1 className="mb-1.5 text-[clamp(28px,4vw,40px)] font-semibold leading-[1.06] tracking-[-.03em]">
        {modelo.nombre}
      </h1>
      <p className="mb-6 text-[15px] text-mute">
        {modelo.unidades.length} unidad{modelo.unidades.length > 1 ? "es" : ""} · desde{" "}
        {precio(Math.min(...modelo.unidades.map((u) => precioARS(u, tc))))}
      </p>

      {modelo.capacidades.length > 1 && (
        <>
          <p className="etiqueta mb-2.5">Capacidad</p>
          <div className="mb-6 flex flex-wrap gap-2">
            <button onClick={() => setCap(null)} aria-pressed={!cap} className={chip(!cap)}>Todas</button>
            {modelo.capacidades.map((c) => (
              <button key={c} onClick={() => setCap(c)} aria-pressed={cap === c} className={chip(cap === c)}>
                {capacidad(c)}
              </button>
            ))}
          </div>
        </>
      )}

      {modelo.colores.length > 1 && (
        <>
          <p className="etiqueta mb-2.5">Color</p>
          <div className="mb-6 flex flex-wrap gap-2">
            <button onClick={() => setColor(null)} aria-pressed={!color} className={chip(!color)}>Todos</button>
            {modelo.colores.map((c) => (
              <button key={c} onClick={() => setColor(c)} aria-pressed={color === c} className={chip(color === c)}>
                {c}
              </button>
            ))}
          </div>
        </>
      )}

      <p className="etiqueta mb-3">Unidades que coinciden · {visibles.length}</p>

      {visibles.length === 0 ? (
        <p className="py-10 text-mute">
          No hay unidades con esa combinación. Probá con otra capacidad o color.
        </p>
      ) : (
        <div className="space-y-2">
          {visibles.map((u) => (
            <Link
              key={u.ref}
              href={`/unidad/${u.ref}`}
              className="flex items-center justify-between gap-4 rounded-lg border border-line p-4 transition hover:border-ink"
            >
              <div className="min-w-0">
                <p className="font-data text-[13.5px] font-medium">
                  {u.bateria ? `Batería ${u.bateria}%` : "Nuevo sellado"}
                </p>
                <p className="text-[12.5px] text-mute">
                  {u.estadoEtiqueta}
                  {u.color ? ` · ${u.color}` : u.colores ? ` · ${u.colores.join(" / ")}` : ""}
                </p>
                {u.defecto && <p className="mt-0.5 text-[11px] text-aviso-texto">Detalle declarado: {u.defecto}</p>}
              </div>
              <span className="whitespace-nowrap text-[17px] font-semibold tracking-[-.02em]">
                {precio(precioARS(u, tc))}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
