#!/usr/bin/env python3
"""
Constructor del sitio v2 · iPhone Connection
Navegación progresiva de 3 niveles (opción A aprobada · wireframe 30/07/2026).

N0 Home -> N1 Familia -> N2 Modelo (capacidad y color como selectores) -> N3 Unidad
Ruteo por hash: cada nivel tiene URL propia, compartible por WhatsApp.
Salida: deploy/index.html · autocontenido, sin servidor, sin dependencias.
"""
import base64, glob, json, os

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def _b64(ruta, mime):
    with open(ruta, "rb") as f:
        return f"data:{mime};base64," + base64.b64encode(f.read()).decode()

def cargar_imagenes():
    """Cascada: arquetipo < generada por ref < fotografía propia."""
    imgs, propias = {}, 0
    for ruta in glob.glob(os.path.join(RAIZ, "public/img/placeholder/*.svg")):
        imgs[os.path.basename(ruta)[:-4]] = _b64(ruta, "image/svg+xml")
    for ruta in glob.glob(os.path.join(RAIZ, "public/img/productos/*.svg")):
        imgs[os.path.basename(ruta)[:-4]] = _b64(ruta, "image/svg+xml")
    for ext, mime in (("jpg", "image/jpeg"), ("jpeg", "image/jpeg"), ("png", "image/png"), ("webp", "image/webp")):
        for ruta in glob.glob(os.path.join(RAIZ, f"public/img/productos/*.{ext}")):
            imgs[os.path.basename(ruta).rsplit(".", 1)[0]] = _b64(ruta, mime)
            propias += 1
    print(f"  fotografía propia detectada: {propias} archivo(s)")
    return imgs

