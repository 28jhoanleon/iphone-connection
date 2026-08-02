import fs from "node:fs";
import path from "node:path";

const DIR_PRODUCTOS = path.join(process.cwd(), "public/productos");
const DIR_IMAGENES = path.join(process.cwd(), "public/imagenes");
const PRIORIDAD = [".jpg", ".jpeg", ".png", ".webp"];

export function rutaImagen(ref: string, slug?: string, marca?: string, arquetipo?: string): string {
  // 1. Buscar primero en /public/productos por ref (ej: A101.jpg)
  if (fs.existsSync(DIR_PRODUCTOS)) {
    for (const ext of PRIORIDAD) {
      if (fs.existsSync(path.join(DIR_PRODUCTOS, `${ref}${ext}`))) {
        return `/productos/${ref}${ext}`;
      }
    }
  }

  // 2. Si hay slug, buscar en la carpeta de imágenes jerárquica /public/imagenes/...
  if (slug) {
    const m = (marca || "apple").toLowerCase();
    const cat = arquetipo === "reloj" ? "smartwatch" : "smartphone";
    const rutaRelativa = `imagenes/${m}/${cat}/${slug}/default.webp`;
    
    if (fs.existsSync(path.join(process.cwd(), "public", rutaRelativa))) {
      return `/${rutaRelativa}`;
    }
  }

  // 3. Fallback al gráfico SVG generado si no existe foto real ni placeholder cargado
  return `/productos/${ref}.svg`;
}

export function fotografiasPropias(): number {
  if (!fs.existsSync(DIR_PRODUCTOS)) return 0;
  try {
    const archivos = fs.readdirSync(DIR_PRODUCTOS);
    return archivos.filter(a => !a.endsWith(".svg")).length;
  } catch {
    return 0;
  }
}

export function tipoImagen(ref: string): "real" | "generada" {
  if (fs.existsSync(DIR_PRODUCTOS)) {
    for (const ext of PRIORIDAD) {
      if (fs.existsSync(path.join(DIR_PRODUCTOS, `${ref}${ext}`))) {
        return "real";
      }
    }
  }
  return "generada";
}
