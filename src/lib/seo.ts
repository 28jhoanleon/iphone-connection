/**
 * SEO · metadata y datos estructurados.
 * El dominio sale de data/empresa.json; mientras no exista se usa la URL de Vercel.
 */
import { empresa } from "./empresa";
import type { Unidad } from "./tipos";
import { precioARS, garantia, capacidad } from "./formato";

export const SITIO =
  empresa.dominio || "https://iphone-connection.vercel.app";

export function urlAbsoluta(ruta: string): string {
  return `${SITIO}${ruta.startsWith("/") ? ruta : `/${ruta}`}`;
}

/** JSON-LD Product: habilita el resultado enriquecido con precio y disponibilidad. */
export function jsonLdProducto(u: Unidad, tc: number) {
  const disponible =
    u.disponibilidad === "disponible"
      ? "https://schema.org/InStock"
      : u.disponibilidad === "por_encargo"
        ? "https://schema.org/PreOrder"
        : "https://schema.org/OutOfStock";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: u.nombre,
    sku: u.ref,
    brand: { "@type": "Brand", name: u.marca },
    category: u.categoria,
    color: u.color ?? undefined,
    image: [urlAbsoluta(`/productos/${u.ref}.webp`)],
    description: descripcion(u),
    itemCondition:
      u.estado === "nuevo_sellado"
        ? "https://schema.org/NewCondition"
        : "https://schema.org/UsedCondition",
    offers: {
      "@type": "Offer",
      url: urlAbsoluta(`/unidad/${u.ref}`),
      priceCurrency: "ARS",
      price: (precioARS(u, tc) / 100).toFixed(0),
      availability: disponible,
      itemCondition:
        u.estado === "nuevo_sellado"
          ? "https://schema.org/NewCondition"
          : "https://schema.org/UsedCondition",
      seller: { "@type": "Organization", name: "iPhone Connection" },
      warranty: garantia(u),
    },
  };
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
