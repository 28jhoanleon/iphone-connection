#!/usr/bin/env node
/**
 * organizar-fotos.js — iPhoneConnection
 * 
 * Uso:
 *   node scripts/organizar-fotos.js [carpeta-origen]
 * 
 * Ejemplos:
 *   node scripts/organizar-fotos.js
 *   node scripts/organizar-fotos.js /sdcard/Download/
 *   node scripts/organizar-fotos.js /sdcard/Download/fotos-ic/
 * 
 * Que hace:
 *   1. Escanea la carpeta de origen buscando imagenes
 *   2. Genera public/organizar-fotos.html con las imagenes en base64
 *   3. Abris el HTML en Chrome, asignas cada foto a un modelo
 *   4. El HTML genera un script bash listo para copiar y pegar en Termux
 */

const fs = require('fs');
const path = require('path');

const CATALOGO_PATH = 'data/catalogo.json';
const OUTPUT_HTML = 'public/organizar-fotos.html';
const TEMP_DIR = 'public/temp-fotos';

const origen = process.argv[2] || '/sdcard/Download/';

console.log('\n📁 Carpeta origen: ' + origen);

if (!fs.existsSync(CATALOGO_PATH)) {
  console.error('❌ No se encontro ' + CATALOGO_PATH);
  process.exit(1);
}

// Leer catalogo y agrupar modelos
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
      unidades: 0
    });
  }
  const m = modelosMap.get(key);
  m.refs.push(item.ref);
  m.unidades++;
}
const modelos = [...modelosMap.values()].sort((a,b) => {
  if (a.categoria !== b.categoria) return a.categoria.localeCompare(b.categoria);
  return a.modelo.localeCompare(b.modelo);
});

console.log('📊 Modelos en catalogo: ' + modelos.length);

// Buscar imagenes en origen
let imagenes = [];
try {
  const files = fs.readdirSync(origen);
  imagenes = files
    .filter(f => /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(f))
    .map(f => {
      const ruta = path.join(origen, f);
      const stat = fs.statSync(ruta);
      return {
        nombre: f,
        ruta: ruta,
        size: stat.size,
        ext: path.extname(f).toLowerCase()
      };
    })
    .sort((a,b) => b.size - a.size); // Mas grandes primero (mejor calidad)
} catch(e) {
  console.error('❌ No se pudo leer la carpeta origen: ' + e.message);
  console.log('   Asegurate de que la carpeta exista y Termux tenga permisos de almacenamiento.');
  console.log('   Ejemplo: termux-setup-storage');
  process.exit(1);
}

console.log('🖼️  Imagenes encontradas: ' + imagenes.length);

if (imagenes.length === 0) {
  console.log('\n⚠️  No se encontraron imagenes en ' + origen);
  console.log('   Descarga algunas fotos primero o verifica la ruta.');
  process.exit(0);
}

// Crear temp-fotos y copiar imagenes con nombres limpios
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, {recursive: true});
fs.readdirSync(TEMP_DIR).forEach(f => fs.unlinkSync(path.join(TEMP_DIR, f)));

const imagenesLimpias = imagenes.map((img, i) => {
  const cleanName = 'img_' + String(i).padStart(3, '0') + img.ext;
  const dest = path.join(TEMP_DIR, cleanName);
  fs.copyFileSync(img.ruta, dest);
  return {
    id: i,
    nombreOriginal: img.nombre,
    cleanName: cleanName,
    sizeKb: Math.round(img.size / 1024)
  };
});

console.log('📋 Copiadas a ' + TEMP_DIR + ' para preview');

