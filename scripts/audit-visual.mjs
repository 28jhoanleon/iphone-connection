#!/usr/bin/env node
/**
 * Auditoría visual · iPhone Connection
 *
 * Recorre el sitio publicado, saca una captura de cada pantalla, arma hojas de
 * contacto de 25 y las empaqueta en un ZIP listo para revisar de un vistazo.
 *
 *   npm run audit:visual                      → sitio publicado, catálogo completo
 *   npm run audit:visual -- --url=http://…    → otra URL
 *   npm run audit:visual -- --muestra=40      → sólo 40 fichas, para ir rápido
 *   npm run audit:visual -- --escritorio      → también captura en 1440px
 *
 * Salida: auditoria-visual/  y  auditoria-visual.zip
 *
 * Nota: Playwright necesita un Chromium de escritorio, así que esto NO corre en
 * Termux. Para eso está el workflow de GitHub Actions, que lo ejecuta en cada
 * push y deja el ZIP como artefacto descargable desde el celular.
 */
import { chromium, devices } from "playwright";
import sharp from "sharp";
import archiver from "archiver";
import { readFileSync, mkdirSync, rmSync, createWriteStream, readdirSync } from "node:fs";
import { join } from "node:path";

// ---------- configuración ----------
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);

const BASE = (args.url || process.env.AUDIT_URL || "https://iphone-connection.vercel.app").replace(/\/$/, "");
const SALIDA = "auditoria-visual";
const CONCURRENCIA = Number(args.hilos || 4);
const POR_HOJA = 25;
const COLS = 5;
const CELDA = { ancho: 260, alto: 563 };   // proporción de un celular
const ETIQUETA = 26;

// ---------- rutas a auditar ----------
function rutas() {
  const catalogo = JSON.parse(readFileSync("data/catalogo.json", "utf8")).filter((p) => p.publicado);

  const familias = [...new Set(catalogo.map((p) => p.categoria))].map((c) => ({
    grupo: "1-familias",
    nombre: c,
    url: `/catalogo/${slug(c)}`,
  }));

  const modelos = [...new Map(catalogo.map((p) => [p.modeloSlug, p])).values()].map((p) => ({
    grupo: "2-modelos",
    nombre: p.modelo,
    url: `/modelo/${p.modeloSlug}`,
  }));

  let fichas = catalogo.map((p) => ({
    grupo: "3-fichas",
    nombre: `${p.ref} ${p.nombre}`,
    url: `/unidad/${p.ref}`,
  }));

  if (args.muestra) {
    const n = Number(args.muestra);
    const paso = Math.max(1, Math.floor(fichas.length / n));
    fichas = fichas.filter((_, i) => i % paso === 0).slice(0, n);
  }

  const fijas = [
    ["Home", "/"], ["Nosotros", "/nosotros"], ["Garantía", "/garantia"],
    ["FAQ", "/faq"], ["Contacto", "/contacto"], ["Privacidad", "/privacidad"],
  ].map(([nombre, url]) => ({ grupo: "0-institucionales", nombre, url }));

  return [...fijas, ...familias, ...modelos, ...fichas];
}

const SLUGS = {
  iPhone: "iphone", Android: "android", Tablets: "tablets", Notebooks: "notebooks",
  Relojes: "relojes", Audio: "audio", Accesorios: "accesorios", Consolas: "consolas",
};
const slug = (c) => SLUGS[c] ?? c.toLowerCase().replace(/\s+/g, "-");

// ---------- captura ----------
async function capturar(navegador, lista, perfil, carpeta) {
  const contexto = await navegador.newContext({
    ...perfil.dispositivo,
    locale: "es-AR",
  });
  const cola = [...lista];
  const fallos = [];

  const trabajador = async () => {
    const page = await contexto.newPage();
    while (cola.length) {
      const item = cola.shift();
      const archivo = join(carpeta, `${item.grupo}__${limpiar(item.nombre)}.png`);
      try {
        const r = await page.goto(BASE + item.url, { waitUntil: "networkidle", timeout: 30000 });
        if (!r || r.status() >= 400) throw new Error(`HTTP ${r?.status()}`);

        // dispara las imágenes diferidas antes de capturar
        await page.evaluate(async () => {
          await new Promise((res) => {
            let y = 0;
            const t = setInterval(() => {
              window.scrollBy(0, 600);
              y += 600;
              if (y >= document.body.scrollHeight) { clearInterval(t); res(); }
            }, 60);
          });
        });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(350);

        await page.screenshot({ path: archivo, fullPage: Boolean(args.completo) });
        item.archivo = archivo;
      } catch (e) {
        fallos.push({ url: item.url, error: String(e).split("\n")[0] });
      }
    }
    await page.close();
  };

  await Promise.all(Array.from({ length: CONCURRENCIA }, trabajador));
  await contexto.close();
  return fallos;
}

const limpiar = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

