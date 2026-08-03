#!/usr/bin/env node
/**
 * foto-hunter.js — Script para iPhoneConnection
 * 
 * Uso desde Termux:
 *   node scripts/foto-hunter.js
 * 
 * Qué hace:
 *   1. Lee data/catalogo.json
 *   2. Detecta que modelos YA tienen foto en public/maestras/
 *   3. Genera public/buscar-fotos.html — una app web para descargar fotos desde el celu
 *   4. Genera scripts/descargar-batch.sh — plantilla curl para fuentes conocidas
 *   5. Imprime un resumen en terminal
 */

const fs = require('fs');
const path = require('path');

const CATALOGO_PATH = 'data/catalogo.json';
const MAESTRAS_DIR = 'public/maestras';
const OUTPUT_HTML = 'public/buscar-fotos.html';
const OUTPUT_SH = 'scripts/descargar-batch.sh';

// -- Helpers ----------------------------------------------------------------
function existeFoto(slug) {
  if (!fs.existsSync(MAESTRAS_DIR)) return false;
  const files = fs.readdirSync(MAESTRAS_DIR);
  return files.some(f => f.toLowerCase().startsWith(slug.toLowerCase()));
}

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

// -- Main -------------------------------------------------------------------
console.log('\n📸 iPhoneConnection — Foto Hunter\n');

if (!fs.existsSync(CATALOGO_PATH)) {
  console.error('❌ No se encontro', CATALOGO_PATH);
  process.exit(1);
}

const catalogo = JSON.parse(fs.readFileSync(CATALOGO_PATH, 'utf8'));

// Agrupar por modelo
const modelos = new Map();
for (const item of catalogo) {
  const key = item.modeloSlug;
  if (!modelos.has(key)) {
    modelos.set(key, {
      slug: key,
      modelo: item.modelo,
      marca: item.marca,
      categoria: item.categoria,
      refs: [],
      unidades: 0,
    });
  }
  const m = modelos.get(key);
  m.refs.push(item.ref);
  m.unidades++;
}

// Clasificar
const conFoto = [];
const sinFoto = [];
for (const m of modelos.values()) {
  if (existeFoto(m.slug)) {
    conFoto.push(m);
  } else {
    sinFoto.push(m);
  }
}

console.log('✅ Con foto en maestras/: ' + conFoto.length + ' modelos');
console.log('❌ Sin foto:              ' + sinFoto.length + ' modelos');
console.log('────────────────────────────────────────\n');

// -- Generar HTML interactivo ---------------------------------------------
let cats = [...new Set(sinFoto.map(m=>m.categoria))].sort();
let catOptions = cats.map(c => '<option value="' + c + '">' + c + '</option>').join('');

