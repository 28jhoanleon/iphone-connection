import { Unidad } from "./tipos";

export function rutaImagen(unidad: Partial<Unidad> | null | undefined): string {
  if (!unidad) return "/maestras/default.svg";

  // 1. Si viene una imagen directa definida
  if (unidad.imagen && unidad.imagen.trim() !== "") {
    return unidad.imagen.startsWith("/") ? unidad.imagen : `/${unidad.imagen}`;
  }

  // 2. Ruta estructurada por marca / familia / modelo
  const marca = unidad.marcaSlug || "apple";
  const familia = unidad.familiaSlug || "smartphone";
  const modelo = unidad.modeloSlug || unidad.referencia;

  if (modelo) {
    return `/imagenes/${marca}/${familia}/${modelo}/default.webp`;
  }

  return "/maestras/default.svg";
}
