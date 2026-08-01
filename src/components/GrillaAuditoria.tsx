"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

export interface ItemAuditoria {
  ref: string; nombre: string; modelo: string; marca: string; categoria: string;
  color: string; capacidad: string; estado: string; bateria: number | null;
  disponibilidad: string; defecto: string | null; precio: string;
  imagen: string; tipo: "real" | "generada"; href: string;
}

const DISPONIBILIDAD: Record<string, string> = {
  disponible: "Stock", por_encargo: "Encargo", sin_stock: "Sin stock",
};

export default function GrillaAuditoria({
  items, categorias,
}: { items: ItemAuditoria[]; categorias: string[] }) {
  const [cat, setCat] = useState("Todas");
  const [tipo, setTipo] = useState<"todas" | "real" | "generada">("todas");
  const [q, setQ] = useState("");
  const [denso, setDenso] = useState(false);

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter(
      (i) =>
        (cat === "Todas" || i.categoria === cat) &&
        (tipo === "todas" || i.tipo === tipo) &&
        (!t || (i.nombre + i.ref + i.marca).toLowerCase().includes(t)),
    );
  }, [items, cat, tipo, q]);

  const chip = (activo: boolean) =>
    `inline-flex h-11 items-center rounded-full border px-3.5 text-[13px] leading-none transition ${
      activo ? "border-ink bg-ink text-paper" : "border-line text-mute hover:border-ink hover:text-ink"
    }`;

  return (
    <div className="mt-6">
      <div className="sticky top-[92px] z-20 -mx-4 mb-5 space-y-2.5 bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-5 sm:px-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrar por nombre, referencia o marca…"
          aria-label="Filtrar productos"
          className="h-11 w-full rounded-full border border-line bg-paper px-4 text-[16px] outline-none transition focus:border-ink sm:h-10 sm:text-[13.5px]"
        />
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setCat("Todas")} className={chip(cat === "Todas")}>Todas</button>
          {categorias.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={chip(cat === c)}>{c}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={() => setTipo("todas")} className={chip(tipo === "todas")}>Toda imagen</button>
          <button onClick={() => setTipo("real")} className={chip(tipo === "real")}>Solo reales</button>
          <button onClick={() => setTipo("generada")} className={chip(tipo === "generada")}>Solo generadas</button>
          <button onClick={() => setDenso((v) => !v)} className={chip(denso)}>
            {denso ? "Vista detalle" : "Vista densa"}
          </button>
          <span className="ml-auto font-data text-[11px] text-mute-soft">{visibles.length} resultados</span>
        </div>
      </div>

      {visibles.length === 0 ? (
        <p className="py-12 text-center text-mute">Sin resultados con esos filtros.</p>
      ) : denso ? (
        <div className="grid grid-cols-4 gap-1.5 pb-16 sm:grid-cols-8 lg:grid-cols-12">
          {visibles.map((i) => (
            <Link key={i.ref} href={i.href} title={`${i.ref} · ${i.nombre}`} className="block">
              <img
                src={i.imagen} alt={i.nombre} width={200} height={200} loading="lazy" decoding="async"
                className={`aspect-square w-full rounded bg-white object-contain ${
                  i.tipo === "generada" ? "opacity-70 ring-1 ring-line" : ""
                }`}
              />
              <span className="mt-0.5 block truncate font-data text-[9px] text-mute-soft">{i.ref}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 pb-16 sm:grid-cols-3 lg:grid-cols-4">
          {visibles.map((i) => (
            <Link key={i.ref} href={i.href} className="rounded-lg border border-line p-2.5 transition hover:border-ink">
              <img
                src={i.imagen} alt={i.nombre} width={400} height={400} loading="lazy" decoding="async"
                className="aspect-square w-full rounded bg-white object-contain"
              />
              <div className="mt-2 flex items-center gap-1.5">
                <span className={`inline-flex h-[18px] items-center rounded-full px-1.5 font-data text-[9px] uppercase tracking-[.08em] ${
                  i.tipo === "real" ? "bg-ink text-paper" : "border border-line text-mute"
                }`}>
                  {i.tipo === "real" ? "foto" : "gen"}
                </span>
                <span className="font-data text-[10px] text-mute-soft">#{i.ref}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-[13px] font-medium leading-tight">{i.nombre}</p>
              <dl className="mt-1.5 space-y-0.5 font-data text-[10px] text-mute">
                <div className="flex justify-between gap-2"><dt>marca</dt><dd className="truncate text-ink">{i.marca}</dd></div>
                <div className="flex justify-between gap-2"><dt>color</dt><dd className="truncate text-ink">{i.color}</dd></div>
                <div className="flex justify-between gap-2"><dt>cap.</dt><dd className="text-ink">{i.capacidad}</dd></div>
                <div className="flex justify-between gap-2"><dt>estado</dt><dd className="truncate text-ink">{i.estado}</dd></div>
                <div className="flex justify-between gap-2"><dt>batería</dt><dd className="text-ink">{i.bateria ? `${i.bateria}%` : "—"}</dd></div>
                <div className="flex justify-between gap-2"><dt>stock</dt><dd className="text-ink">{DISPONIBILIDAD[i.disponibilidad]}</dd></div>
              </dl>
              <p className="mt-1.5 text-[15px] font-semibold tracking-[-.02em]">{i.precio}</p>
              {i.defecto && <p className="mt-1 text-[10px] text-aviso-texto">⚠ {i.defecto}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