// ---------- hojas de contacto ----------
async function hojas(carpeta, destino, titulo) {
  const archivos = readdirSync(carpeta).filter((f) => f.endsWith(".png")).sort();
  const total = Math.ceil(archivos.length / POR_HOJA);
  const filas = Math.ceil(POR_HOJA / COLS);
  const W = COLS * CELDA.ancho;
  const H = filas * (CELDA.alto + ETIQUETA) + 44;

  for (let h = 0; h < total; h++) {
    const lote = archivos.slice(h * POR_HOJA, (h + 1) * POR_HOJA);
    const capas = [];

    for (let i = 0; i < lote.length; i++) {
      const x = (i % COLS) * CELDA.ancho;
      const y = Math.floor(i / COLS) * (CELDA.alto + ETIQUETA) + 44;
      const buf = await sharp(join(carpeta, lote[i]))
        .resize(CELDA.ancho - 8, CELDA.alto - 8, { fit: "contain", background: "#fff", position: "top" })
        .toBuffer();
      capas.push({ input: buf, left: x + 4, top: y + 4 });

      const etiqueta = lote[i].replace(/\.png$/, "").replace(/^\d-\w+__/, "").slice(0, 34);
      capas.push({
        input: Buffer.from(
          `<svg width="${CELDA.ancho}" height="${ETIQUETA}">
             <text x="6" y="17" font-family="monospace" font-size="11" fill="#6E6E73">${escapar(etiqueta)}</text>
           </svg>`,
        ),
        left: x,
        top: y + CELDA.alto,
      });
    }

    capas.unshift({
      input: Buffer.from(
        `<svg width="${W}" height="44">
           <rect width="${W}" height="44" fill="#0A0A0A"/>
           <text x="14" y="28" font-family="monospace" font-size="15" fill="#FAFAFA">
             ${escapar(titulo)} · hoja ${h + 1} de ${total} · ${lote.length} pantallas
           </text>
         </svg>`,
      ),
      left: 0,
      top: 0,
    });

    await sharp({ create: { width: W, height: H, channels: 3, background: "#FFFFFF" } })
      .composite(capas)
      .jpeg({ quality: 82 })
      .toFile(join(destino, `hoja-${titulo}-${String(h + 1).padStart(2, "0")}.jpg`));
  }
  return total;
}

const escapar = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------- zip ----------
function empaquetar(carpeta, zip) {
  return new Promise((res, rej) => {
    const salida = createWriteStream(zip);
    const a = archiver("zip", { zlib: { level: 9 } });
    salida.on("close", () => res(a.pointer()));
    a.on("error", rej);
    a.pipe(salida);
    a.directory(carpeta, false);
    a.finalize();
  });
}

// ---------- principal ----------
(async () => {
  const t0 = Date.now();
  const lista = rutas();
  console.log(`Auditoría visual de ${BASE}`);
  console.log(`Pantallas a capturar: ${lista.length}\n`);

  rmSync(SALIDA, { recursive: true, force: true });
  mkdirSync(join(SALIDA, "capturas-movil"), { recursive: true });
  mkdirSync(join(SALIDA, "hojas-de-contacto"), { recursive: true });

  const navegador = await chromium.launch();
  const perfiles = [
    { id: "movil", dispositivo: devices["iPhone 13"], carpeta: join(SALIDA, "capturas-movil") },
  ];
  if (args.escritorio) {
    mkdirSync(join(SALIDA, "capturas-escritorio"), { recursive: true });
    perfiles.push({
      id: "escritorio",
      dispositivo: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
      carpeta: join(SALIDA, "capturas-escritorio"),
    });
  }

  const fallos = [];
  for (const p of perfiles) {
    process.stdout.write(`  capturando en ${p.id}… `);
    const f = await capturar(navegador, lista.map((x) => ({ ...x })), p, p.carpeta);
    fallos.push(...f.map((x) => ({ ...x, perfil: p.id })));
    console.log(`${readdirSync(p.carpeta).length} capturas`);
  }
  await navegador.close();

  let hojasTotal = 0;
  for (const p of perfiles) {
    hojasTotal += await hojas(p.carpeta, join(SALIDA, "hojas-de-contacto"), p.id);
  }

  const informe = [
    `AUDITORÍA VISUAL · ${new Date().toLocaleString("es-AR")}`,
    `URL: ${BASE}`,
    `Pantallas: ${lista.length}`,
    `Hojas de contacto: ${hojasTotal}`,
    `Fallos: ${fallos.length}`,
    "",
    ...fallos.map((f) => `  ✗ [${f.perfil}] ${f.url} — ${f.error}`),
  ].join("\n");
  const { writeFileSync } = await import("node:fs");
  writeFileSync(join(SALIDA, "informe.txt"), informe);

  const bytes = await empaquetar(SALIDA, `${SALIDA}.zip`);
  console.log(`\nHojas de contacto: ${hojasTotal}`);
  console.log(`Fallos: ${fallos.length}`);
  fallos.slice(0, 10).forEach((f) => console.log(`  ✗ ${f.url} — ${f.error}`));
  console.log(`\n${SALIDA}.zip · ${(bytes / 1024 / 1024).toFixed(1)} MB · ${((Date.now() - t0) / 1000).toFixed(0)}s`);

  if (fallos.length) process.exit(1);
})();
