/**
 * Borra los .norm.webp duplicados que generaba la versión anterior del pipeline.
 * Se ejecuta una sola vez; después no vuelve a hacer nada.
 */
import { readdirSync, unlinkSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), ".."));

const DIR = "public/maestras";
if (!existsSync(DIR)) process.exit(0);

let n = 0;
for (const f of readdirSync(DIR)) {
  if (!f.endsWith(".norm.webp")) continue;
  const base = f.replace(".norm.webp", ".webp");
  if (existsSync(join(DIR, base))) {
    unlinkSync(join(DIR, f));
    n++;
  }
}
console.log(n ? `Borrados ${n} duplicados .norm.webp` : "Sin duplicados en maestras.");
