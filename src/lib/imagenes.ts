import { Unidad } from "./tipos";

// Función requerida por admin/page.tsx
export function fotografiasPropias(): number {
  return 0;
}

// Acepta tanto un string (referencia/slug) como un objeto Unidad o Partial<Unidad>
export function tipoImagen(input: string | Partial<Unidad> | null | undefined): string {
  if (!input) return "default";
  
  if (typeof input === "string") {
    return "generada";
  }

  if (input.imagen && input.imagen.trim() !== "") return "personalizada";
  return "generada";
}

// Acepta tanto un string (referencia/slug) como un objeto Unidad o Partial<Unidad>
export function rutaImagen(input: string | Partial<Unidad> | null | undefined): string {
  if (!input) return "/maestras/default.svg";

  // Si le pasan directamente un string (u.ref o ruta)
  if (typeof input === "string") {
    if (input.startsWith("/")) return input;
    return `/imagenes/apple/smartphone/${input}/default.webp`;
  }

  // Si le pasan un objeto Unidad
  if (input.imagen && input.imagen.trim() !== "") {
    return input.imagen.startsWith("/") ? input.imagen : `/${input.imagen}`;
  }

  const marca = input.marcaSlug || "apple";
  const familia = input.familiaSlug || "smartphone";
  const modelo = input.modeloSlug || input.referencia;

  if (modelo) {
    return `/imagenes/${marca}/${familia}/${modelo}/default.webp`;
  }

  return "/maestras/default.svg";
}