// Generar JSON de modelos para el HTML
const modelosJson = JSON.stringify(modelos);
const imagenesJson = JSON.stringify(imagenesLimpias);

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>📸 Organizar Fotos — iPhoneConnection</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f7;color:#111;padding:10px;max-width:100%}
  h1{font-size:17px;text-align:center;margin-bottom:3px}
  .sub{font-size:11px;text-align:center;color:#666;margin-bottom:10px}
  .progress{position:sticky;top:0;background:#f5f5f7;padding:8px 0;z-index:20;border-bottom:1px solid #ddd;margin-bottom:10px}
  .stats{display:flex;gap:6px;justify-content:center;margin-bottom:6px;flex-wrap:wrap}
  .stat{background:#fff;padding:5px 10px;border-radius:6px;font-size:11px;border:1px solid #ddd}
  .stat b{color:#007aff}
  .bar{height:5px;background:#ddd;border-radius:3px;overflow:hidden}
  .bar-fill{height:100%;background:#34a853;width:0%;transition:.3s}
  .grid{display:grid;grid-template-columns:1fr;gap:10px}
  @media(min-width:400px){.grid{grid-template-columns:1fr 1fr}}
  .card{background:#fff;border:1px solid #ddd;border-radius:10px;overflow:hidden;display:flex;flex-direction:column}
  .card.assigned{border-color:#34a853;background:#e8f5e9}
  .img-wrap{height:180px;display:flex;align-items:center;justify-content:center;background:#fafafa;padding:8px}
  .img-wrap img{max-width:100%;max-height:100%;object-fit:contain}
  .card-body{padding:10px;display:flex;flex-direction:column;gap:6px;flex:1}
  .img-name{font-size:10px;color:#888;word-break:break-all}
  .img-size{font-size:9px;color:#aaa}
  .search-model{width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:12px;background:#fff}
  .model-select{width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:12px;background:#fff;margin-top:4px}
  .model-select option:disabled{color:#aaa}
  .assigned-badge{font-size:10px;color:#34a853;font-weight:600;display:none}
  .card.assigned .assigned-badge{display:block}
  .actions{margin-top:auto;padding-top:6px}
  .btn-assign{width:100%;padding:8px;border:none;border-radius:6px;background:#007aff;color:#fff;font-size:12px;font-weight:600;cursor:pointer}
  .btn-assign:disabled{background:#ccc}
  .bottom-actions{position:sticky;bottom:0;background:#f5f5f7;padding:10px;border-top:1px solid #ddd;display:flex;gap:8px;flex-wrap:wrap;z-index:20}
  .btn-gen{flex:1;padding:12px;border:none;border-radius:8px;background:#34a853;color:#fff;font-size:13px;font-weight:700;cursor:pointer}
  .btn-gen:disabled{background:#ccc}
  .btn-reset{padding:12px 16px;border:none;border-radius:8px;background:#ff3b30;color:#fff;font-size:13px;font-weight:700;cursor:pointer}
  .script-output{display:none;background:#1e1e1e;color:#0f0;padding:12px;border-radius:8px;font-family:monospace;font-size:11px;white-space:pre-wrap;word-break:break-all;margin-top:10px;max-height:300px;overflow:auto}
  .script-output.show{display:block}
  .copy-hint{font-size:11px;color:#666;text-align:center;margin-top:6px}
  .hidden{display:none!important}
</style>
</head>
<body>
<h1>📸 Organizar Fotos Descargadas</h1>
<p class="sub">Asigna cada imagen al modelo correcto del catalogo</p>

<div class="progress">
  <div class="stats">
    <div class="stat">✅ Asignadas: <b id="countDone">0</b></div>
    <div class="stat">⏳ Faltan: <b id="countLeft">0</b></div>
    <div class="stat">📊 Total: <b id="countTotal">0</b></div>
  </div>
  <div class="bar"><div class="bar-fill" id="barFill"></div></div>
</div>

<div class="grid" id="grid"></div>

<div class="bottom-actions">
  <button class="btn-gen" id="btnGen" onclick="generarScript()" disabled>📋 Generar script de movimiento</button>
  <button class="btn-reset" onclick="resetTodo()">🔄 Reiniciar</button>
</div>

<div class="copy-hint" id="copyHint"></div>
<pre class="script-output" id="scriptOut"></pre>

<script>
const MODELOS = ${modelosJson};
const IMAGENES = ${imagenesJson};
const LS_KEY = 'ic_org_fotos_v1';

function load(){ try{return JSON.parse(localStorage.getItem(LS_KEY)||'{}')}catch(e){return{}} }
function save(obj){ localStorage.setItem(LS_KEY, JSON.stringify(obj)); }
let asignaciones = load();

// Construir opciones del select agrupadas por categoria
let selectOptions = '<option value="">-- Elegir modelo --</option>';
let catActual = '';
MODELOS.forEach(m => {
  if (m.categoria !== catActual) {
    if (catActual) selectOptions += '</optgroup>';
    selectOptions += '<optgroup label="📂 ' + m.categoria + '">';
    catActual = m.categoria;
  }
  selectOptions += '<option value="' + m.slug + '">' + m.marca + ' ' + m.modelo + ' (' + m.unidades + 'u)</option>';
});
if (catActual) selectOptions += '</optgroup>';

// Renderizar grid
const grid = document.getElementById('grid');
IMAGENES.forEach(img => {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = img.id;
  card.innerHTML = 
    '<div class="img-wrap"><img src="temp-fotos/' + img.cleanName + '" alt="' + img.nombreOriginal + '" loading="lazy"></div>' +
    '<div class="card-body">' +
      '<div class="img-name">' + img.nombreOriginal + '</div>' +
      '<div class="img-size">' + img.sizeKb + ' KB</div>' +
      '<div class="assigned-badge">✅ Asignado</div>' +
      '<input type="text" class="search-model" placeholder="Buscar modelo..." oninput="filtrarSelect(this)">' +
      '<select class="model-select" onchange="asignar(' + img.id + ', this.value, this)">' + selectOptions + '</select>' +
      '<div class="actions"><button class="btn-assign" onclick="confirmarAsignacion(' + img.id + ', this)">✅ Confirmar asignacion</button></div>' +
    '</div>';
  grid.appendChild(card);
});

function filtrarSelect(input) {
  const q = input.value.toLowerCase();
  const select = input.nextElementSibling;
  const opts = select.querySelectorAll('option');
  opts.forEach(opt => {
    if (!opt.value) return;
    const match = opt.textContent.toLowerCase().includes(q);
    opt.style.display = match ? '' : 'none';
  });
}

function asignar(id, slug, select) {
  const btn = select.parentElement.querySelector('.btn-assign');
  btn.disabled = !slug;
}

function confirmarAsignacion(id, btn) {
  const card = document.querySelector('.card[data-id="' + id + '"]');
  const select = card.querySelector('.model-select');
  const slug = select.value;
  if (!slug) return;
  asignaciones[id] = slug;
  save(asignaciones);
  card.classList.add('assigned');
  updateStats();
}

function updateStats() {
  let done = 0;
  IMAGENES.forEach(img => { if (asignaciones[img.id]) done++; });
  const total = IMAGENES.length;
  document.getElementById('countDone').textContent = done;
  document.getElementById('countLeft').textContent = total - done;
  document.getElementById('countTotal').textContent = total;
  document.getElementById('barFill').style.width = total ? (done/total*100) + '%' : '0%';
  document.getElementById('btnGen').disabled = done === 0;
}

function resetTodo() {
  if (!confirm('Borrar todas las asignaciones?')) return;
  asignaciones = {};
  save(asignaciones);
  document.querySelectorAll('.card').forEach(c => c.classList.remove('assigned'));
  document.querySelectorAll('.model-select').forEach(s => s.value = '');
  document.querySelectorAll('.btn-assign').forEach(b => b.disabled = true);
  document.getElementById('scriptOut').classList.remove('show');
  updateStats();
}

function generarScript() {
  let lines = ['#!/bin/bash', '# Script generado por iPhoneConnection — Organizar Fotos', '# Copiar y pegar en Termux, o guardar como scripts/mover-fotos.sh', ''];

  // Crear mapeo inverso: slug -> img
  const asignadas = [];
  IMAGENES.forEach(img => {
    const slug = asignaciones[img.id];
    if (!slug) return;
    const modelo = MODELOS.find(m => m.slug === slug);
    if (!modelo) return;
    asignadas.push({img, modelo});
  });

  lines.push('echo "Moviendo ' + asignadas.length + ' fotos..."');
  lines.push('mkdir -p public/maestras');
  lines.push('');

  asignadas.forEach(({img, modelo}) => {
    const origen = '${origen}'.replace(/'/g, "'\\''") + '/' + img.nombreOriginal.replace(/'/g, "'\\''");
    const destino = 'public/maestras/' + modelo.slug + img.ext;
    lines.push('# ' + modelo.marca + ' ' + modelo.modelo + ' (' + modelo.refs.join(', ') + ')');
    lines.push('cp "' + origen + '" "' + destino + '"');
    lines.push('');
  });

  lines.push('echo "✅ Listo. Correr: npm run imagenes"');

  const script = lines.join('\\n');
  document.getElementById('scriptOut').textContent = script;
  document.getElementById('scriptOut').classList.add('show');
  document.getElementById('copyHint').textContent = 'Copia el script de arriba y pegalo en Termux (o guardalo como scripts/mover-fotos.sh)';

  // Intentar copiar al portapapeles
  try {
    navigator.clipboard.writeText(script);
    document.getElementById('copyHint').textContent = '✅ Script copiado al portapapeles! Pegalo en Termux.';
  } catch(e) {}
}

updateStats();
</script>
</body>
</html>`;

fs.writeFileSync(OUTPUT_HTML, html, 'utf8');

console.log('\n📝 HTML generado: ' + OUTPUT_HTML);
console.log('   Imagenes copiadas a: ' + TEMP_DIR);
console.log('\n👉 Proximo paso:');
console.log('   1. termux-open public/organizar-fotos.html');
console.log('   2. Asigna cada imagen al modelo correcto');
console.log('   3. Toca "Generar script de movimiento"');
console.log('   4. Copia el script y pegalo en Termux (o guardalo como scripts/mover-fotos.sh)');
console.log('   5. bash scripts/mover-fotos.sh');
console.log('   6. npm run imagenes && git add . && git commit && git push');
