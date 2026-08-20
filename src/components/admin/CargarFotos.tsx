"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";

export interface ItemFoto {
  ref: string;
  nombre: string;
  modelo: string;
  marca: string;
  categoria: string;
  color: string;
  imagen: string;
  tipo: "real" | "generada";
  precio: string;
}

type Estado = "libre" | "subiendo" | "listo" | "error";

/**
 * Consultas de búsqueda de imágenes.
 *
 * Tres botones con criterios distintos porque ninguno funciona siempre:
 * combinar site: con filtros de tamaño y transparencia deja cero resultados en
 * la mayoría de los productos. Se ofrece de más restrictivo a más amplio.
 */
function buscarOficial(item: ItemFoto): string {
  const color = item.color === "sin color" ? "" : item.color;
  const q = `${item.modelo} ${color} oficial`.trim();
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`;
}

function buscarPng(item: ItemFoto): string {
  const color = item.color === "sin color" ? "" : item.color;
  const q = `${item.modelo} ${color} png fondo blanco`.trim();
  // isz:l pide imágenes grandes sin llegar a excluir casi todo
  return `https://www.google.com/search?tbm=isch&tbs=isz:l&q=${encodeURIComponent(q)}`;
}

function buscarAmplia(item: ItemFoto): string {
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(item.nombre)}`;
}

export default function CargarFotos({
  items,
  categorias,
  local,
}: {
  items: ItemFoto[];
  categorias: string[];
  local: boolean;
}) {
  const [cat, setCat] = useState("Todas");
  const [soloSinFoto, setSoloSinFoto] = useState(false);
  const [q, setQ] = useState("");
  const [estados, setEstados] = useState<Record<string, Estado>>({});
  const [mensajes, setMensajes] = useState<Record<string, string>>({});
  const [nuevas, setNuevas] = useState<Record<string, string>>({});
  const [encima, setEncima] = useState<string | null>(null);

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter(
      (i) =>
        (cat === "Todas" || i.categoria === cat) &&
        (!soloSinFoto || (i.tipo === "generada" && !nuevas[i.ref])) &&
        (!t || (i.nombre + i.ref + i.marca).toLowerCase().includes(t)),
    );
  }, [items, cat, soloSinFoto, q, nuevas]);

  const pendientes = items.filter((i) => i.tipo === "generada" && !nuevas[i.ref]).length;
  const conFoto = items.length - pendientes;

  // La carpeta de Descargas que lee el chip es la del SERVIDOR: con el servidor
  // local es la del teléfono y sirve, desde el sitio publicado no existe.
  // `local` ya no distingue los dos casos —también es true en Vercel cuando hay
  // token—, así que hay que mirar el host del navegador.
  //
  // Se resuelve en un efecto y no en el render: leer window durante el render
  // hace que el servidor dibuje una cosa y el cliente otra, y React lo rechaza
  // como error de hidratación. Arranca en false y el chip aparece al montar.
  const [enLocal, setEnLocal] = useState(false);
  useEffect(() => {
    setEnLocal(["localhost", "127.0.0.1"].includes(window.location.hostname));
  }, []);

  const subir = useCallback(async (ref: string, archivo: File) => {
    if (!archivo.type.startsWith("image/")) {
      setEstados((e) => ({ ...e, [ref]: "error" }));
      setMensajes((m) => ({ ...m, [ref]: "Ese archivo no es una imagen." }));
      return;
    }

    setEstados((e) => ({ ...e, [ref]: "subiendo" }));
    setMensajes((m) => ({ ...m, [ref]: "" }));

    const fd = new FormData();
    fd.append("ref", ref);
    fd.append("archivo", archivo);

    try {
      const r = await fetch("/api/foto", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "No se pudo procesar.");
      setEstados((e) => ({ ...e, [ref]: "listo" }));
      // el parámetro fuerza a recargar la miniatura, que quedó cacheada
      setNuevas((n) => ({ ...n, [ref]: `/productos/${ref}.webp?v=${Date.now()}` }));
    } catch (err) {
      setEstados((e) => ({ ...e, [ref]: "error" }));
      setMensajes((m) => ({
        ...m,
        [ref]: err instanceof Error ? err.message : "Error inesperado.",
      }));
    }
  }, []);

  /** Levanta la última imagen descargada y la sube a esa referencia. */
  const tomarUltima = useCallback(async (ref: string) => {
    setEstados((e) => ({ ...e, [ref]: "subiendo" }));
    setMensajes((m) => ({ ...m, [ref]: "" }));
    try {
      const r = await fetch("/api/descarga");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "No encontré ninguna descarga.");
      const bin = Uint8Array.from(atob(d.base64), (c) => c.charCodeAt(0));
      const archivo = new File([bin], d.nombre, { type: "image/*" });
      await subir(ref, archivo);
    } catch (err) {
      setEstados((e) => ({ ...e, [ref]: "error" }));
      setMensajes((m) => ({
        ...m,
        [ref]: err instanceof Error ? err.message : "Error inesperado.",
      }));
    }
  }, [subir]);

  const chip = (activo: boolean) =>
    `inline-flex h-11 shrink-0 items-center rounded-full border px-4 text-[13.5px] leading-none transition ${
      activo ? "border-ink bg-ink text-paper" : "border-line text-mute hover:border-ink hover:text-ink"
    }`;

  if (!local) {
    return (
      <div className="mt-7 rounded-lg border border-aviso-linea bg-aviso-fondo p-6">
        <h2 className="text-[16px] font-semibold">La carga de fotos corre en tu equipo</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-mute">
          El sitio publicado no puede guardar archivos: cada despliegue reemplaza todo.
          Para cargar fotos, levantá el servidor local y entrá desde ahí.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-md bg-paper p-4 font-data text-[12.5px] leading-relaxed">
          cd ~/proyecto{"\n"}npm run dev{"\n"}
          {"\n"}# después abrí:{"\n"}localhost:3000/admin/fotos
        </pre>
        <p className="mt-3 text-[13px] text-mute">
          Cuando termines: <code className="font-data">git add -A &amp;&amp; git commit -m &quot;fotos&quot; &amp;&amp; git push</code>
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-line p-4">
          <p className="text-[28px] font-semibold leading-none tracking-[-.03em]">{conFoto}</p>
          <p className="mt-1.5 text-[13.5px] text-mute">Con fotografía</p>
        </div>
        <div className={`rounded-lg border p-4 ${pendientes ? "border-aviso-linea bg-aviso-fondo" : "border-line"}`}>
          <p className="text-[28px] font-semibold leading-none tracking-[-.03em]">{pendientes}</p>
          <p className="mt-1.5 text-[13.5px] text-mute">Sin fotografía</p>
        </div>
        <div className="col-span-2 rounded-lg border border-line p-4">
          <div className="h-2 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-ink transition-all duration-500"
              style={{ width: `${Math.round((conFoto / items.length) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-[13.5px] text-mute">
            {Math.round((conFoto / items.length) * 100)}% del catálogo con fotografía propia
          </p>
        </div>
      </div>

      <div className="sticky top-0 z-20 -mx-4 mb-6 mt-6 space-y-2.5 border-b border-line bg-paper/95 px-4 pb-3 pt-3 backdrop-blur sm:-mx-5 sm:px-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por modelo, marca o referencia…"
          aria-label="Buscar productos"
          className="h-11 w-full rounded-full border border-line bg-paper px-4 text-[16px] outline-none transition focus:border-ink sm:h-10 sm:text-[13.5px]"
        />
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
          <button onClick={() => setSoloSinFoto((v) => !v)} className={chip(soloSinFoto)}>
            {soloSinFoto ? "Sólo sin foto" : "Todos"}
          </button>
          <span className="mx-1 w-px shrink-0 bg-line" />
          <button onClick={() => setCat("Todas")} className={chip(cat === "Todas")}>Todas</button>
          {categorias.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={chip(cat === c)}>{c}</button>
          ))}
        </div>
        <p className="font-data text-[11px] tracking-[.06em] text-mute-soft">
          {visibles.length} PRODUCTO{visibles.length === 1 ? "" : "S"}
        </p>
      </div>

      {visibles.length === 0 ? (
        <p className="py-16 text-center text-mute">
          {soloSinFoto ? "No queda ninguno sin foto acá." : "Sin resultados."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 pb-20 sm:grid-cols-3 lg:grid-cols-4">
          {visibles.map((i) => (
            <Tarjeta
              key={i.ref}
              item={i}
              estado={estados[i.ref] ?? "libre"}
              mensaje={mensajes[i.ref]}
              imagenNueva={nuevas[i.ref]}
              encima={encima === i.ref}
              setEncima={setEncima}
              onArchivo={(f) => subir(i.ref, f)}
              onUltima={() => tomarUltima(i.ref)}
              conDescargas={enLocal}
            />
          ))}
        </div>
      )}
    </>
  );
}

