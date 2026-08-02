import fs from "node:fs";
import path from "node:path";

const DIR_PRODUCTOS = path.join(process.cwd(), "public/productos");
const DIR_IMAGENES = path.join(process.cwd(), "public/imagenes");
const CATALOGO_PATH = path.join(process.cwd(), "data/catalogo.json");
const EXTENSIONES = [".webp", ".png", ".jpg", ".jpeg"];

let mapaImagenesFisicas: Map<string, string> | null = null;
let refMapCache: Map<string, string> | null = null;

function escaniarDirectorio(dir: string): string[] {
  let resultados: string[] = [];
  if (!fs.existsSync(dir)) return resultados;

  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      resultados = resultados.concat(escaniarDirectorio(fullPath));
    } else if (EXTENSIONES.some(ext => item.name.toLowerCase().endsWith(ext))) {
      resultados.push(fullPath);
    }
  }
  return resultados;
}

function obtenerMapaImagenes() {
  if (mapaImagenesFisicas) return mapaImagenesFisicas;

  const mapa = new Map<string, string>();
  const todosLosArchivos = escaniarDirectorio(DIR_IMAGENES);

  for (const archivoPath of todosLosArchivos) {
    const relativa = path.relative(path.join(process.cwd(), "public"), archivoPath).replace(/\\/g, "/");
    const partes = relativa.split("/");

    if (partes.length >= 4) {
      const slugCarpeta = partes[partes.length - 2].toLowerCase().trim();
      if (!mapa.has(slugCarpeta)) {
        mapa.set(slugCarpeta, `/${relativa}`);
      }
    }
  }

  mapaImagenesFisicas = mapa;
  return mapa;
}

function obtenerMapaCatalogo() {
  if (refMapCache) return refMapCache;
  const mapa = new Map<string, string>();
  try {
    if (fs.existsSync(CATALOGO_PATH)) {
      const data = JSON.parse(fs.readFileSync(CATALOGO_PATH, "utf-8"));
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item.ref) {
            const slug = item.modeloSlug || item.slug || "";
            if (slug) mapa.set(String(item.ref), String(slug));
          }
        }
      }
    }
  } catch (e) {
    console.error("Error leyendo catalogo.json:", e);
  }
  refMapCache = mapa;
  return mapa;
}

export function rutaImagen(ref: string, slugParam?: string): string {
  if (fs.existsSync(DIR_PRODUCTOS)) {
    for (const ext of EXTENSIONES) {
      if (fs.existsSync(path.join(DIR_PRODUCTOS, `${ref}${ext}`))) {
        return `/productos/${ref}${ext}`;
      }
    }
  }

  let slug = slugParam;
  if (!slug) {
    slug = obtenerMapaCatalogo().get(ref);
  }

  if (slug) {
    const slugNorm = slug.toLowerCase().trim();
    const mapaFisico = obtenerMapaImagenes();
    if (mapaFisico.has(slugNorm)) {
      return mapaFisico.get(slugNorm)!;
    }
  }

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
