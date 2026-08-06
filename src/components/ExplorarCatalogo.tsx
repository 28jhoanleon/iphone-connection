"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { precio } from "@/lib/formato";
import Revelar from "./Revelar";

export interface ItemCatalogo {
  ref: string; nombre: string; modelo: string; marca: string; categoria: string;
  estado: string; estadoEtiqueta: string; bateria: number | null;
  disponibilidad: string; defecto: string | null; precio: number;
  imagen: string; ultimas: boolean; capacidadGb: number | null;
}

const ORDEN = [
  ["relevancia", "Sugeridos"],
  ["precio-asc", "Menor precio"],
  ["precio-desc", "Mayor precio"],
  ["bateria", "Mejor batería"],
] as const;

const POR_PAGINA = 24;

export default function ExplorarCatalogo({
  items, categorias, marcas,
}: { items: ItemCatalogo[]; categorias: string[]; marcas: string[] }) {
  const [cat, setCat] = useState("Todas");
  const [marca, setMarca] = useState("Todas");
  const [estado, setEstado] = useState("Todos");
  const [orden, setOrden] = useState<string>("relevancia");
  const [q, setQ] = useState("");
  const [visibles, setVisibles] = useState(POR_PAGINA);

  const resultados = useMemo(() => {
    const t = q.trim().toLowerCase();
    const r = items.filter(
      (i) =>
        (cat === "Todas" || i.categoria === cat) &&
        (marca === "Todas" || i.marca === marca) &&
        (estado === "Todos" ||
          (estado === "Nuevo" ? i.estado === "nuevo_sellado" : i.estado !== "nuevo_sellado")) &&
        (!t || (i.nombre + i.marca + i.ref).toLowerCase().includes(t)),
    );
    if (orden === "precio-asc") r.sort((a, b) => a.precio - b.precio);
    if (orden === "precio-desc") r.sort((a, b) => b.precio - a.precio);
    if (orden === "bateria") r.sort((a, b) => (b.bateria ?? 0) - (a.bateria ?? 0));
    return r;
  }, [items, cat, marca, estado, orden, q]);

  const limpiar = () => { setCat("Todas"); setMarca("Todas"); setEstado("Todos"); setQ(""); };
  const hayFiltros = cat !== "Todas" || marca !== "Todas" || estado !== "Todos" || q !== "";

  const chip = (activo: boolean) =>
    `inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-[13.5px] leading-none transition ${
      activo ? "border-ink bg-ink text-paper" : "border-line text-mute hover:border-ink hover:text-ink"
    }`;

  return (
    <>
      <div className="sticky top-[92px] z-20 -mx-4 mb-6 space-y-2.5 border-b border-line bg-paper/95 px-4 pb-3 pt-2 backdrop-blur sm:-mx-5 sm:px-5">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setVisibles(POR_PAGINA); }}
          placeholder="Buscar modelo, marca o referencia…"
          aria-label="Buscar en el catálogo"
          className="h-11 w-full rounded-full border border-line bg-paper px-4 text-[16px] outline-none transition placeholder:text-mute-soft focus:border-ink sm:h-10 sm:text-[13.5px]"
        />

        {/* filas con desplazamiento horizontal: en móvil no entran de otra forma */}
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          <button onClick={() => { setCat("Todas"); setVisibles(POR_PAGINA); }} className={chip(cat === "Todas")}>Todas</button>
          {categorias.map((c) => (
            <button key={c} onClick={() => { setCat(c); setVisibles(POR_PAGINA); }} className={chip(cat === c)}>{c}</button>
          ))}
        </div>

        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          <button onClick={() => setMarca("Todas")} className={chip(marca === "Todas")}>Toda marca</button>
          {marcas.map((m) => (
            <button key={m} onClick={() => setMarca(m)} className={chip(marca === m)}>{m}</button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {["Todos", "Nuevo", "Usado"].map((e) => (
            <button key={e} onClick={() => setEstado(e)} className={chip(estado === e)}>{e}</button>
          ))}
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            aria-label="Ordenar resultados"
            className="ml-auto h-11 rounded-full border border-line bg-paper px-3 text-[13.5px] text-mute outline-none focus:border-ink"
          >
            {ORDEN.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </div>

        <div className="flex items-center justify-between gap-3 pt-0.5">
          <p className="font-data text-[11px] tracking-[.06em] text-mute-soft">
            {resultados.length} EQUIPO{resultados.length === 1 ? "" : "S"}
          </p>
          {hayFiltros && (
            <button onClick={limpiar} className="text-[13px] text-mute underline-offset-4 hover:text-ink hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {resultados.length === 0 ? (
        <p className="py-16 text-center text-mute">
          No encontramos equipos con esos filtros. Escribinos y te lo conseguimos.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {resultados.slice(0, visibles).map((i, n) => (
              <Revelar key={i.ref} retraso={(n % 4) * 60} className="h-full">
                <Link
                  href={`/unidad/${i.ref}`}
                  className="group flex h-full flex-col rounded-lg border border-line bg-paper p-3 transition duration-200 hover:-translate-y-0.5 hover:border-ink hover:shadow-[0_4px_16px_rgba(0,0,0,.06)] sm:p-4"
                >
                  <div className="mb-3 aspect-square overflow-hidden rounded-md bg-white">
                    <img
                      src={i.imagen} alt={i.nombre} width={600} height={600}
                      loading={n < 4 ? "eager" : "lazy"} decoding="async"
                      className="h-full w-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.04]"
                    />
                  </div>
                  <span className={`inline-flex h-[26px] w-fit items-center gap-1.5 rounded-full px-2.5 font-data text-[10.5px] uppercase leading-none tracking-[.1em] ${
                    i.disponibilidad === "disponible" ? "bg-ink text-paper"
                      : i.ultimas ? "border border-ink text-ink" : "border border-line text-mute"
                  }`}>
                    {i.disponibilidad === "disponible" ? "Stock inmediato" : i.ultimas ? "Últimas unidades" : "Por encargo"}
                  </span>
                  <h2 className="mt-2.5 line-clamp-2 min-h-[2.6em] text-[14.5px] font-medium leading-[1.3] tracking-[-.01em]">
                    {i.nombre}
                  </h2>
                  <p className="mt-auto pt-3 text-[21px] font-semibold leading-none tracking-[-.025em] sm:text-[22px]">
                    {precio(i.precio)}
                  </p>
                  <p className="mt-1.5 text-[12.5px] text-mute">
                    {i.estadoEtiqueta}{i.bateria ? ` · batería ${i.bateria}%` : ""}
                  </p>
                </Link>
              </Revelar>
            ))}
          </div>

          {visibles < resultados.length && (
            <div className="flex justify-center py-10">
              <button onClick={() => setVisibles((v) => v + POR_PAGINA)} className="btn-linea">
                Ver más ({resultados.length - visibles} restantes)
              </button>
            </div>
          )}
          <div className="h-10" />
        </>
      )}
    </>
  );
}
