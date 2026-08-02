import { Unidad } from "./tipos";

// Exportaciones que requieren admin/page.tsx y auditoria/page.tsx
export const fotografiasPropias = new Set<string>();

export function tipoImagen(unidad: Partial<Unidad> | null | undefined): string {
  if (!unidad) return "default";
  if (unidad.imagen && unidad.imagen.trim() !== "") return "personalizada";
  return "generada";
}

export function rutaImagen(unidad: Partial<Unidad> | null | undefined): string {
  if (!unidad) return "/maestras/default.svg";

  if (unidad.imagen && unidad.imagen.trim() !== "") {
    return unidad.imagen.startsWith("/") ? unidad.imagen : `/${unidad.imagen}`;
  }

  const marca = unidad.marcaSlug || "apple";
  const familia = unidad.familiaSlug || "smartphone";
  const modelo = unidad.modeloSlug || unidad.referencia;

  if (modelo) {
    return `/imagenes/${marca}/${familia}/${modelo}/default.webp`;
  }

  return "/maestras/default.svg";
}