CSS = """
:root{--ink:#0A0A0A;--paper:#FAFAFA;--surface:#F1F1F0;--line:#DFDEDC;--mute:#86868B;--max:1180px}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--paper);color:var(--ink);font-family:'Instrument Sans',system-ui,sans-serif;font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased}
.wrap{max-width:var(--max);margin:0 auto;padding:0 22px}
a{color:inherit;text-decoration:none}
button{font:inherit;cursor:pointer;border:none;background:none;color:inherit;text-align:left}
:focus-visible{outline:2px solid var(--ink);outline-offset:3px}
header{position:sticky;top:0;z-index:50;background:rgba(250,250,250,.86);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
.bar{display:flex;align-items:center;justify-content:space-between;height:60px}
.logo{font-weight:700;letter-spacing:-.03em;font-size:17px}
.logo em{font-style:normal;color:var(--mute);font-weight:500}
.wa-top{font-size:13px;border:1px solid var(--ink);padding:8px 15px;border-radius:100px;white-space:nowrap}
.wa-top:hover{background:var(--ink);color:var(--paper)}
.crumb{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.09em;color:var(--mute);padding:22px 0 0;display:flex;gap:6px;flex-wrap:wrap}
.crumb button:hover{color:var(--ink);text-decoration:underline}
.hero{padding:76px 0 62px;border-bottom:1px solid var(--line)}
.hero h1{font-size:clamp(36px,7vw,78px);line-height:.96;letter-spacing:-.045em;font-weight:600;max-width:15ch}
.hero p{margin-top:24px;font-size:clamp(16px,2vw,20px);color:var(--mute);max-width:44ch}
.eyebrow{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--mute);margin-bottom:26px}
.btn{padding:14px 28px;border-radius:100px;font-size:15px;font-weight:500;border:1px solid var(--ink);transition:.18s;display:inline-block}
.btn-solid{background:var(--ink);color:var(--paper)}
.btn-solid:hover{transform:translateY(-1px)}
h2.sec{font-size:clamp(24px,3.4vw,34px);letter-spacing:-.035em;font-weight:600;margin-bottom:26px}
.familias{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;padding:60px 0}
@media(max-width:820px){.familias{grid-template-columns:1fr}}
.fam{border:1px solid var(--line);border-radius:8px;padding:22px;display:flex;gap:16px;align-items:center;transition:.18s;background:var(--paper)}
.fam:hover{border-color:var(--ink);transform:translateY(-2px)}
.fam img{width:76px;height:76px;object-fit:contain;background:var(--surface);border-radius:6px;flex:0 0 auto}
.fam h3{font-size:18px;font-weight:600;letter-spacing:-.02em}
.fam p{font-size:12.5px;color:var(--mute);font-family:'JetBrains Mono',monospace;letter-spacing:.04em;margin-top:3px}
.pilares{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line)}
.pilar{padding:44px 30px 44px 0;border-right:1px solid var(--line)}
.pilar:last-child{border-right:none;padding-right:0}
.pilar:not(:first-child){padding-left:30px}
.pilar h3{font-size:16.5px;font-weight:600;margin-bottom:9px}
.pilar p{font-size:14.5px;color:var(--mute)}
@media(max-width:820px){.pilares{grid-template-columns:1fr}.pilar{border-right:none;border-bottom:1px solid var(--line);padding:28px 0!important}.pilar:last-child{border-bottom:none}}
.titulo{padding:16px 0 26px}
.titulo h1{font-size:clamp(30px,5vw,48px);letter-spacing:-.04em;font-weight:600}
.titulo p{color:var(--mute);font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.06em;margin-top:6px}
.modelos{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding-bottom:80px}
@media(max-width:940px){.modelos{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.modelos{grid-template-columns:1fr}}
.mod{border:1px solid var(--line);border-radius:8px;padding:18px;transition:.18s;background:var(--paper);display:flex;gap:14px;align-items:center}
.mod:hover{border-color:var(--ink);transform:translateY(-2px)}
.mod img{width:64px;height:80px;object-fit:contain;flex:0 0 auto}
.mod h3{font-size:16px;font-weight:600;letter-spacing:-.02em;margin-bottom:3px}
.mod .desde{font-size:15px;font-weight:600;letter-spacing:-.01em}
.mod .u{font-size:11px;color:var(--mute);font-family:'JetBrains Mono',monospace;letter-spacing:.05em}
.modelo{display:grid;grid-template-columns:1fr 1fr;gap:56px;padding:10px 0 80px}
@media(max-width:940px){.modelo{grid-template-columns:1fr;gap:30px}}
.foto{background:var(--surface);border-radius:8px;aspect-ratio:1;display:flex;align-items:center;justify-content:center;overflow:hidden}
.foto img{width:100%;height:100%;object-fit:contain}
.modelo h1{font-size:clamp(28px,4vw,40px);letter-spacing:-.035em;font-weight:600;line-height:1.06;margin-bottom:6px}
.desde-g{color:var(--mute);font-size:15px;margin-bottom:30px}
.label{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--mute);margin-bottom:11px}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:26px}
.chip{font-size:13.5px;padding:9px 17px;border:1px solid var(--line);border-radius:100px;color:var(--mute);transition:.15s}
.chip:hover{border-color:var(--ink);color:var(--ink)}
.chip[aria-pressed="true"]{background:var(--ink);color:var(--paper);border-color:var(--ink)}
.unidad{border:1px solid var(--line);border-radius:8px;padding:16px 18px;margin-bottom:9px;display:flex;justify-content:space-between;align-items:center;gap:14px;width:100%;transition:.15s}
.unidad:hover{border-color:var(--ink)}
.unidad .bat{font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:500}
.unidad .grado{font-size:12.5px;color:var(--mute)}
.unidad .p{font-size:17px;font-weight:600;letter-spacing:-.02em;white-space:nowrap}
.unidad .def{font-size:11px;color:#8A6A2A;margin-top:3px}
.ficha{display:grid;grid-template-columns:1.05fr 1fr;gap:56px;padding:10px 0 80px}
@media(max-width:940px){.ficha{grid-template-columns:1fr;gap:30px}}
.galeria{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.galeria .foto:first-child{grid-column:1/-1;aspect-ratio:4/3}
.bigprice{font-size:33px;font-weight:600;letter-spacing:-.03em}
.bigprice small{display:block;font-size:11px;color:var(--mute);font-weight:400;margin-top:6px;font-family:'JetBrains Mono',monospace;letter-spacing:.06em}
.bloque{border:1px solid var(--line);border-radius:6px;padding:19px;margin:24px 0}
.bloque h4{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.14em;color:var(--mute);text-transform:uppercase;margin-bottom:13px}
.trow{display:flex;justify-content:space-between;gap:16px;padding:9px 0;border-bottom:1px solid var(--line);font-size:14px}
.trow:last-child{border-bottom:none}
.trow span{color:var(--mute)}
.trow b{font-weight:500;font-family:'JetBrains Mono',monospace;font-size:12.5px;text-align:right}
.aviso{background:#FBF6E8;border:1px solid #E6D8B0;border-radius:6px;padding:14px 16px;font-size:13.5px;margin:20px 0}
.aviso b{display:block;font-size:11px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:5px}
.vacio{color:var(--mute);padding:40px 0;font-size:15px}
footer{border-top:1px solid var(--line);padding:44px 0 34px;font-size:13.5px;color:var(--mute);margin-top:20px}
.legal{display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;font-size:12px;padding-top:20px;border-top:1px solid var(--line);margin-top:26px}
.wa{position:fixed;right:18px;bottom:18px;z-index:60;background:var(--ink);color:var(--paper);padding:14px 22px;border-radius:100px;font-size:14px;font-weight:500;box-shadow:0 6px 26px rgba(0,0,0,.16)}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
"""