function Tarjeta({
  item, estado, mensaje, imagenNueva, encima, setEncima, onArchivo, onUltima, conDescargas,
}: {
  item: ItemFoto;
  estado: Estado;
  mensaje?: string;
  imagenNueva?: string;
  encima: boolean;
  setEncima: (r: string | null) => void;
  onArchivo: (f: File) => void;
  /** El chip "Descarga" lee la carpeta de Descargas DEL SERVIDOR. Desde el sitio
   *  publicado esa carpeta no existe y el botón falla siempre, así que no se muestra. */
  conDescargas: boolean;
  onUltima: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const src = imagenNueva ?? item.imagen;

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setEncima(item.ref); }}
      onDragLeave={() => setEncima(null)}
      onDrop={(e) => {
        e.preventDefault();
        setEncima(null);
        const f = e.dataTransfer.files?.[0];
        if (f) onArchivo(f);
      }}
      className={`flex flex-col rounded-lg border p-3 transition ${
        encima ? "border-ink bg-surface"
          : estado === "listo" ? "border-ink"
          : estado === "error" ? "border-aviso-linea bg-aviso-fondo"
          : "border-line"
      }`}
    >
      <button
        onClick={() => input.current?.click()}
        disabled={estado === "subiendo"}
        className="group relative mb-2.5 block aspect-square overflow-hidden rounded-md bg-white"
        aria-label={`Cargar foto de ${item.nombre}`}
      >
        <img
          src={src}
          alt={item.nombre}
          width={400}
          height={400}
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-contain transition ${
            item.tipo === "generada" && !imagenNueva ? "opacity-45" : ""
          } ${estado === "subiendo" ? "scale-95 opacity-30" : ""}`}
        />

        {estado === "subiendo" && (
          <span className="absolute inset-0 grid place-items-center">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-line border-t-ink" />
          </span>
        )}

        {estado === "libre" && (
          <span className="absolute inset-0 grid place-items-center bg-ink/0 opacity-0 transition group-hover:bg-ink/5 group-hover:opacity-100">
            <span className="rounded-full bg-ink px-3 py-1.5 font-data text-[10.5px] uppercase tracking-[.1em] text-paper">
              {item.tipo === "real" ? "Reemplazar" : "Cargar"}
            </span>
          </span>
        )}

        {estado === "listo" && (
          <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-ink text-paper">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12.5l5.5 5.5L20 7" />
            </svg>
          </span>
        )}
      </button>

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label={`Archivo para ${item.nombre}`}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onArchivo(f);
          e.target.value = "";
        }}
      />

      <div className="mb-2 flex gap-1.5">
        <a
          href={buscarPng(item)}
          target="_blank"
          rel="noreferrer"
          className="flex-1 rounded-full border border-line py-2 text-center text-[11.5px] font-medium text-mute transition hover:border-ink hover:text-ink"
          title="PNG con fondo blanco, imágenes grandes"
        >
          PNG
        </a>
        <a
          href={buscarOficial(item)}
          target="_blank"
          rel="noreferrer"
          className="flex-1 rounded-full border border-line py-2 text-center text-[11.5px] font-medium text-mute transition hover:border-ink hover:text-ink"
          title="Nombre del modelo y color, sin filtros"
        >
          Oficial
        </a>
        <a
          href={buscarAmplia(item)}
          target="_blank"
          rel="noreferrer"
          className="flex-1 rounded-full border border-line py-2 text-center text-[11.5px] font-medium text-mute transition hover:border-ink hover:text-ink"
          title="Nombre completo del producto"
        >
          Amplia
        </a>
        {conDescargas && (
          <button
            onClick={onUltima}
            disabled={estado === "subiendo"}
            className="flex-1 rounded-full border border-line py-2 text-[11.5px] font-medium text-mute transition hover:border-ink hover:text-ink disabled:opacity-40"
          >
            Descarga
          </button>
        )}
      </div>

      <p className="line-clamp-2 min-h-[2.5em] text-[13px] font-medium leading-[1.3]">{item.nombre}</p>
      <p className="mt-1 flex items-center gap-1.5 font-data text-[10px] tracking-[.06em] text-mute-soft">
        <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
          item.tipo === "real" || imagenNueva ? "bg-ink" : "bg-line"
        }`} />
        #{item.ref} · {item.color.toUpperCase()}
      </p>

      {mensaje && <p className="mt-1.5 text-[11.5px] text-aviso-texto">{mensaje}</p>}
    </div>
  );
}
