import { Unidad } from "./tipos";

// Función requerida por admin/page.tsx
export function fotografiasPropias(): number {
  return 0;
}

// Tipo estricto esperado por ItemAuditoria en auditoria/page.tsx
export type TipoImagenResultado = "generada" | "real";

export function tipoImagen(input: string | Partial<Unidad> | null | undefined): TipoImagenResultado {
  if (!input) return "generada";
  
  if (typeof input === "string") {
    return "generada";
  }

  if (input.imagen && input.imagen.trim() !== "") return "real";
  return "generada";
}

export function rutaImagen(input: string | Partial<Unidad> | null | undefined): string {
  if (!input) return "/maestras/default.svg";

  if (typeof input === "string") {
    if (input.startsWith("/")) return input;
    return `/imagenes/apple/smartphone/${input}/default.webp`;
  }

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
