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
import { join } from "node:path";

const DIR = "public/productos";
const REALES = [".webp", ".jpg", ".jpeg", ".png"];

const catalogo = JSON.parse(readFileSync("data/catalogo.json", "utf8")).filter((p) => p.publicado);
let firmadas = {};
try {
  firmadas = JSON.parse(readFileSync("data/imagenes-validadas.json", "utf8"));
} catch {
  console.error("✗ Falta data/imagenes-validadas.json. Corré: npm run datos");
  process.exit(1);
}

const archivos = new Set(readdirSync(DIR));
const problemas = [];
let reales = 0, generadas = 0;

for (const p of catalogo) {
  const real = REALES.map((e) => `${p.ref}${e}`).find((f) => archivos.has(f));
  if (real) {
    reales++;
    const hash = createHash("sha1").update(readFileSync(join(DIR, real))).digest("hex").slice(0, 16);
    if (!firmadas[p.ref]) problemas.push(`${p.ref} · imagen sin validar (${real})`);
    else if (firmadas[p.ref] !== hash) problemas.push(`${p.ref} · imagen cambiada después de validarse`);
  } else if (archivos.has(`${p.ref}.svg`)) {
    generadas++;
  } else {
    problemas.push(`${p.ref} · sin ninguna imagen`);
  }
}

console.log(`Imágenes: ${reales} reales validadas · ${generadas} generadas · ${catalogo.length} productos`);

if (problemas.length) {
  console.error(`\n✗ ${problemas.length} problema(s):`);
  problemas.slice(0, 20).forEach((x) => console.error("  " + x));
  process.exit(1);
}
console.log("Todas las imágenes publicadas están validadas.");