let modelosHtml = sinFoto.map(m => {
  const query = buildSearchQuery(m.marca, m.modelo, m.categoria);
  const qEsc = query.replace(/"/g, '&quot;');
  return '\n<div class="modelo" data-slug="' + m.slug + '" data-cat="' + m.categoria + '" data-query="' + qEsc + '">' +
    '<div class="modelo-header"><div>' +
      '<div class="modelo-name">' + m.marca + ' ' + m.modelo + '</div>' +
      '<div class="modelo-meta">' + m.unidades + ' unidad' + (m.unidades>1?'es':'') + ' · ' + m.refs.join(', ') + '</div>' +
      '<div class="modelo-badges"><span class="badge cat">' + m.categoria + '</span><span class="badge">' + m.slug + '</span></div>' +
    '</div></div>' +
    '<div class="actions">' +
      '<a class="btn btn-google" href="' + buildUrl(query, 'google') + '" target="_blank">🔍 Google</a>' +
      '<a class="btn btn-bing" href="' + buildUrl(query, 'bing') + '" target="_blank">🔍 Bing</a>' +
      '<a class="btn btn-ddg" href="' + buildUrl(query, 'ddg') + '" target="_blank">🔍 DuckDuckGo</a>' +
    '</div>' +
    '<button class="btn-check" onclick="toggleDone(\'' + m.slug + '\', this)">✅ Ya descargue la foto</button>' +
  '</div>';
}).join('');

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>📸 iPhoneConnection — Buscador de Fotos</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f7;color:#111;padding:12px;max-width:600px;margin:0 auto}
  h1{font-size:18px;text-align:center;margin-bottom:4px}
  .sub{font-size:12px;text-align:center;color:#666;margin-bottom:14px}
  .stats{display:flex;gap:8px;justify-content:center;margin-bottom:14px;flex-wrap:wrap}
  .stat{background:#fff;padding:6px 12px;border-radius:8px;font-size:12px;border:1px solid #ddd}
  .stat b{color:#007aff}
  .filter{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
  .filter input,.filter select{flex:1;min-width:120px;padding:8px 10px;border:1px solid #ddd;border-radius:8px;font-size:13px;background:#fff}
  .modelo{background:#fff;border:1px solid #ddd;border-radius:10px;padding:12px;margin-bottom:10px;display:flex;flex-direction:column;gap:8px}
  .modelo.done{opacity:.55;background:#e8f5e9;border-color:#81c784}
  .modelo-header{display:flex;justify-content:space-between;align-items:flex-start;gap:8px}
  .modelo-name{font-size:14px;font-weight:600}
  .modelo-meta{font-size:11px;color:#666;margin-top:2px}
  .modelo-badges{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px}
  .badge{font-size:10px;padding:2px 6px;border-radius:4px;background:#f0f0f0;color:#555}
  .badge.cat{background:#e3f2fd;color:#1565c0}
  .actions{display:flex;gap:6px;flex-wrap:wrap}
  .btn{flex:1;min-width:80px;padding:8px 0;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;text-decoration:none;text-align:center;display:inline-block}
  .btn-google{background:#4285f4;color:#fff}
  .btn-bing{background:#008373;color:#fff}
  .btn-ddg{background:#de5833;color:#fff}
  .btn-check{width:100%;padding:10px;border:2px solid #34a853;background:#fff;color:#34a853;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer}
  .btn-check.checked{background:#34a853;color:#fff}
  .progress{position:sticky;top:0;background:#f5f5f7;padding:8px 0;z-index:10;border-bottom:1px solid #ddd;margin-bottom:10px}
  .bar{height:6px;background:#ddd;border-radius:3px;overflow:hidden}
  .bar-fill{height:100%;background:#34a853;width:0%;transition:.3s}
  .hidden{display:none!important}
</style>
</head>
<body>
<h1>📸 Buscador de Fotos — iPhoneConnection</h1>
<p class="sub">Toca el motor de busqueda, descarga la foto oficial y marca como listo.</p>

<div class="progress">
  <div class="stats">
    <div class="stat">✅ Listos: <b id="countDone">0</b></div>
    <div class="stat">⏳ Faltan: <b id="countLeft">0</b></div>
    <div class="stat">📊 Total: <b id="countTotal">0</b></div>
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
const LS_KEY = 'ic_foto_hunter_v1';
function load(){ try{return JSON.parse(localStorage.getItem(LS_KEY)||'{}')}catch(e){return{}} }
function save(obj){ localStorage.setItem(LS_KEY, JSON.stringify(obj)); }
let state = load();

function toggleDone(slug, btn){
  state[slug] = !state[slug];
  save(state);
  updateUI();
}
function updateUI(){
  let done=0, total=0;
  document.querySelectorAll('.modelo').forEach(el=>{
    const slug = el.dataset.slug;
    const isDone = !!state[slug];
    total++;
    if(isDone){ done++; el.classList.add('done'); el.querySelector('.btn-check').classList.add('checked'); el.querySelector('.btn-check').textContent='✅ Listo — foto guardada'; }
    else { el.classList.remove('done'); el.querySelector('.btn-check').classList.remove('checked'); el.querySelector('.btn-check').textContent='✅ Ya descargue la foto'; }
  });
  document.getElementById('countDone').textContent = done;
  document.getElementById('countLeft').textContent = total - done;
  document.getElementById('countTotal').textContent = total;
  document.getElementById('barFill').style.width = total ? (done/total*100)+'%' : '0%';
}
function filter(){
  const q = document.getElementById('searchBox').value.toLowerCase();
  const cat = document.getElementById('catFilter').value;
  const status = document.getElementById('statusFilter').value;
  document.querySelectorAll('.modelo').forEach(el=>{
    const slug = el.dataset.slug;
    const query = el.dataset.query.toLowerCase();
    const categoria = el.dataset.cat;
    const isDone = !!state[slug];
    const matchQ = !q || query.includes(q) || slug.includes(q);
    const matchCat = cat==='all' || categoria===cat;
    const matchStatus = status==='all' || (status==='done'&&isDone) || (status==='pending'&&!isDone);
    el.classList.toggle('hidden', !(matchQ && matchCat && matchStatus));
  });
}
document.getElementById('searchBox').addEventListener('input', filter);
document.getElementById('catFilter').addEventListener('change', filter);
document.getElementById('statusFilter').addEventListener('change', filter);
updateUI();
</script>
</body>
</html>`;

fs.writeFileSync(OUTPUT_HTML, html, 'utf8');
console.log('📝 HTML generado: ' + OUTPUT_HTML);
console.log('   Abrelo en tu celu desde Termux con:');
console.log('   termux-open public/buscar-fotos.html');

// -- Generar script bash de respaldo --------------------------------------
const shLines = ['#!/bin/bash', '# Descargador batch — revisa cada URL antes de ejecutar', ''];
for (const m of sinFoto) {
  const query = buildSearchQuery(m.marca, m.modelo, m.categoria);
  shLines.push('# ' + m.marca + ' ' + m.modelo + ' (' + m.refs.join(', ') + ')');
  shLines.push('# Query: ' + query);
  shLines.push('# curl -L -o "public/maestras/' + m.slug + '.jpg" "URL_AQUI"');
  shLines.push('');
}
fs.writeFileSync(OUTPUT_SH, shLines.join('\n'), 'utf8');
fs.chmodSync(OUTPUT_SH, 0o755);
console.log('📝 Script bash generado: ' + OUTPUT_SH);

// -- Resumen final --------------------------------------------------------
console.log('\n══════════════════════════════════════════════════');
console.log('RESUMEN DE MODELOS SIN FOTO:');
console.log('══════════════════════════════════════════════════');
const porCat = {};
for (const m of sinFoto) {
  porCat[m.categoria] = (porCat[m.categoria] || 0) + 1;
}
for (const cat of Object.keys(porCat).sort()) {
  console.log('  ' + cat + ': ' + porCat[cat] + ' modelos');
}
console.log('══════════════════════════════════════════════════');
console.log('\n👉 Proximo paso:');
console.log('   1. Copia foto-hunter.js a scripts/ de tu proyecto');
console.log('   2. cd ~/proyecto && node scripts/foto-hunter.js');
console.log('   3. termux-open public/buscar-fotos.html');
console.log('   4. Ir modelo por modelo, descargar foto oficial, guardar en public/maestras/');
console.log('   5. npm run imagenes && git add . && git commit && git push');
