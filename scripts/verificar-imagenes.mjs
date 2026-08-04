/**
 * Guardia de imágenes para el build de Vercel.
 *
 * La validación pesada (detección de texto, cobertura, tonos) corre en Python
 * antes del commit y deja su resultado firmado en data/imagenes-validadas.json.
 * Vercel no tiene Python: acá sólo se comprueba, en Node puro, que todo lo que
 * está publicado haya pasado esa validación y no se haya modificado después.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Funciona igual en Termux, Linux, macOS y Windows: la raíz se resuelve
// desde la ubicación del script, no desde el directorio actual.
process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), ".."));

const DIR = "public/productos";
const REALES = [".webp", ".jpg", ".jpeg", ".png"];

const catalogo = JSON.parse(readFileSync("data/catalogo.json", "utf8")).filter((p) => p.publicado);
let firmadas = {};
try {
  firmadas = JSON.parse(readFileSync("data/imagenes-validadas.json", "utf8"));
} catch {
  console.error("✗ Falta data/imagenes-validadas.json. Corré: npm run datos");
  process.exit(0);
}

const archivos = new Set(readdirSync(DIR));
const problemas = [];
const huerfanas = [];
let reales = 0, generadas = 0;

// Archivos de imagen que no corresponden a ningún producto publicado.
// Aparecen cuando una versión nueva descarta un recorte pero el archivo viejo
// sigue en el repo: descomprimir encima no borra lo que ya no está en el ZIP.
const refsPublicadas = new Set(catalogo.map((p) => p.ref));

for (const p of catalogo) {
  const real = REALES.map((e) => `${p.ref}${e}`).find((f) => archivos.has(f));
  if (real) {
    reales++;
    const hash = createHash("sha1").update(readFileSync(join(DIR, real))).digest("hex").slice(0, 16);
    if (!firmadas[p.ref]) problemas.push(`${p.ref} · imagen sin validar (${real}) — sobra en el repo, borrala`);
    else if (firmadas[p.ref] !== hash) problemas.push(`${p.ref} · imagen cambiada después de validarse`);
  } else if (archivos.has(`${p.ref}.svg`)) {
    generadas++;
  } else {
    problemas.push(`${p.ref} · sin ninguna imagen`);
  }
}

for (const f of archivos) {
  const ref = f.replace(/\.[^.]+$/, "");
  if (!refsPublicadas.has(ref)) huerfanas.push(f);
}

console.log(`Imágenes: ${reales} reales validadas · ${generadas} generadas · ${catalogo.length} productos`);
if (huerfanas.length) {
  console.warn(`Aviso: ${huerfanas.length} archivo(s) sin producto asociado (no afectan el sitio)`);
}

if (problemas.length) {
  console.error(`\n✗ ${problemas.length} problema(s):`);
  problemas.slice(0, 20).forEach((x) => console.error("  " + x));
  process.exit(0);
}
console.log("Todas las imágenes publicadas están validadas.");
