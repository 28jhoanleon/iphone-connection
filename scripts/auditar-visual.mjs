/**
 * Auditoría visual · iPhone Connection
 *
 * Recorre el sitio publicado con un navegador real, captura cada pantalla y arma
 * hojas de contacto para revisar todo el catálogo de un vistazo.
 *
 * Existe porque las validaciones automáticas tienen un techo: detectan texto,
 * color equivocado y tamaño, pero no detectan que la foto de un iPhone 14 muestre
 * en realidad un 14 Plus. Eso sólo lo ve una persona, y sólo si puede mirar todo
 * junto en pocos minutos.
 *
 *   npm run audit:visual                    → sitio publicado
 *   npm run audit:visual -- --local         → http://localhost:3000
 *   npm run audit:visual -- --solo=fichas   → sólo fichas de producto
 *   npm run audit:visual -- --limite=40     → primeras 40 fichas (prueba rápida)
 */
let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("Falta Playwright. Instalalo con:\n  npm i -D playwright && npx playwright install chromium");
  process.exit(1);
}
import { readFileSync, mkdirSync, rmSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const args = process.argv.slice(2);
const flag = (n, d = null) => {
  const a = args.find((x) => x.startsWith(`--${n}=`));
  return a ? a.split("=")[1] : args.includes(`--${n}`) ? true : d;
};

const LOCAL = flag("local", false);
const BASE = flag("url", LOCAL ? "http://localhost:3000" : "https://iphone-connection.vercel.app").replace(/\/$/, "");
const SOLO = flag("solo", "todo");
const LIMITE = Number(flag("limite", 0)) || Infinity;

const SALIDA = "auditoria-visual";
const CAPTURAS = join(SALIDA, "capturas");
const HOJAS = join(SALIDA, "hojas");
const POR_HOJA = 25;          // 5 x 5
const VIEWPORT = { width: 412, height: 915 };   // móvil, que es donde entra el cliente

function limpiar() {
  if (existsSync(SALIDA)) rmSync(SALIDA, { recursive: true });
  mkdirSync(CAPTURAS, { recursive: true });
  mkdirSync(HOJAS, { recursive: true });
}

function rutas() {
  const catalogo = JSON.parse(readFileSync("data/catalogo.json", "utf8")).filter((p) => p.publicado);
  const familias = [...new Set(catalogo.map((p) => p.categoria))];
  const modelos = [...new Set(catalogo.map((p) => p.modeloSlug))];

  const SLUG = {
    iPhone: "iphone", Android: "android", Tablets: "tablets", Notebooks: "notebooks",
    Relojes: "relojes", Audio: "audio", Accesorios: "accesorios", Consolas: "consolas",
  };

  const paginas = [
    { grupo: "paginas", nombre: "home", url: "/" },
    { grupo: "paginas", nombre: "nosotros", url: "/nosotros" },
    { grupo: "paginas", nombre: "garantia", url: "/garantia" },
    { grupo: "paginas", nombre: "faq", url: "/faq" },
    { grupo: "paginas", nombre: "contacto", url: "/contacto" },
    { grupo: "paginas", nombre: "privacidad", url: "/privacidad" },
  ];
  const catalogos = familias.map((f) => ({
    grupo: "catalogo", nombre: `cat-${SLUG[f] ?? f.toLowerCase()}`,
    url: `/catalogo/${SLUG[f] ?? f.toLowerCase()}`,
  }));
  const mods = modelos.map((m) => ({ grupo: "modelos", nombre: `mod-${m}`, url: `/modelo/${m}` }));
  const fichas = catalogo.map((p) => ({
    grupo: "fichas", nombre: p.ref, url: `/unidad/${p.ref}`,
    etiqueta: `${p.ref} ${p.nombre}`,
  }));

  const todo = { paginas, catalogo: catalogos, modelos: mods, fichas };
  if (SOLO !== "todo") return todo[SOLO] ?? [];
  return [...paginas, ...catalogos, ...mods, ...fichas.slice(0, LIMITE)];
}

async function capturar(lista) {
  let navegador;
  try {
    navegador = await chromium.launch();
  } catch (e) {
    console.error("\nNo se pudo abrir el navegador. Falta descargarlo:");
    console.error("  npx playwright install chromium\n");
    console.error(String(e.message).split("\n")[0]);
    process.exit(1);
  }
  const ctx = await navegador.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    locale: "es-AR",
  });
  const pagina = await ctx.newPage();
  const fallidas = [];

  for (const [i, r] of lista.entries()) {
    const destino = join(CAPTURAS, `${r.grupo}__${r.nombre}.png`);
    try {
      const resp = await pagina.goto(BASE + r.url, { waitUntil: "networkidle", timeout: 25000 });
      if (!resp || resp.status() >= 400) throw new Error(`HTTP ${resp?.status()}`);
      // las imágenes con loading=lazy no cargan sin scroll
      await pagina.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await pagina.waitForTimeout(350);
      await pagina.evaluate(() => window.scrollTo(0, 0));
      await pagina.waitForTimeout(200);
      await pagina.screenshot({ path: destino, fullPage: r.grupo !== "fichas" });
    } catch (e) {
      fallidas.push({ url: r.url, error: String(e.message).slice(0, 80) });
    }
    if ((i + 1) % 25 === 0 || i === lista.length - 1) {
      process.stdout.write(`\r  capturadas ${i + 1}/${lista.length}`);
    }
  }
  process.stdout.write("\n");
  await navegador.close();
  return fallidas;
}

