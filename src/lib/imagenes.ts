import fs from "node:fs";
import path from "node:path";

const DIR_PRODUCTOS = path.join(process.cwd(), "public/productos");
const PRIORIDAD = [".jpg", ".jpeg", ".png", ".webp"];

export function rutaImagen(ref: string, slug?: string, marca?: string, arquetipo?: string): string {
  // 1. Prioridad: Buscar por referencia directa en /public/productos/ (ej: A101.jpg)
  if (fs.existsSync(DIR_PRODUCTOS)) {
    for (const ext of PRIORIDAD) {
      if (fs.existsSync(path.join(DIR_PRODUCTOS, `${ref}${ext}`))) {
        return `/productos/${ref}${ext}`;
      }
    }
  }

  // 2. Buscar en la estructura jerárquica /public/imagenes/
  if (slug) {
    const m = (marca || "generico").toLowerCase().trim();
    const s = slug.toLowerCase().trim();
    let cat = arquetipo === "reloj" ? "smartwatch" : "smartphone";

    // Intentar variante 1: Categoria inferida (smartwatch, smartphone, notebook, etc.)
    let rutaRelativa = `imagenes/${m}/${cat}/${s}/default.webp`;
    if (fs.existsSync(path.join(process.cwd(), "public", rutaRelativa))) {
      return `/${rutaRelativa}`;
    }

    // Intentar variante 2: Forzar 'smartphone' (donde están casi todas las carpetas físicas)
    rutaRelativa = `imagenes/${m}/smartphone/${s}/default.webp`;
    if (fs.existsSync(path.join(process.cwd(), "public", rutaRelativa))) {
      return `/${rutaRelativa}`;
    }

    // Intentar variante 3: Forzar 'smartwatch'
    rutaRelativa = `imagenes/${m}/smartwatch/${s}/default.webp`;
    if (fs.existsSync(path.join(process.cwd(), "public", rutaRelativa))) {
      return `/${rutaRelativa}`;
    }
  }

  // 3. Fallback al SVG dinámico solo si no existe el archivo estático
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
