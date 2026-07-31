import Link from "next/link";
import type { Unidad } from "@/lib/tipos";
import { precio, precioARS } from "@/lib/formato";
import { rutaImagen } from "@/lib/imagenes";
import EtiquetaEstado from "./EtiquetaEstado";
import Readout from "./Readout";

/**
 * Tarjeta única de producto. Se usa en Home, catálogo y resultados.
 * Estructura fija para que ninguna tarjeta "salte":
 *   imagen 1:1 · etiqueta · nombre (2 líneas reservadas) · precio · readout al pie
 * El precio va anclado abajo con margin-top:auto, así queda a la misma altura
 * en todas las tarjetas aunque el nombre ocupe una línea o dos.
 */
export default function TarjetaUnidad({
  u,
  tc,
  ultimas = false,
  prioridad = false,
}: {
  u: Unidad;
  tc: number;
  ultimas?: boolean;
  prioridad?: boolean;
}) {
  return (
    <Link
      href={`/unidad/${u.ref}`}
      className="group flex h-full flex-col rounded-lg border border-line bg-paper p-3 transition duration-200 hover:-translate-y-0.5 hover:border-ink sm:p-4"
    >
      <div className="mb-3 aspect-square overflow-hidden rounded-md bg-white">
        <img
          src={rutaImagen(u.ref)}
          alt={u.nombre}
          width={600}
          height={600}
          loading={prioridad ? "eager" : "lazy"}
          decoding="async"
          className="h-full w-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.04]"
        />
      </div>

      <EtiquetaEstado unidad={u} ultimas={ultimas} />

      <h3 className="mt-2.5 line-clamp-2 min-h-[2.6em] text-[14.5px] font-medium leading-[1.3] tracking-[-.01em]">
        {u.nombre}
      </h3>

      <p className="mt-auto pt-3 text-[21px] font-semibold leading-none tracking-[-.02em] sm:text-[22px]">
        {precio(precioARS(u, tc))}
      </p>
      <p className="mt-1.5 text-[12.5px] text-mute">{u.estadoEtiqueta}</p>

      <Readout u={u} />
    </Link>
  );
}
