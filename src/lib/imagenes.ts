/**
 * Resolución de imágenes en tiempo de build.
 * Prioridad: fotografía propia (.jpg/.jpeg/.png/.webp) > imagen del modelo (.webp) > SVG genérico
 */
import fs from "node:fs";
import path from "node:path";
import type { Unidad } from "./tipos";

const DIR_PRODUCTOS = path.join(process.cwd(), "public/productos");
const DIR_IMAGENES = path.join(process.cwd(), "public/imagenes");
const EXT_REALES = [".jpg", ".jpeg", ".png", ".webp"];
const PRIORIDAD = [...EXT_REALES, ".svg"];

let cacheProductos: Map<string, string> | null = null;
let cacheFallbacks: Map<string, string> | null = null;

function indiceProductos(): Map<string, string> {
  if (cacheProductos) return cacheProductos;
  const m = new Map<string, string>();
  let archivos: string[] = [];
  try {
    archivos = fs.readdirSync(DIR_PRODUCTOS);
  } catch {
    archivos = [];
  }
  for (const ext of [...PRIORIDAD].reverse()) {
    for (const a of archivos) {
      if (a.toLowerCase().endsWith(ext)) m.set(path.basename(a, path.extname(a)), a);
    }
  }
  cacheProductos = m;
  return m;
}

/** Escanea public/imagenes/ y arma un mapa modeloSlug → ruta del default.webp */
function indiceFallbacks(): Map<string, string> {
  if (cacheFallbacks) return cacheFallbacks;
  const m = new Map<string, string>();

  try {
    const marcas = fs.readdirSync(DIR_IMAGENES);
    for (const marca of marcas) {
      const marcaPath = path.join(DIR_IMAGENES, marca);
      if (!fs.statSync(marcaPath).isDirectory()) continue;

      const categorias = fs.readdirSync(marcaPath);
      for (const categoria of categorias) {
        const catPath = path.join(marcaPath, categoria);
        if (!fs.statSync(catPath).isDirectory()) continue;

        const modelos = fs.readdirSync(catPath);
        for (const modelo of modelos) {
          const modeloPath = path.join(catPath, modelo);
          if (!fs.statSync(modeloPath).isDirectory()) continue;

          const archivos = fs.readdirSync(modeloPath);
          const def = archivos.find((a) => a.toLowerCase().startsWith("default"));
          if (def) {
            m.set(modelo, `/imagenes/${marca}/${categoria}/${modelo}/${def}`);
          }
        }
      }
    }
  } catch {
    // public/imagenes no existe o está vacío
  }

  cacheFallbacks = m;
  return m;
}

/**
 * Resuelve la ruta de imagen para una unidad completa.
 * 1. ¿Foto REAL (.jpg/.jpeg/.png/.webp) en public/productos/? → la usa.
 * 2. ¿Imagen del modelo en public/imagenes/.../default.webp? → la usa.
 * 3. Ninguna de las dos → SVG genérico.
 */
export function rutaImagenUnidad(u: Unidad): string {
  const archivo = indiceProductos().get(u.ref);
  const esReal = archivo && EXT_REALES.some((ext) => archivo.toLowerCase().endsWith(ext));
  if (esReal) return `/productos/${archivo}`;

  const fallback = indiceFallbacks().get(u.modeloSlug);
  if (fallback) return fallback;

  return `/productos/${u.ref}.svg`;
}

/** Legacy: resuelve solo por ref, sin acceso a fallback del modelo. */
export function rutaImagen(ref: string): string {
  const archivo = indiceProductos().get(ref);
  return archivo ? `/productos/${archivo}` : `/productos/${ref}.svg`;
}

export function fotografiasPropias(): number {
  return [...indiceProductos().values()].filter((a) => !a.endsWith(".svg")).length;
}

export function tipoImagen(ref: string): "real" | "generada" {
  const a = indiceProductos().get(ref);
  return a && !a.endsWith(".svg") ? "real" : "generada";
}
