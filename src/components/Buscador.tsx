"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ItemBusqueda } from "@/lib/catalogo";
import { precio } from "@/lib/formato";

const MAX = 8;

function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export default function Buscador({ indice: inicial }: { indice: ItemBusqueda[] }) {
  const [indice, setIndice] = useState<ItemBusqueda[]>(inicial);
  const [q, setQ] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [cursor, setCursor] = useState(0);
  const caja = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const resultados = useMemo(() => {
    const term = normalizar(q.trim());
    if (term.length < 2) return [];
    const partes = term.split(/\s+/);
    return indice
      .filter((i) => partes.every((p) => i.clave.includes(p)))
      .sort((a, b) => (a.tipo === b.tipo ? 0 : a.tipo === "modelo" ? -1 : 1))
      .slice(0, MAX);
  }, [q, indice]);

  useEffect(() => setCursor(0), [q]);

  // El índice completo se descarga recién al primer foco: no penaliza la carga
  // inicial de ninguna página y queda listo antes de que se termine de escribir.
  useEffect(() => {
    if (!abierto || indice.length > inicial.length) return;
    fetch("/indice-busqueda.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setIndice(d))
      .catch(() => {});
  }, [abierto, indice.length, inicial.length]);

  useEffect(() => {
    function fuera(e: MouseEvent) {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", fuera);
    return () => document.removeEventListener("mousedown", fuera);
  }, []);

  function teclas(e: React.KeyboardEvent) {
    if (e.key === "Escape") return setAbierto(false);
    if (!resultados.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => (c + 1) % resultados.length); }
    if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => (c - 1 + resultados.length) % resultados.length); }
    if (e.key === "Enter") {
      e.preventDefault();
      router.push(resultados[cursor].href);
      setAbierto(false);
      setQ("");
    }
  }

  return (
    <div ref={caja} className="relative w-full">
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setAbierto(true); }}
        onFocus={() => setAbierto(true)}
        onKeyDown={teclas}
        placeholder="Buscar modelo o referencia…"
        aria-label="Buscar en el catálogo"
        className="w-full rounded-full border border-line bg-paper px-4 py-3 text-[16.5px] leading-none outline-none sm:py-2.5 sm:text-[13.5px] transition placeholder:text-mute-soft focus:border-ink"
      />

      {abierto && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] max-h-[70vh] overflow-y-auto z-50 overflow-hidden rounded-lg border border-line bg-paper shadow-[0_12px_40px_rgba(0,0,0,.10)]">
          {resultados.length === 0 ? (
            <p className="px-4 py-4 text-[13.5px] text-mute">
              Sin resultados. Escribinos y te lo conseguimos.
            </p>
          ) : (
            resultados.map((r, i) => (
              <button
                key={r.href}
                onMouseEnter={() => setCursor(i)}
                onClick={() => { router.push(r.href); setAbierto(false); setQ(""); }}
                className={`flex w-full items-center gap-3 border-b border-line px-3 py-2.5 text-left transition-colors duration-150 last:border-0 ${
                  i === cursor ? "bg-surface" : ""
                }`}
              >
                <img
                  src={r.imagen}
                  alt=""
                  width={44}
                  height={44}
                  loading="lazy"
                  decoding="async"
                  className="h-11 w-11 shrink-0 rounded bg-surface object-contain"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium leading-tight">{r.titulo}</span>
                  <span className="mt-0.5 block truncate font-data text-[10.5px] tracking-[.06em] text-mute-soft">
                    {r.estado}
                  </span>
                </span>
                <span className="whitespace-nowrap text-[13.5px] font-semibold">
                  {r.tipo === "modelo" ? "desde " : ""}
                  {precio(r.precioCentavos)}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
