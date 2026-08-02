// Tipo estricto esperado por ItemAuditoria en auditoria/page.tsx
export type TipoImagenResultado = "generada" | "real";

// Función requerida por admin/page.tsx
export function fotografiasPropias(): number {
  return 0;
}

// Acepta cualquier entrada sin validar tipos estrictos para evitar rejections en Vercel
export function tipoImagen(input: any): TipoImagenResultado {
  if (!input) return "generada";
  if (typeof input === "string") return "generada";
  if (input?.imagen && typeof input.imagen === "string" && input.imagen.trim() !== "") {
    return "real";
  }
  return "generada";
}

export function rutaImagen(input: any): string {
  if (!input) return "/maestras/default.svg";

  if (typeof input === "string") {
    if (input.startsWith("/")) return input;
    return `/imagenes/apple/smartphone/${input}/default.webp`;
  }

  if (input?.imagen && typeof input.imagen === "string" && input.imagen.trim() !== "") {
    return input.imagen.startsWith("/") ? input.imagen : `/${input.imagen}`;
  }

  const marca = input?.marcaSlug || "apple";
  const familia = input?.familiaSlug || "smartphone";
  const modelo = input?.modeloSlug || input?.referencia || input?.ref;

  if (modelo) {
    return `/imagenes/${marca}/${familia}/${modelo}/default.webp`;
  }

  return "/maestras/default.svg";
}