JS = r"""
const $ = id => document.getElementById(id);
const fmt = c => '$ ' + (c/100).toLocaleString('es-AR',{maximumFractionDigits:0});
const img = p => IMG[p.ref] || IMG[p.arquetipo];
const ETQ = {disponible:'Disponible', por_encargo:'Por encargo · 7 a 10 días', sin_stock:'Avisame cuando llegue'};
const GAR = p => p.estado==='nuevo_sellado' ? '12 MESES' : '6 MESES';
const colores = p => p.colores || (p.color ? [p.color] : []);

const FAM = {};
CATALOGO.forEach(p=>{ (FAM[p.categoria] = FAM[p.categoria] || []).push(p); });
const MOD = {};
CATALOGO.forEach(p=>{ (MOD[p.modeloSlug] = MOD[p.modeloSlug] || []).push(p); });

let selCap = null, selColor = null;

function crumb(items){
  return '<div class="crumb">' + items.map((it,i)=>
    (i? '<span>/</span>':'') + (it[1]? `<button onclick="ir('${it[1]}')">${it[0]}</button>` : `<span>${it[0]}</span>`)
  ).join('') + '</div>';
}

/* ---------- N0 ---------- */
function home(){
  const fams = Object.keys(FAM).map(f=>{
    const l = FAM[f];
    return `<button class="fam" onclick="ir('#/f/${encodeURIComponent(f)}')">
      <img src="${img(l[0])}" alt="">
      <div><h3>${f}</h3><p>${l.length} UNIDADES · ${new Set(l.map(p=>p.modeloSlug)).size} MODELOS</p></div></button>`;
  }).join('');
  return `<div class="wrap hero">
    <p class="eyebrow">${CATALOGO.length} unidades · precios actualizados ${HOY}</p>
    <h1>Sabés exactamente qué estás comprando.</h1>
    <p>Cada equipo revisado, documentado y con garantía escrita. Estado real, salud de batería real, precio actualizado.</p>
    <div style="margin-top:34px"><button class="btn btn-solid" onclick="ir('#/f/iPhone')">Ver catálogo</button></div>
  </div>
  <div class="wrap"><div class="familias">${fams}</div>
  <div class="pilares">
    <div class="pilar"><h3>Revisión técnica</h3><p>Cada equipo se prueba antes de publicarse. Lo que no pasa la revisión, no entra al catálogo.</p></div>
    <div class="pilar"><h3>Garantía escrita</h3><p>Condiciones claras, por escrito, desde el día de la compra. Sin letra chica.</p></div>
    <div class="pilar"><h3>Asesoramiento</h3><p>Te decimos qué equipo te conviene, incluso cuando no es el más caro que tenemos.</p></div>
  </div></div>`;
}

/* ---------- N1 ---------- */
function familia(f){
  const lista = FAM[f] || [];
  const slugs = [...new Set(lista.map(p=>p.modeloSlug))];
  const cards = slugs.map(s=>{
    const u = MOD[s], min = Math.min(...u.map(p=>p.precioCentavos));
    return `<button class="mod" onclick="ir('#/m/${s}')">
      <img src="${img(u[0])}" alt="">
      <div><h3>${u[0].modelo}</h3>
      <p class="desde">desde ${fmt(min)}</p>
      <p class="u">${u.length} UNIDAD${u.length>1?'ES':''}</p></div></button>`;
  }).join('');
  return `<div class="wrap">${crumb([['INICIO','#/'],[f.toUpperCase(),null]])}
    <div class="titulo"><h1>${f}</h1><p>${lista.length} UNIDADES · ${slugs.length} MODELOS</p></div>
    <div class="modelos">${cards}</div></div>`;
}

/* ---------- N2 ---------- */
function modelo(slug){
  const u = MOD[slug];
  if(!u) return `<div class="wrap"><p class="vacio">Modelo no encontrado.</p></div>`;
  const fam = u[0].categoria;
  const caps = [...new Set(u.map(p=>p.capacidadGb).filter(Boolean))].sort((a,b)=>a-b);
  const cols = [...new Set(u.flatMap(colores))];

  const coincide = p =>
    (!selCap || p.capacidadGb===selCap) &&
    (!selColor || colores(p).includes(selColor));
  const l = u.filter(coincide);

  const capChips = caps.length>1 ? `<p class="label">Capacidad</p><div class="chips">
    <button class="chip" aria-pressed="${!selCap}" onclick="setSel('cap',null)">Todas</button>
    ${caps.map(c=>`<button class="chip" aria-pressed="${selCap===c}" onclick="setSel('cap',${c})">${c>=1024?c/1024+' TB':c+' GB'}</button>`).join('')}
    </div>` : '';
  const colChips = cols.length>1 ? `<p class="label">Color</p><div class="chips">
    <button class="chip" aria-pressed="${!selColor}" onclick="setSel('color',null)">Todos</button>
    ${cols.map(c=>`<button class="chip" aria-pressed="${selColor===c}" onclick="setSel('color','${c}')">${c}</button>`).join('')}
    </div>` : '';

  const unidades = l.length ? l.map(p=>`<button class="unidad" onclick="ir('#/u/${p.ref}')">
      <div><div class="bat">${p.bateria? 'Batería '+p.bateria+'%' : 'Nuevo sellado'}</div>
      <div class="grado">${p.estadoEtiqueta}${p.color? ' · '+p.color : (p.colores? ' · '+p.colores.join(' / ') : '')}</div>
      ${p.defecto? `<div class="def">Detalle declarado: ${p.defecto}</div>`:''}</div>
      <div class="p">${fmt(p.precioCentavos)}</div></button>`).join('')
    : `<p class="vacio">No hay unidades con esa combinación. Probá con otra capacidad o color.</p>`;

  return `<div class="wrap">${crumb([['INICIO','#/'],[fam.toUpperCase(),'#/f/'+encodeURIComponent(fam)],[u[0].modelo.toUpperCase(),null]])}
   <div class="modelo">
    <div class="foto"><img src="${img(u[0])}" alt="${u[0].modelo}"></div>
    <div>
      <h1>${u[0].modelo}</h1>
      <p class="desde-g">${u.length} unidad${u.length>1?'es':''} · desde ${fmt(Math.min(...u.map(p=>p.precioCentavos)))}</p>
      ${capChips}${colChips}
      <p class="label">Unidades que coinciden · ${l.length}</p>
      ${unidades}
    </div></div></div>`;
}
function setSel(t,v){ t==='cap'? selCap=v : selColor=v; render(); }

/* ---------- N3 ---------- */
function unidad(ref){
  const p = CATALOGO.find(x=>x.ref===ref);
  if(!p) return `<div class="wrap"><p class="vacio">Unidad no encontrada.</p></div>`;
  const msg = encodeURIComponent(`Hola, me interesa el ${p.nombreCompleto} — ref. #${p.ref}`);
  return `<div class="wrap">${crumb([['INICIO','#/'],[p.categoria.toUpperCase(),'#/f/'+encodeURIComponent(p.categoria)],[p.modelo.toUpperCase(),'#/m/'+p.modeloSlug],['#'+p.ref,null]])}
   <div class="ficha">
    <div class="galeria">
      <div class="foto"><img src="${img(p)}" alt="${p.nombre}"></div>
      <div class="foto"><img src="${img(p)}" alt=""></div>
      <div class="foto"><img src="${img(p)}" alt=""></div>
    </div>
    <div>
      <h1 style="font-size:clamp(26px,3.6vw,36px);letter-spacing:-.035em;font-weight:600;line-height:1.08;margin-bottom:6px">${p.nombre}</h1>
      <p class="desde-g" style="margin-bottom:22px">${p.estadoEtiqueta} · ${ETQ[p.disponibilidad]}</p>
      <div class="bigprice">${fmt(p.precioCentavos)}<small>PRECIO ACTUALIZADO EL ${HOY}</small></div>
      ${p.defecto? `<div class="aviso"><b>Detalle declarado</b>${p.defecto}. Está contemplado en el precio y lo revisás antes de comprar.</div>`:''}
      <div class="bloque">
        <h4>Estado de esta unidad</h4>
        <div class="trow"><span>Salud de batería</span><b>${p.bateria? p.bateria+' %':'—'}</b></div>
        <div class="trow"><span>Grado</span><b>${p.estadoEtiqueta.toUpperCase()}</b></div>
        <div class="trow"><span>Capacidad</span><b>${p.capacidadGb? (p.capacidadGb>=1024? p.capacidadGb/1024+' TB':p.capacidadGb+' GB'):'—'}</b></div>
        <div class="trow"><span>Color</span><b>${(p.color || (p.colores||[]).join(' / ') || '—').toUpperCase()}</b></div>
        <div class="trow"><span>Garantía</span><b>${GAR(p)}</b></div>
        <div class="trow"><span>Referencia</span><b>#${p.ref}</b></div>
      </div>
      <a class="btn btn-solid" style="width:100%;text-align:center" href="https://wa.me/?text=${msg}">Consultar por WhatsApp</a>
      <p style="font-size:12.5px;color:var(--mute);margin-top:11px;text-align:center">El mensaje se envía con la referencia incluida</p>
    </div></div></div>`;
}

/* ---------- router ---------- */
function ir(h){ location.hash = h; }
function render(){
  const h = location.hash || '#/';
  const [,tipo,val] = h.split('/');
  let html;
  if(tipo==='f') html = familia(decodeURIComponent(val||''));
  else if(tipo==='m') html = modelo(val);
  else if(tipo==='u') html = unidad(val);
  else html = home();
  $('app').innerHTML = html;
}
window.addEventListener('hashchange',()=>{ 
  const t = location.hash.split('/')[1];
  if(t!=='u') { /* mantener selectores dentro del modelo */ }
  if(t==='m'||t==='f'||!t) { if(t!=='m'){selCap=null;selColor=null;} }
  render(); window.scrollTo(0,0);
});
render();
"""

