#!/usr/bin/env node
/**
 * foto-hunter-v3.3.js — iPhoneConnection Foto Hunter (Soporte Colores)
 * 
 * Flujo con colores:
 *   1. Abres la web, ves la lista de modelos y cada uno de sus colores.
 *   2. Tocas Google (te busca el color exacto).
 *   3. Descargas la foto normalmente (va a /sdcard/Download/).
 *   4. Volves y tocas "Usar ultima descarga".
 *   5. El servidor la copia a public/maestras/{slug}-{color}.webp
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const CATALOGO_PATH = 'data/catalogo.json';
const MAESTRAS_DIR = path.resolve('public/maestras');
const DOWNLOAD_DIR = '/sdcard/Download';
const PORT = 8080;

// Magic bytes para validar imagenes
const IMAGE_MAGIC = {
  jpg: Buffer.from([0xFF, 0xD8]),
  png: Buffer.from([0x89, 0x50]),
  gif: Buffer.from([0x47, 0x49]),
  webp: Buffer.from([0x52, 0x49]),
};

function normalizarColor(cadena) {
  if (!cadena) return '';
  return cadena
    .toLowerCase()
    .replace(/ /g, '-')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function esImagenReal(buffer) {
  if (buffer.length < 2) return false;
  const head = buffer.slice(0, 2);
  return Object.values(IMAGE_MAGIC).some(magic => head.equals(magic));
}

function detectarExtension(buffer) {
  if (buffer.length < 4) return '.jpg';
  if (buffer.slice(0, 2).equals(IMAGE_MAGIC.jpg)) return '.jpg';
  if (buffer.slice(0, 2).equals(IMAGE_MAGIC.png)) return '.png';
  if (buffer.slice(0, 2).equals(IMAGE_MAGIC.gif)) return '.gif';
  if (buffer.slice(0, 4).toString().includes('RIFF') && buffer.slice(8, 12).toString() === 'WEBP') return '.webp';
  return '.jpg';
}

function buildSearchQuery(marca, modelo, categoria, color) {
  const term = (marca + ' ' + modelo).trim();
  let base = '';
  if (categoria === 'iPhone' || modelo.toLowerCase().includes('iphone')) base = ' official render back white background';
  else if (categoria === 'Android') base = ' official product image back white background';
  else if (categoria === 'Notebooks' || modelo.toLowerCase().includes('macbook')) base = ' official render open angle white background';
  else if (categoria === 'Tablets' || modelo.toLowerCase().includes('ipad')) base = ' official render back white background';
  else if (categoria === 'Relojes' || modelo.toLowerCase().includes('watch')) base = ' official render front white background';
  else if (categoria === 'Audio') base = ' official product photo white background';
  else if (categoria === 'Consolas') base = ' official product render white background';
  else if (categoria === 'Accesorios') base = ' official product photo white background';
  else base = ' official product image white background';
  
  const colorStr = color ? ` ${color}` : '';
  return term + colorStr + base + ' png';
}

function buildUrl(query, engine) {
  const q = encodeURIComponent(query);
  switch (engine) {
    case 'google': return 'https://www.google.com/search?tbm=isch&q=' + q;
    case 'bing':   return 'https://www.bing.com/images/search?q=' + q;
    case 'ddg':    return 'https://duckduckgo.com/?q=' + q + '&iax=images&ia=images';
    default:       return 'https://www.google.com/search?tbm=isch&q=' + q;
  }
}

function escanearMaestras() {
  const existentes = new Set();
  if (!fs.existsSync(MAESTRAS_DIR)) return existentes;
  const files = fs.readdirSync(MAESTRAS_DIR);
  for (const f of files) {
    const slug = f.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '');
    existentes.add(slug);
  }
  return existentes;
}

function descargarImagen(url, fullSlug, callback) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (e) {
    return callback(new Error('URL invalida'));
  }

  const client = parsed.protocol === 'https:' ? https : http;
  const req = client.get(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    timeout: 15000
  }, (res) => {
    if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
      if (!res.headers.location) return callback(new Error('Redirect sin Location'));
      return descargarImagen(res.headers.location, fullSlug, callback);
    }
    if (res.statusCode !== 200) return callback(new Error('HTTP ' + res.statusCode));
    const ct = (res.headers['content-type'] || '').toLowerCase();
    if (ct.includes('text/html') || ct.includes('application/xhtml')) return callback(new Error('La URL devuelve una pagina web'));

    let ext = '.jpg';
    if (ct.includes('png')) ext = '.png';
    else if (ct.includes('webp')) ext = '.webp';
    else if (ct.includes('gif')) ext = '.gif';
    else if (ct.includes('jpeg')) ext = '.jpg';

    if (!fs.existsSync(MAESTRAS_DIR)) fs.mkdirSync(MAESTRAS_DIR, { recursive: true });
    const destino = path.join(MAESTRAS_DIR, fullSlug + ext);
    const file = fs.createWriteStream(destino);
    let primerosBytes = Buffer.alloc(0);
    let validado = false;

    res.on('data', (chunk) => {
      if (!validado && primerosBytes.length < 16) {
        primerosBytes = Buffer.concat([primerosBytes, chunk]);
        if (primerosBytes.length >= 4) {
          if (!esImagenReal(primerosBytes)) {
            file.destroy();
            fs.unlink(destino, () => {});
            req.destroy();
            validado = true;
            return callback(new Error('El archivo no es una imagen real'));
          }
          validado = true;
        }
      }
    });
    res.pipe(file);
    file.on('finish', () => {
      file.close();
      if (!validado && !esImagenReal(primerosBytes)) {
        fs.unlink(destino, () => {});
        return callback(new Error('Archivo descargado no es una imagen valida'));
      }
      const stats = fs.statSync(destino);
      callback(null, { path: destino, ext: ext, sizeKb: Math.round(stats.size / 1024) });
    });
    file.on('error', (err) => {
      fs.unlink(destino, () => {});
      callback(err);
    });
  });
  req.on('error', callback);
  req.on('timeout', () => { req.destroy(); callback(new Error('Timeout')); });
}

function usarUltimaDescarga(fullSlug, callback) {
  if (!fs.existsSync(DOWNLOAD_DIR)) return callback(new Error('No se encontro ' + DOWNLOAD_DIR));
  const files = fs.readdirSync(DOWNLOAD_DIR)
    .map(f => {
      const ruta = path.join(DOWNLOAD_DIR, f);
      try { const stat = fs.statSync(ruta); return { nombre: f, ruta: ruta, mtime: stat.mtime.getTime(), size: stat.size }; }
      catch (e) { return null; }
    })
    .filter(f => f !== null && f.size > 1000)
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) return callback(new Error('Sin archivos recientes en Download'));

  let encontrado = null;
  for (const f of files) {
    try {
      const fd = fs.openSync(f.ruta, 'r');
      const header = Buffer.alloc(16);
      fs.readSync(fd, header, 0, 16, 0);
      fs.closeSync(fd);
      if (esImagenReal(header)) {
        encontrado = { ...f, header };
        break;
      }
    } catch (e) {}
  }
  if (!encontrado) return callback(new Error('No se encontro ninguna imagen real en Download'));

  const ext = detectarExtension(encontrado.header);
  if (!fs.existsSync(MAESTRAS_DIR)) fs.mkdirSync(MAESTRAS_DIR, { recursive: true });
  const destino = path.join(MAESTRAS_DIR, fullSlug + ext);

  fs.copyFile(encontrado.ruta, destino, (err) => {
    if (err) return callback(err);
    const stats = fs.statSync(destino);
    callback(null, { path: destino, ext: ext, sizeKb: Math.round(stats.size / 1024), origen: encontrado.nombre });
  });
}

function generarHtml(modelos, yaDescargados) {
  const cats = [...new Set(modelos.map(m => m.categoria))].sort();
  const catOptions = cats.map(c => `<option value="${c}">${c}</option>`).join('');

  const modelosHtml = modelos.map(m => {
    let coloresList = [];
    if (m.colores && m.colores.length > 0) coloresList = m.colores;
    else if (m.color) coloresList = [m.color];
    else coloresList = [''];

    const colorCardsHtml = coloresList.map(color => {
      const colorSlug = color ? normalizarColor(color) : '';
      const fullSlug = m.slug + (colorSlug ? `-${colorSlug}` : '');
      const colorDisplay = color || 'Modelo base';

      const query = buildSearchQuery(m.marca, m.modelo, m.categoria, color);
      const qEsc = query.replace(/"/g, '&quot;');
      const tieneFoto = yaDescargados.has(fullSlug);
      const doneClass = tieneFoto ? 'done' : '';
      const btnText = tieneFoto ? 'Foto guardada' : 'Ya descargue la foto';
      const btnChecked = tieneFoto ? 'checked' : '';

      return `
      <div class="modelo ${doneClass}" data-slug="${fullSlug}" data-color="${colorSlug}" data-cat="${m.categoria}" data-query="${qEsc}">
        <div class="modelo-header">
          <div>
            <div class="modelo-name">${m.marca} ${m.modelo}</div>
            <div class="modelo-meta">
              <span style="font-weight:bold; color:#007aff;">${colorDisplay}</span> &middot; ${m.unidades} refs &middot; ${m.refs.join(', ')}
            </div>
            <div class="modelo-badges">
              <span class="badge cat">${m.categoria}</span>
              <span class="badge">${fullSlug}</span>
            </div>
          </div>
        </div>

        <div class="actions">
          <a class="btn btn-google" href="${buildUrl(query, 'google')}" target="_blank">Google</a>
          <a class="btn btn-bing" href="${buildUrl(query, 'bing')}" target="_blank">Bing</a>
          <a class="btn btn-ddg" href="${buildUrl(query, 'ddg')}" target="_blank">DDG</a>
        </div>

        <div class="download-box">
          <button class="btn-auto" id="btn-auto-${fullSlug}" onclick="usarUltimaDescarga('${fullSlug}')">
            📥 Usar ultima descarga
          </button>
          <div class="dl-status" id="status-${fullSlug}"></div>

          <div class="divider">o pegar URL manual</div>
          <div class="url-row">
            <input type="text" class="url-input" id="url-${fullSlug}" placeholder="URL directa de la imagen..." oninput="previewImage('${fullSlug}')">
            <button class="btn-paste" onclick="pegarURL('${fullSlug}')">Pegar</button>
          </div>
          <div class="preview-wrap" id="preview-${fullSlug}">
            <img id="img-${fullSlug}" style="display:none" onload="this.style.display='block'" onerror="this.style.display='none'">
          </div>
          <button class="btn-download" id="btn-dl-${fullSlug}" onclick="descargar('${fullSlug}')" disabled>Descargar desde URL</button>
        </div>

        <button class="btn-check ${btnChecked}" onclick="toggleDone('${fullSlug}', this)">${btnText}</button>
      </div>`;
    }).join('');

    return colorCardsHtml;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Foto Hunter v3.3 - Colores</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f7;color:#111;padding:12px;max-width:640px;margin:0 auto}
  h1{font-size:18px;text-align:center;margin-bottom:4px}
  .sub{font-size:12px;text-align:center;color:#666;margin-bottom:14px}
  .server-info{background:#e3f2fd;border:1px solid #90caf9;border-radius:8px;padding:10px;text-align:center;font-size:12px;margin-bottom:14px;color:#1565c0}
  .stats{display:flex;gap:8px;justify-content:center;margin-bottom:14px;flex-wrap:wrap}
  .stat{background:#fff;padding:6px 12px;border-radius:8px;font-size:12px;border:1px solid #ddd}
  .stat b{color:#007aff}
  .filter{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
  .filter input,.filter select{flex:1;min-width:120px;padding:8px 10px;border:1px solid #ddd;border-radius:8px;font-size:13px;background:#fff}
  .modelo{background:#fff;border:1px solid #ddd;border-radius:10px;padding:12px;margin-bottom:10px;display:flex;flex-direction:column;gap:8px}
  .modelo.done{opacity:.6;background:#e8f5e9;border-color:#81c784}
  .modelo-header{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
  .modelo-name{font-size:14px;font-weight:600}
  .modelo-meta{font-size:11px;color:#666;margin-top:2px}
  .modelo-badges{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px}
  .badge{font-size:10px;padding:2px 6px;border-radius:4px;background:#f0f0f0;color:#555}
  .badge.cat{background:#e3f2fd;color:#1565c0}
  .actions{display:flex;gap:6px;flex-wrap:wrap}
  .btn{flex:1;min-width:70px;padding:8px 0;border:none;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;text-decoration:none;text-align:center;display:inline-block}
  .btn-google{background:#4285f4;color:#fff}
  .btn-bing{background:#008373;color:#fff}
  .btn-ddg{background:#de5833;color:#fff}
  .btn-check{width:100%;padding:10px;border:2px solid #34a853;background:#fff;color:#34a853;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;margin-top:4px}
  .btn-check.checked{background:#34a853;color:#fff}
  .download-box{background:#fafafa;border:1px dashed #ccc;border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:6px}
  .btn-auto{width:100%;padding:12px;border:none;border-radius:8px;background:#34a853;color:#fff;font-size:14px;font-weight:700;cursor:pointer}
  .btn-auto:disabled{background:#ccc}
  .url-row{display:flex;gap:6px}
  .url-input{flex:1;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:12px;background:#fff}
  .btn-paste{padding:8px 10px;border:none;border-radius:6px;background:#007aff;color:#fff;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap}
  .btn-download{width:100%;padding:10px;border:none;border-radius:8px;background:#666;color:#fff;font-size:13px;font-weight:700;cursor:pointer}
  .btn-download:disabled{background:#ccc}
  .preview-wrap{min-height:80px;display:flex;align-items:center;justify-content:center;background:#fff;border-radius:6px;border:1px solid #eee}
  .preview-wrap img{max-width:100%;max-height:150px;object-fit:contain;padding:4px}
  .dl-status{font-size:12px;text-align:center;min-height:18px;padding:4px;border-radius:4px}
  .dl-status.ok{color:#fff;background:#34a853;font-weight:600}
  .dl-status.err{color:#fff;background:#ff3b30}
  .dl-status.info{color:#1565c0;background:#e3f2fd}
  .divider{text-align:center;font-size:11px;color:#999;margin:4px 0;position:relative}
  .divider::before,.divider::after{content:'';position:absolute;top:50%;width:30%;height:1px;background:#ddd}
  .divider::before{left:0}
  .divider::after{right:0}
  .progress{position:sticky;top:0;background:#f5f5f7;padding:8px 0;z-index:10;border-bottom:1px solid #ddd;margin-bottom:10px}
  .bar{height:6px;background:#ddd;border-radius:3px;overflow:hidden}
  .bar-fill{height:100%;background:#34a853;width:0%;transition:.3s}
  .hidden{display:none!important}
  .reset-btn{background:#ff3b30;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;margin-left:auto}
  .header-row{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px}
</style>
</head>
<body>
<h1>Foto Hunter v3.3 - Colores</h1>
<p class="sub">Busca el color exacto, descargalo normalmente, volve y toca "Usar ultima descarga"</p>

<div class="server-info">Servidor activo en <b>http://localhost:${PORT}</b><br><small>Ahora guarda las imagenes con el nombre del color (slug-color.webp)</small></div>

<div class="progress">
  <div class="header-row">
    <div class="stats">
      <div class="stat">Listos: <b id="countDone">0</b></div>
      <div class="stat">Faltan: <b id="countLeft">0</b></div>
      <div class="stat">Total: <b id="countTotal">0</b></div>
    </div>
    <button class="reset-btn" onclick="resetAll()">Reiniciar</button>
  </div>
  <div class="bar"><div class="bar-fill" id="barFill"></div></div>
</div>

<div class="filter">
  <input type="text" id="searchBox" placeholder="Buscar modelo...">
  <select id="catFilter">
    <option value="all">Todas las categorias</option>
    ${catOptions}
  </select>
  <select id="statusFilter">
    <option value="all">Todos</option>
    <option value="pending">Pendientes</option>
    <option value="done">Listos</option>
  </select>
</div>

<div id="lista">
${modelosHtml}
</div>

<script>
const LS_KEY = 'ic_foto_hunter_v33';
function load(){ try{return JSON.parse(localStorage.getItem(LS_KEY)||'{}')}catch(e){return{}} }
function save(obj){ localStorage.setItem(LS_KEY, JSON.stringify(obj)); }
let state = load();

function toggleDone(slug, btn){
  state[slug] = !state[slug];
  save(state);
  updateUI();
}

function resetAll(){
  if(!confirm('Borrar TODO el progreso?')) return;
  state = {};
  save(state);
  updateUI();
}

function updateUI(){
  let done=0, total=0;
  document.querySelectorAll('.modelo').forEach(el=>{
    const slug = el.dataset.slug;
    const isDone = !!state[slug] || el.classList.contains('has-file');
    total++;
    if(isDone){ done++; el.classList.add('done'); el.querySelector('.btn-check').classList.add('checked'); el.querySelector('.btn-check').textContent='Foto guardada'; }
    else { el.classList.remove('done'); el.querySelector('.btn-check').classList.remove('checked'); el.querySelector('.btn-check').textContent='Ya descargue la foto'; }
  });
  document.getElementById('countDone').textContent = done;
  document.getElementById('countLeft').textContent = total - done;
  document.getElementById('countTotal').textContent = total;
  document.getElementById('barFill').style.width = total ? (done/total*100)+'%' : '0%';
}

async function usarUltimaDescarga(slug) {
  const btn = document.getElementById('btn-auto-' + slug);
  const status = document.getElementById('status-' + slug);

  btn.disabled = true;
  status.textContent = 'Buscando ultima descarga...';
  status.className = 'dl-status info';

  try {
    const res = await fetch('/api/usar-ultima-descarga', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({slug})
    });
    const data = await res.json();
    if (data.success) {
      status.innerHTML = 'Guardado: ' + data.origen + ' (' + data.sizeKb + ' KB)';
      status.className = 'dl-status ok';
      state[slug] = true;
      save(state);
      updateUI();
    } else {
      throw new Error(data.error || 'Error desconocido');
    }
  } catch(e) {
    status.textContent = 'Error: ' + e.message;
    status.className = 'dl-status err';
  } finally {
    btn.disabled = false;
  }
}

async function pegarURL(slug) {
  const input = document.getElementById('url-' + slug);
  try {
    const text = await navigator.clipboard.readText();
    input.value = text;
    previewImage(slug);
  } catch(e) {
    input.focus();
  }
}

function previewImage(slug) {
  const url = document.getElementById('url-' + slug).value.trim();
  const img = document.getElementById('img-' + slug);
  const btn = document.getElementById('btn-dl-' + slug);
  if (!url) {
    img.style.display = 'none';
    btn.disabled = true;
    return;
  }
  img.src = url;
  btn.disabled = false;
}

async function descargar(slug) {
  const input = document.getElementById('url-' + slug);
  const btn = document.getElementById('btn-dl-' + slug);
  const status = document.getElementById('status-' + slug);
  const url = input.value.trim();

  if (!url) return;
  btn.disabled = true;
  status.textContent = 'Descargando...';
  status.className = 'dl-status info';

  try {
    const res = await fetch('/api/descargar', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({url, slug})
    });
    const data = await res.json();
    if (data.success) {
      status.innerHTML = 'Guardado (' + data.sizeKb + ' KB)';
      status.className = 'dl-status ok';
      state[slug] = true;
      save(state);
      updateUI();
      input.value = '';
      document.getElementById('img-' + slug).style.display = 'none';
    } else {
      throw new Error(data.error || 'Error desconocido');
    }
  } catch(e) {
    status.textContent = 'Error: ' + e.message;
    status.className = 'dl-status err';
  } finally {
    btn.disabled = false;
  }
}

function filter(){
  const q = document.getElementById('searchBox').value.toLowerCase();
  const cat = document.getElementById('catFilter').value;
  const status = document.getElementById('statusFilter').value;
  document.querySelectorAll('.modelo').forEach(el=>{
    const slug = el.dataset.slug;
    const query = el.dataset.query.toLowerCase();
    const categoria = el.dataset.cat;
    const isDone = !!state[slug] || el.classList.contains('has-file');
    const matchQ = !q || query.includes(q) || slug.includes(q);
    const matchCat = cat==='all' || categoria===cat;
    const matchStatus = status==='all' || (status==='done'&&isDone) || (status==='pending'&&!isDone);
    el.classList.toggle('hidden', !(matchQ && matchCat && matchStatus));
  });
}

document.getElementById('searchBox').addEventListener('input', filter);
document.getElementById('catFilter').addEventListener('change', filter);
document.getElementById('statusFilter').addEventListener('change', filter);

document.querySelectorAll('.modelo').forEach(el => {
  if (el.classList.contains('done')) el.classList.add('has-file');
});

updateUI();
</script>
</body>
</html>`;
}

console.log('\nFoto Hunter v3.3 (Colores y Descarga Automática)\n');
if (!fs.existsSync(CATALOGO_PATH)) { console.error('No se encontro', CATALOGO_PATH); process.exit(1); }
const catalogo = JSON.parse(fs.readFileSync(CATALOGO_PATH, 'utf8'));

const modelosMap = new Map();
for (const item of catalogo) {
  const key = item.modeloSlug;
  if (!modelosMap.has(key)) {
    modelosMap.set(key, { slug: key, modelo: item.modelo, marca: item.marca, categoria: item.categoria, refs: [], unidades: 0, colores: null, color: null });
  }
  const m = modelosMap.get(key);
  m.refs.push(item.ref);
  m.unidades++;
  if (item.colores && Array.isArray(item.colores)) m.colores = item.colores;
  else if (item.color) m.color = item.color;
}
const modelos = [...modelosMap.values()].sort((a,b) => a.categoria.localeCompare(b.categoria) || a.modelo.localeCompare(b.modelo));

const yaDescargados = escanearMaestras();
console.log('Total de modelos con variantes:', modelos.length);
console.log('Total de colores/fotos ya guardadas:', yaDescargados.size);
console.log('----------------------------------------\n');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  if (req.url === '/api/usar-ultima-descarga' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { slug } = JSON.parse(body);
        if (!slug) throw new Error('Falta slug');
        console.log('Auto-detectando descarga para: ' + slug);
        usarUltimaDescarga(slug, (err, result) => {
          if (err) {
            console.error('❌ Error auto-detectando ' + slug + ':', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          } else {
            console.log('✅ Guardado: ' + path.basename(result.path) + ' (' + result.sizeKb + ' KB)');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, sizeKb: result.sizeKb, path: result.path, origen: result.origen }));
          }
        });
      } catch (e) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }

  if (req.url === '/api/descargar' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { url, slug } = JSON.parse(body);
        if (!url || !slug) throw new Error('Faltan url o slug');
        descargarImagen(url, slug, (err, result) => {
          if (err) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: err.message })); }
          else { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ success: true, sizeKb: result.sizeKb, path: result.path })); }
        });
      } catch (e) { res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }

  if (req.url === '/' || req.url === '/index.html') {
    const html = generarHtml(modelos, yaDescargados);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }
  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Servidor listo en http://localhost:' + PORT);
  console.log('   Las fotos se guardaran en: ' + MAESTRAS_DIR);
  console.log('\n   ✅ FLUJO NUEVO CON COLORES:');
  console.log('      1. Abre Chrome y anda a http://localhost:' + PORT);
  console.log('      2. Ves un listado separado para CADA COLOR.');
  console.log('      3. Toca Google (te busca el color exacto)');
  console.log('      4. Descarga la foto (va a /sdcard/Download/)');
  console.log('      5. Vuelve y toca "📥 Usar ultima descarga"');
  console.log('      6. Se guarda como modelo-color.webp');
  console.log('\n   Luego ejecuta el script Python v2.3 para propagar.');
});
