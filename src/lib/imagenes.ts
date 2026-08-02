import fs from "node:fs";
import path from "node:path";

const DIR_PRODUCTOS = path.join(process.cwd(), "public/productos");
const CATALOGO_PATH = path.join(process.cwd(), "data/catalogo.json");
const EXTENSIONES = [".webp", ".png", ".jpg", ".jpeg"];

let mapaImagenesJson: Map<string, string> | null = null;

function cargarMapaJson() {
  if (mapaImagenesJson) return mapaImagenesJson;
  const mapa = new Map<string, string>();
  try {
    if (fs.existsSync(CATALOGO_PATH)) {
      const data = JSON.parse(fs.readFileSync(CATALOGO_PATH, "utf-8"));
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.ref && item.imagen) {
            mapa.set(String(item.ref), String(item.imagen));
          }
        }
      }
    }
  } catch (e) {
    console.error("Error al leer catalogo.json:", e);
  }
  mapaImagenesJson = mapa;
  return mapa;
}

export function rutaImagen(ref: string, slugParam?: string): string {
  // 1. Si existe foto propia por ref en /public/productos/ (ej: A101.jpg)
  if (fs.existsSync(DIR_PRODUCTOS)) {
    for (const ext of EXTENSIONES) {
      if (fs.existsSync(path.join(DIR_PRODUCTOS, `${ref}${ext}`))) {
        return `/productos/${ref}${ext}`;
      }
    }
  }

  // 2. Usar la ruta explícita del JSON si existe
  const rutaDesdeJson = cargarMapaJson().get(ref);
  if (rutaDesdeJson) {
    // Si la imagen en el JSON es física en /public, verificar si existe en servidor
    const limpia = rutaDesdeJson.startsWith("/") ? rutaDesdeJson.slice(1) : rutaDesdeJson;
    const rutaFisica = path.join(process.cwd(), "public", limpia);
    
    if (fs.existsSync(rutaFisica)) {
      return rutaDesdeJson;
    }
  }

  // 3. Fallback SVG si no existe el archivo físico
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
    for (const ext of EXTENSIONES) {
      if (fs.existsSync(path.join(DIR_PRODUCTOS, `${ref}${ext}`))) {
        return "real";
      }
    }
  }
  return "generada";
}