def construir():
    catalogo = [p for p in json.load(open(os.path.join(RAIZ, "catalogo.json"), encoding="utf-8")) if p["publicado"]]
    imgs = cargar_imagenes()
    hoy = "/".join(catalogo[0]["actualizado"].split("-")[::-1])

    html = f"""<!DOCTYPE html><html lang="es-AR"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>iPhone Connection — Tecnología con respaldo</title>
<meta name="description" content="Tecnología revisada, documentada y con garantía escrita. Sabés exactamente qué estás comprando.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body>
<header><div class="wrap bar">
<button class="logo" onclick="ir('#/')">iPhone<em>Connection</em></button>
<button class="wa-top">Consultar por WhatsApp</button>
</div></header>
<main id="app"></main>
<footer><div class="wrap">
<p><b style="color:var(--ink)">iPhone Connection</b> · Tecnología revisada, documentada y con garantía escrita.</p>
<div class="legal"><span>© 2026 iPhone Connection</span><span>Prototipo · {len(catalogo)} unidades · precios {hoy}</span></div>
</div></footer>
<button class="wa">WhatsApp</button>
<script>
const CATALOGO = {json.dumps(catalogo, ensure_ascii=False)};
const IMG = {json.dumps(imgs)};
const HOY = "{hoy}";
{JS}
</script></body></html>"""

    os.makedirs(os.path.join(RAIZ, "deploy"), exist_ok=True)
    salida = os.path.join(RAIZ, "deploy/index.html")
    with open(salida, "w", encoding="utf-8") as f:
        f.write(html)
    open(os.path.join(RAIZ, "deploy/.nojekyll"), "w").close()
    print(f"✓ {salida} · {len(catalogo)} unidades · {len(set(p['modeloSlug'] for p in catalogo))} modelos")

if __name__ == "__main__":
    construir()
