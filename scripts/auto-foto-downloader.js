#!/usr/bin/env node
/**
 * auto-foto-downloader.js — iPhoneConnection
 * 
 * Descarga automaticamente fotos de productos desde Bing Images.
 * 
 * Uso interactivo (recomendado):
 *   node scripts/auto-foto-downloader.js
 * 
 * Uso automatico (sin preguntar, riesgo de basura):
 *   node scripts/auto-foto-downloader.js --auto
 * 
 * Uso solo para modelos sin foto:
 *   node scripts/auto-foto-downloader.js --solo-faltantes
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CATALOGO_PATH = 'data/catalogo.json';
const MAESTRAS_DIR = 'public/maestras';
const DELAY_MS = 1500;

const AUTO_MODE = process.argv.includes('--auto');
const SOLO_FALTANTES = process.argv.includes('--solo-faltantes');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(q) {
  return new Promise(resolve => rl.question(q, resolve));
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function log(color, msg) {
  const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
    bold: '\x1b[1m'
  };
  console.log((colors[color] || '') + msg + colors.reset);
}

// -- Helpers de busqueda ----------------------------------------------------
function buildQuery(marca, modelo, categoria) {
  const term = (marca + ' ' + modelo).trim();
  const suffix = ' official product photo white background transparent';
  if (categoria === 'iPhone' || modelo.toLowerCase().includes('iphone')) {
    return term + ' official render back white background';
  }
  if (categoria === 'Android') {
    return term + ' official product image back white background';
  }
  if (categoria === 'Notebooks' || modelo.toLowerCase().includes('macbook')) {
    return term + ' official render open angle white background';
  }
  if (categoria === 'Tablets' || modelo.toLowerCase().includes('ipad')) {
    return term + ' official render back white background';
  }
  if (categoria === 'Relojes' || modelo.toLowerCase().includes('watch')) {
    return term + ' official render front white background';
  }
  if (categoria === 'Audio') {
    return term + ' official product photo white background';
  }
  if (categoria === 'Consolas') {
    return term + ' official product render white background';
  }
  if (categoria === 'Accesorios') {
    return term + ' official product photo white background';
  }
  return term + suffix;
}

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'identity',
        'Connection': 'keep-alive',
      }
    };
    https.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchHtml(res.headers.location));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function extractImageUrls(html) {
  const urls = [];
  // Bing Images: murl es la URL directa de la imagen
  const regex = /"murl":"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp))"/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    urls.push(match[1]);
  }
  // Fallback: otros formatos de Bing
  const regex2 = /,murl:"(https?:\/\/[^"]+)"/gi;
  while ((match = regex2.exec(html)) !== null) {
    if (/\.(jpg|jpeg|png|webp)/i.test(match[1])) urls.push(match[1]);
  }
  return [...new Set(urls)];
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        return resolve(downloadFile(res.headers.location, dest));
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error('Status ' + res.statusCode));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => { fs.unlinkSync(dest); reject(err); });
    file.on('error', (err) => { fs.unlinkSync(dest); reject(err); });
  });
}

function existeFoto(slug) {
  if (!fs.existsSync(MAESTRAS_DIR)) return false;
  return fs.readdirSync(MAESTRAS_DIR).some(f =>
    f.toLowerCase().startsWith(slug.toLowerCase())
  );
}

// -- Main -------------------------------------------------------------------
async function main() {
  log('bold', '\n📸 iPhoneConnection — Auto Foto Downloader\n');

  if (!fs.existsSync(CATALOGO_PATH)) {
    log('red', '❌ No se encontro ' + CATALOGO_PATH);
    process.exit(1);
  }

  const catalogo = JSON.parse(fs.readFileSync(CATALOGO_PATH, 'utf8'));

  // Agrupar modelos
  const modelosMap = new Map();
  for (const item of catalogo) {
    const key = item.modeloSlug;
    if (!modelosMap.has(key)) {
      modelosMap.set(key, {
        slug: key,
        modelo: item.modelo,
        marca: item.marca,
        categoria: item.categoria,
        refs: [],
        unidades: 0
      });
    }
    const m = modelosMap.get(key);
    m.refs.push(item.ref);
    m.unidades++;
  }

  let modelos = [...modelosMap.values()].sort((a, b) => {
    if (a.categoria !== b.categoria) return a.categoria.localeCompare(b.categoria);
    return a.modelo.localeCompare(b.modelo);
  });

  if (SOLO_FALTANTES) {
    modelos = modelos.filter(m => !existeFoto(m.slug));
    log('cyan', 'Modo: solo modelos SIN foto actualmente\n');
  }

  log('green', 'Total de modelos a procesar: ' + modelos.length);
  log('gray', 'Modo: ' + (AUTO_MODE ? 'AUTOMATICO (sin preguntar)' : 'INTERACTIVO'));
  log('gray', 'Delay entre descargas: ' + DELAY_MS + 'ms\n');

  if (!AUTO_MODE) {
    const ok = await ask('Presiona ENTER para empezar, o escribe "salir": ');
    if (ok.trim().toLowerCase() === 'salir') {
      rl.close();
      return;
    }
  }

  if (!fs.existsSync(MAESTRAS_DIR)) {
    fs.mkdirSync(MAESTRAS_DIR, { recursive: true });
  }

  let descargadas = 0;
  let saltadas = 0;
  let fallidas = 0;

  for (let i = 0; i < modelos.length; i++) {
    const m = modelos[i];
    const query = buildQuery(m.marca, m.modelo, m.categoria);
    const bingUrl = 'https://www.bing.com/images/search?q=' + encodeURIComponent(query);
    const destino = path.join(MAESTRAS_DIR, m.slug + '.jpg');

    log('bold', '\n[' + (i + 1) + '/' + modelos.length + '] ' + m.categoria + ' — ' + m.marca + ' ' + m.modelo);
    log('gray', 'Query: ' + query);
    log('gray', 'Bing: ' + bingUrl);

    try {
      log('yellow', '🔍 Buscando en Bing...');
      const html = await fetchHtml(bingUrl);
      const urls = extractImageUrls(html);

      if (urls.length === 0) {
        log('red', '❌ No se encontraron imagenes');
        fallidas++;
        continue;
      }

      const url = urls[0];
      log('green', '✅ Imagen encontrada: ' + url.substring(0, 80) + '...');

      if (AUTO_MODE) {
        log('yellow', '⬇️  Descargando...');
        await downloadFile(url, destino);
        log('green', '✅ Guardado: ' + destino);
        descargadas++;
      } else {
        const resp = await ask('[d]escargar | [s]altar | [a]brir navegador | [q]uit: ');
        const r = resp.trim().toLowerCase();
        if (r === 'q' || r === 'quit') {
          log('cyan', '\n👋 Detenido por el usuario.');
          break;
        }
        if (r === 'a' || r === 'abrir') {
          const { exec } = require('child_process');
          exec('termux-open ' + bingUrl);
          const r2 = await ask('Ahora [d]escargar primera imagen | [s]altar: ');
          if (r2.trim().toLowerCase() !== 'd') {
            log('gray', 'Saltado.');
            saltadas++;
            continue;
          }
        }
        if (r === 's' || r === 'saltar') {
          log('gray', 'Saltado.');
          saltadas++;
          continue;
        }
        if (r === 'd' || r === 'descargar' || r === '') {
          log('yellow', '⬇️  Descargando...');
          await downloadFile(url, destino);
          log('green', '✅ Guardado: ' + destino);
          descargadas++;
        } else {
          log('gray', 'Saltado.');
          saltadas++;
        }
      }
    } catch (err) {
      log('red', '❌ Error: ' + err.message);
      fallidas++;
    }

    if (i < modelos.length - 1) {
      log('gray', '⏳ Esperando ' + DELAY_MS + 'ms...');
      await delay(DELAY_MS);
    }
  }

  log('bold', '\n═══════════════════════════════════════');
  log('bold', 'RESUMEN FINAL');
  log('bold', '═══════════════════════════════════════');
  log('green', '✅ Descargadas: ' + descargadas);
  log('yellow', '⏩ Saltadas:    ' + saltadas);
  log('red', '❌ Fallidas:    ' + fallidas);
  log('bold', '═══════════════════════════════════════');
  log('cyan', '\n👉 Ahora corre: npm run imagenes');

  rl.close();
}

main().catch(err => {
  console.error(err);
  rl.close();
  process.exit(1);
});
