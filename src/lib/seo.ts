/**
 * SEO · metadata y datos estructurados.
 * El dominio sale de data/empresa.json; mientras no exista se usa la URL de Vercel.
 */
import { empresa } from "./empresa";
import type { Unidad } from "./tipos";
import { garantia, capacidad } from "./formato";

export const SITIO =
  empresa.dominio || "https://iphone-connection.vercel.app";

export function urlAbsoluta(ruta: string): string {
  return `${SITIO}${ruta.startsWith("/") ? ruta : `/${ruta}`}`;
}


export function descripcion(u: Unidad): string {
  const partes = [
    u.nombre,
    u.estadoEtiqueta,
    u.bateria ? `batería ${u.bateria}%` : null,
    u.capacidadGb ? capacidad(u.capacidadGb) : null,
    `garantía escrita de ${garantia(u)}`,
  ].filter(Boolean);
  return `${partes.join(" · ")}. Estado declarado y precio actualizado.`;
}
