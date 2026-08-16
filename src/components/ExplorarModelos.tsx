"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { precio } from "@/lib/formato";
import Revelar from "./Revelar";

export interface ItemModelo {
  slug: string;
  nombre: string;
  marca: string;
  imagen: string;
  desde: number;
  unidades: number;
  capacidades: number[];
  colores: string[];
  hayNuevo: boolean;
  hayUsado: boolean;
  hayUnicas: boolean;
  bateriaMax: number | null;
}

const ORDEN = [
  ["relevancia", "Sugeridos"],
  ["precio-asc", "Menor precio"],
  ["precio-desc", "Mayor precio"],
] as const;

const POR_PAGINA = 18;

/**
 * Catálogo de una familia, agrupado por modelo.
 *
 * Muestra un modelo por tarjeta, no una unidad: con ocho iPhone 17 Pro Max que
 * sólo cambian de color y capacidad, listarlos sueltos llena la pantalla de
 * tarjetas casi idénticas y esconde el resto de la gama. Los colores y las
 * capacidades se eligen adentro, que es donde el dato sirve para decidir.
 */
export default function ExplorarModelos({
  items,
  marcas,
}: {
  items: ItemModelo[];
  marcas: string[];
}) {
  const [marca, setMarca] = useState("Todas");
  const [estado, setEstado] = useState("Todos");
  const [orden, setOrden] = useState<string>("relevancia");
  const [q, setQ] = useState("");
  const [visibles, setVisibles] = useState(POR_PAGINA);

  const resultados = useMemo(() => {
    const t = q.trim().toLowerCase();
    const r = items.filter(
      (i) =>
        (marca === "Todas" || i.marca === marca) &&
        (estado === "Todos" ||
          (estado === "Nuevo" ? i.hayNuevo : estado === "Usado" ? i.hayUsado : i.hayUnicas)) &&
        (!t || (i.nombre + i.marca).toLowerCase().includes(t)),
    );
    if (orden === "precio-asc") r.sort((a, b) => a.desde - b.desde);
    if (orden === "precio-desc") r.sort((a, b) => b.desde - a.desde);
    return r;
  }, [items, marca, estado, orden, q]);

  const hayFiltros = marca !== "Todas" || estado !== "Todos" || q !== "";

  const chip = (a: boolean) =>
    `inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-[13.5px] leading-none transition ${
      a ? "border-ink bg-ink text-paper" : "border-line text-mute hover:border-ink hover:text-ink"
    }`;

  return (
    <>
      <div className="sticky top-[92px] z-20 -mx-4 mb-6 space-y-2.5 border-b border-line bg-paper/95 px-4 pb-3 pt-2 backdrop-blur sm:-mx-5 sm:px-5">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setVisibles(POR_PAGINA); }}
          placeholder="Buscar modelo…"
          aria-label="Buscar modelo"
          className="h-11 w-full rounded-full border border-line bg-paper px-4 text-[16px] outline-none transition placeholder:text-mute-soft focus:border-ink sm:h-10 sm:text-[13.5px]"
        />

        {marcas.length > 1 && (
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
            <button onClick={() => setMarca("Todas")} className={chip(marca === "Todas")}>Toda marca</button>
            {marcas.map((m) => (
              <button key={m} onClick={() => setMarca(m)} className={chip(marca === m)}>{m}</button>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          {["Todos", "Nuevo", "Usado", "Últimas"].map((e) => (
            <button key={e} onClick={() => setEstado(e)} className={chip(estado === e)}>{e}</button>
          ))}
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            aria-label="Ordenar"
            className="ml-auto h-11 rounded-full border border-line bg-paper px-3 text-[13.5px] text-mute outline-none focus:border-ink"
          >
            {ORDEN.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </div>

        <div className="flex items-center justify-between gap-3 pt-0.5">
          <p className="font-data text-[11px] tracking-[.06em] text-mute-soft">
            {resultados.length} MODELO{resultados.length === 1 ? "" : "S"}
          </p>
          {hayFiltros && (
            <button
              onClick={() => { setMarca("Todas"); setEstado("Todos"); setQ(""); }}
              className="text-[13px] text-mute underline-offset-4 hover:text-ink hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {resultados.length === 0 ? (
        <p className="py-16 text-center text-mute">
          No encontramos modelos con esos filtros. Escribinos y te lo conseguimos.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {resultados.slice(0, visibles).map((i, n) => (
              <Revelar key={i.slug} retraso={(n % 4) * 60} className="h-full">
                <Link
                  href={`/modelo/${i.slug}`}
                  className="group flex h-full flex-col rounded-lg border border-line bg-paper p-3 transition duration-200 hover:-translate-y-0.5 hover:border-ink hover:shadow-[0_4px_16px_rgba(0,0,0,.06)] sm:p-4"
                >
                  <div className="mb-3 aspect-square overflow-hidden rounded-md bg-white">
                    <img
                      src={i.imagen} alt={i.nombre} width={600} height={600}
                      loading={n < 4 ? "eager" : "lazy"} decoding="async"
                      className="h-full w-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.04]"
                    />
                  </div>

                  {i.hayUnicas && (
                    <span className="inline-flex h-[26px] w-fit items-center gap-1.5 rounded-full border border-ink px-2.5 font-data text-[10.5px] uppercase leading-none tracking-[.1em]">
                      <span className="h-1.5 w-1.5 rounded-full bg-ink" aria-hidden="true" />
                      Últimas unidades
                    </span>
                  )}

                  <h2 className="mt-2.5 line-clamp-2 min-h-[2.6em] text-[14.5px] font-medium leading-[1.3] tracking-[-.01em]">
                    {i.nombre}
                  </h2>

                  <p className="mt-auto pt-3 text-[21px] font-semibold leading-none tracking-[-.025em] sm:text-[22px]">
                    {precio(i.desde)}
                  </p>
                  <p className="mt-1.5 text-[12.5px] text-mute">
                    desde · {i.unidades} {i.unidades === 1 ? "unidad" : "unidades"}
                  </p>

                  {/* Colores y capacidades disponibles: es lo que antes obligaba a
                      entrar para saber si estaba el que buscabas. */}
                  {(i.colores.length > 0 || i.capacidades.length > 1) && (
                    <p className="mt-1 truncate font-data text-[10.5px] tracking-[.06em] text-mute-soft">
                      {i.capacidades.length > 1 && `${i.capacidades.length} CAPACIDADES`}
                      {i.capacidades.length > 1 && i.colores.length > 0 && " · "}
                      {i.colores.length > 0 && `${i.colores.length} COLOR${i.colores.length > 1 ? "ES" : ""}`}
                    </p>
                  )}
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