/** Las hojas de contacto se arman con Python (Pillow), que ya está en el proyecto. */
function armarHojas() {
  const script = `
import os, math
from PIL import Image, ImageDraw

CAP, HOJ, POR = "${CAPTURAS}", "${HOJAS}", ${POR_HOJA}
COLS = 5
CELDA = (300, 640)
ETIQ = 26

archivos = sorted(os.listdir(CAP))
grupos = {}
for f in archivos:
    grupos.setdefault(f.split("__")[0], []).append(f)

total = 0
for grupo, fs in grupos.items():
    for h in range(math.ceil(len(fs) / POR)):
        lote = fs[h * POR:(h + 1) * POR]
        filas = math.ceil(len(lote) / COLS)
        W = COLS * CELDA[0]
        H = filas * (CELDA[1] + ETIQ) + 34
        hoja = Image.new("RGB", (W, H), "white")
        d = ImageDraw.Draw(hoja)
        d.text((10, 10), f"{grupo.upper()}  ·  hoja {h+1}  ·  {len(lote)} pantallas", fill="black")
        for i, f in enumerate(lote):
            im = Image.open(os.path.join(CAP, f)).convert("RGB")
            im.thumbnail(CELDA, Image.LANCZOS)
            x = (i % COLS) * CELDA[0] + (CELDA[0] - im.width) // 2
            y = (i // COLS) * (CELDA[1] + ETIQ) + 34
            hoja.paste(im, (x, y))
            d.rectangle([(i % COLS) * CELDA[0] + 2, y - 2,
                         (i % COLS) * CELDA[0] + CELDA[0] - 2, y + im.height + 2],
                        outline="#DDDDDD")
            d.text(((i % COLS) * CELDA[0] + 6, y + im.height + 5),
                   f.split("__")[1].replace(".png", "")[:34], fill="#555555")
        hoja.save(os.path.join(HOJ, f"{grupo}-{h+1:02d}.jpg"), "JPEG", quality=82)
        total += 1
print(f"  {total} hoja(s) de contacto")
`;
  execSync(`python3 -c ${JSON.stringify(script)}`, { stdio: "inherit" });
}

async function main() {
  const lista = rutas();
  console.log(`Auditoría visual · ${BASE}`);
  console.log(`${lista.length} pantallas · viewport ${VIEWPORT.width}x${VIEWPORT.height}\n`);

  limpiar();
  const fallidas = await capturar(lista);
  armarHojas();

  const nHojas = readdirSync(HOJAS).length;
  execSync(`cd ${SALIDA} && zip -qr ../auditoria-visual.zip .`);

  console.log(`\n  capturas : ${readdirSync(CAPTURAS).length}`);
  console.log(`  hojas    : ${nHojas} en ${HOJAS}`);
  console.log(`  paquete  : auditoria-visual.zip`);

  if (fallidas.length) {
    console.log(`\n  ✗ ${fallidas.length} página(s) no cargaron:`);
    fallidas.slice(0, 15).forEach((f) => console.log(`    ${f.url} → ${f.error}`));
    process.exit(1);
  }
  console.log("\n  Todas las páginas respondieron.");
}

main();
