import { Unidad } from "./tipos";

// Función requerida por admin/page.tsx
export function fotografiasPropias(): number {
  return 0;
}

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
