import fs from "node:fs";
import path from "node:path";

const DIR_PRODUCTOS = path.join(process.cwd(), "public/productos");
const DIR_PUBLIC = path.join(process.cwd(), "public");
const CATALOGO_PATH = path.join(process.cwd(), "data/catalogo.json");
const EXTENSIONES = [".webp", ".png", ".jpg", ".jpeg"];

let refMapCache: Map<string, { slug: string; marca: string; arquetipo: string }> | null = null;

function obtenerMapaCatalogo() {
  if (refMapCache) return refMapCache;
  const mapa = new Map<string, { slug: string; marca: string; arquetipo: string }>();
  try {
    if (fs.existsSync(CATALOGO_PATH)) {
      const data = JSON.parse(fs.readFileSync(CATALOGO_PATH, "utf-8"));
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.ref) {
            mapa.set(String(item.ref), {
              slug: item.modeloSlug || item.slug || "",
              marca: item.marca || "",
              arquetipo: item.arquetipo || "",
            });
          }
        }
      }
    }
  } catch (e) {
    console.error("Error al leer catalogo.json:", e);
  }
  refMapCache = mapa;
  return mapa;
}

export function rutaImagen(ref: string, slugParam?: string, marcaParam?: string, arquetipoParam?: string): string {
  // 1. Fotos directas por código (A101.jpg, A101.png, etc.)
  if (fs.existsSync(DIR_PRODUCTOS)) {
    for (const ext of EXTENSIONES) {
      if (fs.existsSync(path.join(DIR_PRODUCTOS, `${ref}${ext}`))) {
        return `/productos/${ref}${ext}`;
      }
    }
  }

  // 2. Datos del producto
  let slug = slugParam;
  let marca = marcaParam;
  let arquetipo = arquetipoParam;

  if (!slug) {
    const info = obtenerMapaCatalogo().get(ref);
    if (info) {
      slug = info.slug;
      marca = info.marca;
      arquetipo = info.arquetipo;
    }
  }

  // 3. Búsqueda exhaustiva por carpetas
  if (slug) {
    const s = slug.toLowerCase().trim();
    const mRaw = (marca || "").toLowerCase().trim();

    const marcasProbar = Array.from(new Set([
      mRaw,
      mRaw.replace(/é/g, "e").replace(/á/g, "a").replace(/í/g, "i").replace(/ó/g, "o").replace(/ú/g, "u"),
      mRaw.replace(/\s+/g, "-"),
      mRaw.replace(/\s+/g, ""),
      "generico",
      "genérico"
    ])).filter(Boolean);

    const categoriasProbar = ["smartphone", "smartwatch", "notebook", "tablet", "audio", "consola"];

    for (const m of marcasProbar) {
      for (const cat of categoriasProbar) {
        for (const ext of EXTENSIONES) {
          const rutaRelativa = `imagenes/${m}/${cat}/${s}/default${ext}`;
          if (fs.existsSync(path.join(DIR_PUBLIC, rutaRelativa))) {
            return `/${rutaRelativa}`;
          }
        }
      }
    }
  }

  // 4. Fallback seguro a SVG si la imagen no existe
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
