import fs from "node:fs";
import path from "node:path";

const DIR_PRODUCTOS = path.join(process.cwd(), "public/productos");
const DIR_PUBLIC = path.join(process.cwd(), "public");
const CATALOGO_PATH = path.join(process.cwd(), "data/catalogo.json");
const PRIORIDAD = [".jpg", ".jpeg", ".png", ".webp"];

// Indice en memoria para no re-leer el JSON en cada renderizado
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
    console.error("Error al leer catalogo.json en rutaImagen:", e);
  }
  refMapCache = mapa;
  return mapa;
}

export function rutaImagen(ref: string, slugParam?: string, marcaParam?: string, arquetipoParam?: string): string {
  // 1. Prioridad absoluta: si existe la foto propia en /public/productos/ (ej: A101.jpg)
  if (fs.existsSync(DIR_PRODUCTOS)) {
    for (const ext of PRIORIDAD) {
      if (fs.existsSync(path.join(DIR_PRODUCTOS, `${ref}${ext}`))) {
        return `/productos/${ref}${ext}`;
      }
    }
  }

  // 2. Obtener slug, marca y arquetipo automáticamente desde catalogo.json si no vinieron por parámetro
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

  // 3. Buscar la imagen en public/imagenes/
  if (slug) {
    const s = slug.toLowerCase().trim();
    const mRaw = (marca || "").toLowerCase().trim();

    // Probar variaciones de marca (con tildes, sin tildes, con guiones)
    const marcasProbar = Array.from(new Set([
      mRaw,
      mRaw.replace(/é/g, "e").replace(/á/g, "a").replace(/í/g, "i").replace(/ó/g, "o").replace(/ú/g, "u"),
      mRaw.replace(/\s+/g, "-"),
      mRaw.replace(/\s+/g, ""),
      "generico",
      "genérico"
    ])).filter(Boolean);

    // Categorías donde podría estar guardada la carpeta
    const categoriasProbar = ["smartphone", "smartwatch", "notebook", "tablet", "audio", "consola"];

    for (const m of marcasProbar) {
      for (const cat of categoriasProbar) {
        const rutaRelativa = `imagenes/${m}/${cat}/${s}/default.webp`;
        if (fs.existsSync(path.join(DIR_PUBLIC, rutaRelativa))) {
          return `/${rutaRelativa}`;
        }
      }
    }
  }

  // 4. Si no se encontró ningún archivo, recurrir al SVG
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
