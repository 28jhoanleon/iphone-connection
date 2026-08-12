"use client";

import { useState, useMemo } from "react";

export interface ItemRevisar {
  ref: string; nombre: string; modelo: string; marca: string; categoria: string;
  color: string; bateria: number | null; estado: string;
  calidad: string; faltantes: string[]; precio: string; imagen: string;
}

const CALIDADES = [
  ["revisar", "Con faltantes"],
  ["aceptable", "Menores"],
  ["completo", "Completos"],
  ["todos", "Todos"],
] as const;

export default function RevisarCatalogo({ items }: { items: ItemRevisar[] }) {
  const [filtro, setFiltro] = useState<string>("revisar");
  const [q, setQ] = useState("");
  const [guardado, setGuardado] = useState<Record<string, boolean>>({});
  const [editado, setEditado] = useState<Record<string, Partial<ItemRevisar>>>({});

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter(
      (i) =>
        (filtro === "todos" || i.calidad === filtro) &&
        (!t || (i.nombre + i.ref).toLowerCase().includes(t)),
    );
  }, [items, filtro, q]);

  const conteo = useMemo(() => {
    const c: Record<string, number> = { revisar: 0, aceptable: 0, completo: 0 };
    items.forEach((i) => { c[i.calidad] = (c[i.calidad] ?? 0) + 1; });
    return c;
  }, [items]);

  async function guardar(ref: string, extra: Record<string, unknown> = {}) {
    const cambios = { ...(editado[ref] ?? {}), ...extra };
    try {
      const r = await fetch("/api/correccion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref, ...cambios }),
      });
      if (!r.ok) throw new Error();
      setGuardado((g) => ({ ...g, [ref]: true }));
      setTimeout(() => setGuardado((g) => ({ ...g, [ref]: false })), 2200);
    } catch {
      alert("No se pudo guardar. ¿Está corriendo npm run dev?");
    }
  }

  const chip = (a: boolean) =>
    `inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-[13.5px] leading-none transition ${
      a ? "border-ink bg-ink text-paper" : "border-line text-mute hover:border-ink hover:text-ink"
    }`;

  const campo =
    "h-10 w-full rounded-md border border-line bg-paper px-3 text-[13.5px] outline-none transition focus:border-ink";

  return (
    <>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {(["revisar", "aceptable", "completo"] as const).map((k) => (
          <div
            key={k}
            className={`rounded-lg border p-4 ${
              k === "revisar" && conteo[k] ? "border-aviso-linea bg-aviso-fondo" : "border-line"
            }`}
          >
            <p className="text-[26px] font-semibold leading-none tracking-[-.03em]">{conteo[k] ?? 0}</p>
            <p className="mt-1.5 text-[12.5px] text-mute">
              {k === "revisar" ? "Con faltantes" : k === "aceptable" ? "Menores" : "Completos"}
            </p>
          </div>
        ))}
      </div>

      <div className="sticky top-0 z-20 -mx-4 mb-6 mt-6 space-y-2.5 border-b border-line bg-paper/95 px-4 pb-3 pt-3 backdrop-blur sm:-mx-5 sm:px-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o referencia…"
          aria-label="Buscar"
          className="h-11 w-full rounded-full border border-line bg-paper px-4 text-[16px] outline-none focus:border-ink sm:h-10 sm:text-[13.5px]"
        />
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          {CALIDADES.map(([v, t]) => (
            <button key={v} onClick={() => setFiltro(v)} className={chip(filtro === v)}>{t}</button>
          ))}
        </div>
        <p className="font-data text-[11px] tracking-[.06em] text-mute-soft">
          {visibles.length} PRODUCTO{visibles.length === 1 ? "" : "S"}
        </p>
      </div>

      {visibles.length === 0 ? (
        <p className="py-16 text-center text-mute">Nada para revisar acá.</p>
      ) : (
        <div className="space-y-3 pb-20">
          {visibles.map((i) => (
            <div key={i.ref} className="rounded-lg border border-line p-4">
              <div className="flex items-start gap-3">
                <img
                  src={i.imagen} alt="" width={64} height={64} loading="lazy"
                  className="h-16 w-16 shrink-0 rounded-md bg-white object-contain"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-medium leading-tight">{i.nombre}</p>
                  <p className="mt-1 font-data text-[10.5px] tracking-[.06em] text-mute-soft">
                    #{i.ref} · {i.categoria.toUpperCase()} · {i.precio}
                  </p>
                  {i.faltantes.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {i.faltantes.map((f) => (
                        <li
                          key={f}
                          className="rounded-full border border-aviso-linea bg-aviso-fondo px-2 py-0.5 text-[11px] text-aviso-texto"
                        >
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[11.5px] text-mute">Nombre</span>
                  <input
                    defaultValue={i.nombre}
                    onChange={(e) =>
                      setEditado((v) => ({ ...v, [i.ref]: { ...v[i.ref], nombre: e.target.value } }))
                    }
                    className={campo}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11.5px] text-mute">Color</span>
                  <input
                    defaultValue={i.color}
                    placeholder="Negro, Azul…"
                    onChange={(e) =>
                      setEditado((v) => ({ ...v, [i.ref]: { ...v[i.ref], color: e.target.value } }))
                    }
                    className={campo}
                  />
                </label>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => guardar(i.ref)}
                  className="inline-flex h-10 items-center rounded-full bg-ink px-5 text-[13px] font-medium text-paper transition hover:-translate-y-px"
                >
                  Guardar
                </button>
                <button
                  onClick={() => {
                    setEditado((v) => ({ ...v, [i.ref]: { ...v[i.ref], oculto: true } }));
                    guardar(i.ref, { oculto: true });
                  }}
                  className="inline-flex h-10 items-center rounded-full border border-line px-4 text-[13px] text-mute transition hover:border-ink hover:text-ink"
                >
                  Ocultar del sitio
                </button>
                {guardado[i.ref] && (
                  <span className="font-data text-[11px] tracking-[.06em] text-mute">GUARDADO</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
