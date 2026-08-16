"use client";

import { useState, useMemo } from "react";

export interface Cambio {
  nombre: string;
  ref?: string;
  categoria?: string;
  antes?: number;
  despues?: number;
  variacion?: number;
  precio?: number;
  campo?: string;
  detalle?: string;
  estado?: string;
  bateria?: number | null;
  imagen?: string;
}

export interface Pendientes {
  fecha: string;
  filas: number;
  precios: Cambio[];
  nuevos: Cambio[];
  salidos: Cambio[];
  otros: Cambio[];
}

const fmt = (c: number) => "$ " + Math.round(c / 100).toLocaleString("es-AR");

const PESTAÑAS = [
  ["precios", "Precios"],
  ["nuevos", "Entran"],
  ["salidos", "Salen"],
  ["otros", "Otros"],
] as const;

/**
 * Revisión visual de lo que cambió en la planilla.
 *
 * Antes era una lista de texto: con 130 cambios no había forma de leerla. Ahora
 * cada uno se ve con su foto, su categoría y la variación destacada, agrupado
 * por tipo. Lo que sube de precio y lo que baja se distinguen de un vistazo,
 * porque son decisiones distintas.
 */
export default function PanelCambios({ p }: { p: Pendientes }) {
  const [tab, setTab] = useState<string>(
    p.precios.length ? "precios" : p.nuevos.length ? "nuevos" : "salidos",
  );
  const [cat, setCat] = useState("Todas");

  const lista = (p[tab as keyof Pendientes] as Cambio[]) ?? [];

  const categorias = useMemo(
    () => [...new Set(lista.map((c) => c.categoria).filter(Boolean))].sort() as string[],
    [lista],
  );

  const visibles = useMemo(
    () => (cat === "Todas" ? lista : lista.filter((c) => c.categoria === cat)),
    [lista, cat],
  );

  // resumen económico: qué tan fuerte se movió la lista
  const resumen = useMemo(() => {
    const subas = p.precios.filter((c) => (c.variacion ?? 0) > 0);
    const bajas = p.precios.filter((c) => (c.variacion ?? 0) < 0);
    const prom = p.precios.length
      ? p.precios.reduce((a, c) => a + (c.variacion ?? 0), 0) / p.precios.length
      : 0;
    return { subas: subas.length, bajas: bajas.length, prom };
  }, [p.precios]);

  const chip = (a: boolean) =>
    `inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[13.5px] leading-none transition ${
      a ? "border-ink bg-ink text-paper" : "border-line text-mute hover:border-ink hover:text-ink"
    }`;

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PESTAÑAS.map(([k, t]) => {
          const n = (p[k as keyof Pendientes] as Cambio[]).length;
          const activa = tab === k;
          return (
            <button
              key={k}
              onClick={() => { setTab(k); setCat("Todas"); }}
              className={`rounded-lg border p-4 text-left transition ${
                activa ? "border-ink" : "border-line hover:border-mute"
              }`}
            >
              <p className="text-[26px] font-semibold leading-none tracking-[-.03em]">{n}</p>
              <p className="mt-1.5 text-[13px] text-mute">{t}</p>
            </button>
          );
        })}
      </div>

      {p.precios.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 rounded-lg border border-line px-4 py-3 text-[13px]">
          <span className="text-mute">
            <b className="text-ink">{resumen.subas}</b> suben
          </span>
          <span className="text-mute">
            <b className="text-ink">{resumen.bajas}</b> bajan
          </span>
          <span className="text-mute">
            promedio{" "}
            <b className={resumen.prom > 0 ? "text-aviso-texto" : "text-ink"}>
              {resumen.prom > 0 ? "+" : ""}
              {resumen.prom.toFixed(1)}%
            </b>
          </span>
        </div>
      )}

      {categorias.length > 1 && (
        <div className="-mx-4 mt-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          <button onClick={() => setCat("Todas")} className={chip(cat === "Todas")}>
            Todas <span className="font-data text-[11px] opacity-70">{lista.length}</span>
          </button>
          {categorias.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={chip(cat === c)}>
              {c}{" "}
              <span className="font-data text-[11px] opacity-70">
                {lista.filter((x) => x.categoria === c).length}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 space-y-2 pb-10">
        {visibles.length === 0 ? (
          <p className="py-12 text-center text-[14px] text-mute">Nada en esta categoría.</p>
        ) : (
          visibles.map((c, i) => (
            <Fila key={`${c.ref ?? i}-${i}`} c={c} tipo={tab} />
          ))
        )}
      </div>
    </>
  );
}

function Fila({ c, tipo }: { c: Cambio; tipo: string }) {
  const sube = (c.variacion ?? 0) > 0;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-line p-3">
      {c.ref && (
        <img
          src={`/productos/${c.ref}.webp`}
          alt=""
          width={52}
          height={52}
          loading="lazy"
          decoding="async"
          className="h-13 w-13 shrink-0 rounded-md bg-white object-contain"
          style={{ width: 52, height: 52 }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = `/productos/${c.ref}.svg`;
          }}
        />
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium leading-tight">{c.nombre}</p>
        <p className="mt-0.5 font-data text-[10.5px] tracking-[.06em] text-mute-soft">
          {c.ref ? `#${c.ref} · ` : ""}
          {c.categoria}
          {c.bateria ? ` · ${c.bateria}%` : ""}
        </p>
      </div>

      {tipo === "precios" && (
        <div className="shrink-0 text-right">
          <p className="font-data text-[11.5px] text-mute-soft line-through">{fmt(c.antes!)}</p>
          <p className="text-[15px] font-semibold leading-tight">{fmt(c.despues!)}</p>
          <p className={`font-data text-[11px] ${sube ? "text-aviso-texto" : "text-mute"}`}>
            {sube ? "▲" : "▼"} {Math.abs(c.variacion ?? 0)}%
          </p>
        </div>
      )}

      {tipo === "nuevos" && (
        <div className="shrink-0 text-right">
          <p className="text-[15px] font-semibold">{fmt(c.precio!)}</p>
          <p className="font-data text-[10.5px] text-mute-soft">{c.estado}</p>
        </div>
      )}

      {tipo === "salidos" && (
        <div className="shrink-0 text-right">
          <p className="text-[14px] text-mute line-through">{c.precio ? fmt(c.precio) : ""}</p>
          <p className="font-data text-[10.5px] text-mute-soft">YA NO ESTÁ</p>
        </div>
      )}

      {tipo === "otros" && (
        <div className="shrink-0 text-right">
          <p className="font-data text-[10.5px] uppercase tracking-[.06em] text-mute-soft">
            {c.campo}
          </p>
          <p className="text-[13px] text-mute">{c.detalle}</p>
        </div>
      )}
    </div>
  );
}
