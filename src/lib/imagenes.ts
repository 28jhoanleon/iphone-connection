export type TipoImagenResultado = "generada" | "real";

export function fotografiasPropias(): number {
  return 0;
}

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

  // Si le pasan un string directo
  if (typeof input === "string") {
    if (input.startsWith("/")) return input;
    const slugLimpio = input.toLowerCase().trim().replace(/\s+/g, "-");
    return `/imagenes/apple/smartphone/${slugLimpio}/default.webp`;
  }

  // Si le pasan un objeto
  if (input?.imagen && typeof input.imagen === "string" && input.imagen.trim() !== "") {
    return input.imagen.startsWith("/") ? input.imagen : `/${input.imagen}`;
  }

  const marca = (input?.marcaSlug || input?.marca || "apple").toLowerCase().trim().replace(/\s+/g, "-");
  const familia = (input?.familiaSlug || input?.categoria || "smartphone").toLowerCase().trim().replace(/\s+/g, "-");
  let modelo = input?.modeloSlug || input?.referencia || input?.ref || input?.modelo || input?.nombre;

  if (modelo) {
    modelo = modelo.toLowerCase().trim().replace(/\s+/g, "-");
    return `/imagenes/${marca}/${familia}/${modelo}/default.webp`;
  }

  return "/maestras/default.svg";
}
