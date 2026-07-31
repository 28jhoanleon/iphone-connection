/**
 * Resolución de imágenes en tiempo de build.
 * Prioridad: fotografía propia (.jpg/.jpeg/.png/.webp) > imagen generada (.svg)
 * Dejar caer `A104.jpg` en /public/productos reemplaza esa imagen sin tocar código.
 */
import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "public/productos");
const PRIORIDAD = [".jpg", ".jpeg", ".png", ".webp", ".svg"];

let cache: Map<string, string> | null = null;

function indice(): Map<string, string> {
  if (cache) return cache;
  const m = new Map<string, string>();
  let archivos: string[] = [];
  try {
    archivos = fs.readdirSync(DIR);
  } catch {
    archivos = [];
  }
  for (const ext of [...PRIORIDAD].reverse()) {
    for (const a of archivos) {
      if (a.toLowerCase().endsWith(ext)) m.set(path.basename(a, path.extname(a)), a);
    }
  }
  cache = m;
  return m;
}

export function rutaImagen(ref: string): string {
  const archivo = indice().get(ref);
  return archivo ? `/productos/${archivo}` : `/productos/${ref}.svg`;
}

export function fotografiasPropias(): number {
  return [...indice().values()].filter((a) => !a.endsWith(".svg")).length;
}
