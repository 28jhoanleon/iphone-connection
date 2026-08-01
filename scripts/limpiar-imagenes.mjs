/**
 * Borra del repositorio las imágenes que ya no corresponden al catálogo.
 *
 * Necesario porque `unzip -o` sobrescribe pero no elimina: si una versión nueva
 * descarta un recorte, el archivo viejo sobrevive en git y el build lo rechaza
 * por no estar firmado.
 */
import { readFileSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const DIR = "public/productos";
const catalogo = JSON.parse(readFileSync("data/catalogo.json", "utf8")).filter((p) => p.publicado);
const firmadas = JSON.parse(readFileSync("data/imagenes-validadas.json", "utf8"));
const refs = new Set(catalogo.map((p) => p.ref));

let borradas = 0;
for (const f of readdirSync(DIR)) {
  const ref = f.replace(/\.[^.]+$/, "");
  const esReal = /\.(webp|jpg|jpeg|png)$/i.test(f);
  const sobra = !refs.has(ref) || (esReal && !firmadas[ref]);
  if (sobra) {
    unlinkSync(join(DIR, f));
    borradas++;
  }
}
console.log(borradas ? `Borradas ${borradas} imagen(es) obsoleta(s).` : "Nada que limpiar.");
