#!/usr/bin/env node
/**
 * foto-hunter-v3.js — iPhoneConnection Foto Hunter (Auto-Asignar)
 * 
 * Levanta un servidor local. Desde el celu, buscas la foto en Google,
 * copias la URL directa de la imagen, la pegas en el campo del modelo
 * y el servidor la descarga directo a public/maestras/{slug}.ext
 * 
 * Uso:
 *   node scripts/foto-hunter-v3.js
 *   # Abre Chrome y anda a http://localhost:8080
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const CATALOGO_PATH = 'data/catalogo.json';
const MAESTRAS_DIR = path.resolve('public/maestras');
const PORT = 8080;

// -- Helpers de busqueda (igual que v2) ---------------------------------
function buildSearchQuery(marca, modelo, categoria) {
  const term = (marca + ' ' + modelo).trim();
  if (categoria === 'iPhone' || modelo.toLowerCase().includes('iphone')) {
    return term + ' official render back white background png';
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
  return term + ' official product image white background';
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

// -- Detectar que modelos YA tienen foto --------------------------------
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

// -- Descargar imagen desde URL -----------------------------------------
function descargarImagen(url, slug, callback) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (e) {
    return callback(new Error('URL invalida'));
  }

  const client = parsed.protocol === 'https:' ? https : http;
  const req = client.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    timeout: 15000
  }, (res) => {
    // Seguir redirects
    if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
      if (!res.headers.location) {
        return callback(new Error('Redirect sin Location'));
      }
      return descargarImagen(res.headers.location, slug, callback);
    }

    if (res.statusCode !== 200) {
      return callback(new Error('HTTP ' + res.statusCode));
    }

    // Detectar extension por Content-Type
    const ct = (res.headers['content-type'] || '').toLowerCase();
    let ext = '.jpg';
    if (ct.includes('png')) ext = '.png';
    else if (ct.includes('webp')) ext = '.webp';
    else if (ct.includes('gif')) ext = '.gif';
    else if (ct.includes('jpeg')) ext = '.jpg';

    if (!fs.existsSync(MAESTRAS_DIR)) {
      fs.mkdirSync(MAESTRAS_DIR, { recursive: true });
    }

    const destino = path.join(MAESTRAS_DIR, slug + ext);
    const file = fs.createWriteStream(destino);
    res.pipe(file);

    file.on('finish', () => {
      file.close();
      const stats = fs.statSync(destino);
      callback(null, {
        path: destino,
        ext: ext,
        sizeKb: Math.round(stats.size / 1024)
      });
    });

    file.on('error', (err) => {
      fs.unlink(destino, () => {});
      callback(err);
    });
  });

  req.on('error', callback);
  req.on('timeout', () => {
    req.destroy();
    callback(new Error('Timeout'));
  });
}

// -- Generar HTML del buscador ------------------------------------------
function generarHtml(modelos, yaDescargados) {
  const cats = [...new Set(modelos.map(m => m.categoria))].sort();
  const catOptions = cats.map(c => `<option value="${c}">${c}</option>`).join('');

  const modelosHtml = modelos.map(m => {
    const query = buildSearchQuery(m.marca, m.modelo, m.categoria);
    const qEsc = query.replace(/"/g, '&quot;');
    const tieneFoto = yaDescargados.has(m.slug);
    const doneClass = tieneFoto ? 'done' : '';
    const btnText = tieneFoto ? 'Foto guardada' : 'Ya descargue la foto';
    const btnChecked = tieneFoto ? 'checked' : '';

    return `
    <div class="modelo ${doneClass}" data-slug="${m.slug}" data-cat="${m.categoria}" data-query="${qEsc}">
      <div class="modelo-header">
        <div>
          <div class="modelo-name">${m.marca} ${m.modelo}</div>
          <div class="modelo-meta">${m.unidades} unidad${m.unidades > 1 ? 'es' : ''} &middot; ${m.refs.join(', ')}</div>
          <div class="modelo-badges">
            <span class="badge cat">${m.categoria}</span>
            <span class="badge">${m.slug}</span>
          </div>
        </div>
      </div>

      <div class="actions">
        <a class="btn btn-google" href="${buildUrl(query, 'google')}" target="_blank">Google</a>
        <a class="btn btn-bing" href="${buildUrl(query, 'bing')}" target="_blank">Bing</a>
        <a class="btn btn-ddg" href="${buildUrl(query, 'ddg')}" target="_blank">DDG</a>
      </div>

      <div class="download-box">
        <div class="url-row">
          <input type="text" class="url-input" id="url-${m.slug}" placeholder="Pega aca la URL directa de la imagen..." oninput="previewImage('${m.slug}')">
          <button class="btn-paste" onclick="pegarURL('${m.slug}')">Pegar</button>
        </div>
        <div class="preview-wrap" id="preview-${m.slug}">
          <img id="img-${m.slug}" style="display:none" onload="this.style.display='block'" onerror="this.style.display='none'">
        </div>
        <button class="btn-download" id="btn-dl-${m.slug}" onclick="descargar('${m.slug}')" disabled>Descargar y guardar</button>
        <div class="dl-status" id="status-${m.slug}"></div>
      </div>

      <button class="btn-check ${btnChecked}" onclick="toggleDone('${m.slug}', this)">${btnText}</button>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Foto Hunter v3</title>
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
  .url-row{display:flex;gap:6px}
  .url-input{flex:1;padding:8px;border:1px solid #ddd;border-radius:6px;font-size:12px;background:#fff}
  .btn-paste{padding:8px 10px;border:none;border-radius:6px;background:#007aff;color:#fff;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap}
  .btn-download{width:100%;padding:10px;border:none;border-radius:8px;background:#34a853;color:#fff;font-size:13px;font-weight:700;cursor:pointer}
  .btn-download:disabled{background:#ccc}
  .preview-wrap{min-height:80px;display:flex;align-items:center;justify-content:center;background:#fff;border-radius:6px;border:1px solid #eee}
  .preview-wrap img{max-width:100%;max-height:150px;object-fit:contain;padding:4px}
  .dl-status{font-size:11px;text-align:center;min-height:16px}
  .dl-status.ok{color:#34a853;font-weight:600}
  .dl-status.err{color:#ff3b30}
  .progress{position:sticky;top:0;background:#f5f5f7;padding:8px 0;z-index:10;border-bottom:1px solid #ddd;margin-bottom:10px}
  .bar{height:6px;background:#ddd;border-radius:3px;overflow:hidden}
  .bar-fill{height:100%;background:#34a853;width:0%;transition:.3s}
  .hidden{display:none!important}
  .reset-btn{background:#ff3b30;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;margin-left:auto}
  .header-row{display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px}
</style>
</head>
<body>
<h1>Foto Hunter v3</h1>
<p class="sub">Busca la foto, copia la URL directa, pegala aca y descarga. Va directo a public/maestras/</p>

<div class="server-info">Servidor activo en <b>http://localhost:${PORT}</b></div>

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
const LS_KEY = 'ic_foto_hunter_v3';
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

async function pegarURL(slug) {
  const input = document.getElementById('url-' + slug);
  try {
    const text = await navigator.clipboard.readText();
    input.value = text;
    previewImage(slug);
  } catch(e) {
    input.focus();
    alert('No se pudo leer el portapapeles. Mantené presionada la imagen en Google, tocá "Copiar URL de imagen" y pegala manualmente.');
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
  status.className = 'dl-status';

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

// Marcar como "has-file" los que ya tienen foto en el servidor
document.querySelectorAll('.modelo').forEach(el => {
  if (el.classList.contains('done')) el.classList.add('has-file');
});

updateUI();
</script>
</body>
</html>`;
}

// -- Leer catalogo ------------------------------------------------------
console.log('\nFoto Hunter v3 (Auto-Asignar)\n');

if (!fs.existsSync(CATALOGO_PATH)) {
  console.error('No se encontro', CATALOGO_PATH);
  process.exit(1);
}

const catalogo = JSON.parse(fs.readFileSync(CATALOGO_PATH, 'utf8'));

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
      unidades: 0,
    });
  }
  const m = modelosMap.get(key);
  m.refs.push(item.ref);
  m.unidades++;
}

const modelos = [...modelosMap.values()].sort((a, b) => {
  if (a.categoria !== b.categoria) return a.categoria.localeCompare(b.categoria);
  return a.modelo.localeCompare(b.modelo);
});

const yaDescargados = escanearMaestras();
console.log('Total de modelos:', modelos.length);
console.log('Modelos con foto ya guardada:', yaDescargados.size);
console.log('----------------------------------------\n');

// -- Servidor HTTP ------------------------------------------------------
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/api/descargar' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { url, slug } = JSON.parse(body);
        if (!url || !slug) throw new Error('Faltan url o slug');

        console.log('Descargando: ' + slug + ' <- ' + url.substring(0, 60) + '...');

        descargarImagen(url, slug, (err, result) => {
          if (err) {
            console.error('Error descargando ' + slug + ':', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          } else {
            console.log('Guardado: ' + path.basename(result.path) + ' (' + result.sizeKb + ' KB)');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, sizeKb: result.sizeKb, path: result.path }));
          }
        });
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  if (req.url === '/' || req.url === '/index.html') {
    const html = generarHtml(modelos, yaDescargados);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('Servidor listo en http://localhost:' + PORT);
  console.log('Las fotos se guardaran en: ' + MAESTRAS_DIR);
  console.log('\nProximo paso:');
  console.log('   1. Abri Chrome y anda a http://localhost:' + PORT);
  console.log('   2. Busca la foto en Google/Bing, copia la URL directa de la imagen');
  console.log('   3. Pegala en el campo del modelo y toca "Descargar y guardar"');
  console.log('   4. Listo. La foto ya esta en public/maestras/ con el nombre correcto.');
  console.log('\n   Cuando termines: npm run imagenes && git add . && git commit && git push');
  console.log('\n   Para detener el servidor: Ctrl+C');
});

// -- Resumen por categoria ----------------------------------------------
const porCat = {};
for (const m of modelos) {
  porCat[m.categoria] = (porCat[m.categoria] || 0) + 1;
}
for (const cat of Object.keys(porCat).sort()) {
  console.log('  ' + cat + ': ' + porCat[cat] + ' modelos');
}
