#!/usr/bin/env python3
"""
Constructor del sitio v2 · iPhone Connection
Navegacion progresiva de 3 niveles (opcion A aprobada, wireframe 30/07/2026).

  N0  #/                     Home · familias, no productos
  N1  #/iphone               Familia · agrupada por modelo
  N2  #/iphone/iphone-15     Modelo · capacidad y color como selectores
  N3  #/u/A165               Unidad · ficha completa

Ruteo por hash: cada nivel tiene URL propia y compartible por WhatsApp,
y funciona en cualquier hosting estatico sin configuracion de servidor.
Salida: deploy/index.html (autocontenido, listo para publicar).
"""
import base64, json, os, glob

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def _b64(ruta, mime):
    with open(ruta, "rb") as f:
        return f"data:{mime};base64," + base64.b64encode(f.read()).decode()

def cargar_imagenes():
    """Cascada: fotografia propia (jpg/png/webp) pisa a la imagen generada (svg)."""
    imgs, propias = {}, 0
    for ruta in glob.glob(os.path.join(RAIZ, "public/img/placeholder/*.svg")):
        imgs[os.path.basename(ruta)[:-4]] = _b64(ruta, "image/svg+xml")
    for ruta in glob.glob(os.path.join(RAIZ, "public/img/productos/*.svg")):
        imgs[os.path.basename(ruta)[:-4]] = _b64(ruta, "image/svg+xml")
    for ext, mime in (("jpg", "image/jpeg"), ("jpeg", "image/jpeg"),
                      ("png", "image/png"), ("webp", "image/webp")):
        for ruta in glob.glob(os.path.join(RAIZ, "public/img/productos/*." + ext)):
            imgs[os.path.basename(ruta).rsplit(".", 1)[0]] = _b64(ruta, mime)
            propias += 1
    return imgs, propias

CSS = """
:root{--ink:#0A0A0A;--paper:#FAFAFA;--surface:#F1F1F0;--line:#DFDEDC;--mute:#86868B;--max:1180px}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--paper);color:var(--ink);font-family:'Instrument Sans',system-ui,sans-serif;font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased}
.wrap{max-width:var(--max);margin:0 auto;padding:0 24px}
a{color:inherit;text-decoration:none}
button{font:inherit;cursor:pointer;border:none;background:none;color:inherit;text-align:left}
:focus-visible{outline:2px solid var(--ink);outline-offset:3px}
header{position:sticky;top:0;z-index:50;background:rgba(250,250,250,.86);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
.bar{display:flex;align-items:center;justify-content:space-between;height:62px}
.logo{font-weight:700;letter-spacing:-.03em;font-size:17px}
.logo em{font-style:normal;color:var(--mute);font-weight:500}
.wa-top{font-size:13px;border:1px solid var(--ink);padding:8px 16px;border-radius:100px}
.wa-top:hover{background:var(--ink);color:var(--paper)}
.crumb{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.09em;color:var(--mute);padding:26px 0 0}
.crumb button:hover{color:var(--ink);text-decoration:underline}
.eyebrow{font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}
h1.big{font-size:clamp(34px,6.6vw,74px);line-height:.97;letter-spacing:-.045em;font-weight:600;max-width:15ch}
.hero{padding:76px 0 60px;border-bottom:1px solid var(--line)}
.hero p.lead{margin-top:24px;font-size:clamp(16px,2vw,20px);color:var(--mute);max-width:44ch}
.btn{padding:14px 28px;border-radius:100px;font-size:15px;font-weight:500;border:1px solid var(--ink);transition:.18s;display:inline-block}
.btn-solid{background:var(--ink);color:var(--paper)}
.btn-solid:hover{transform:translateY(-1px)}
.familias{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;padding:56px 0}
@media(max-width:860px){.familias{grid-template-columns:1fr}}
.familia{border:1px solid var(--line);border-radius:8px;padding:26px;transition:.2s;background:var(--paper);width:100%}
.familia:hover{border-color:var(--ink);transform:translateY(-2px)}
.familia h3{font-size:22px;letter-spacing:-.025em;font-weight:600;margin-bottom:4px}
.familia p{color:var(--mute);font-size:13.5px}
.familia .fl{margin-top:22px;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.08em;display:flex;justify-content:space-between;border-top:1px solid var(--line);padding-top:12px}
h2.nivel{font-size:clamp(30px,5vw,50px);letter-spacing:-.04em;font-weight:600;margin:12px 0 6px}
.sub{color:var(--mute);font-size:15px;margin-bottom:30px}
.modelos{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;padding-bottom:80px}
@media(max-width:900px){.modelos{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.modelos{grid-template-columns:1fr}}
.modelo{border:1px solid var(--line);border-radius:8px;padding:16px;transition:.2s;display:flex;flex-direction:column;width:100%}
.modelo:hover{border-color:var(--ink);transform:translateY(-2px)}
.modelo .ph{background:var(--surface);border-radius:5px;aspect-ratio:4/3;overflow:hidden;margin-bottom:14px}
.modelo .ph img{width:100%;height:100%;object-fit:contain;display:block}
.modelo h4{font-size:17px;font-weight:600;letter-spacing:-.02em}
.modelo .desde{margin-top:auto;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.06em;color:var(--mute);display:flex;justify-content:space-between;border-top:1px solid var(--line);padding-top:12px;margin-top:12px}
.modelo .desde b{color:var(--ink);font-weight:500}
.detalle{display:grid;grid-template-columns:1.05fr 1fr;gap:56px;padding:34px 0 80px}
@media(max-width:940px){.detalle{grid-template-columns:1fr;gap:30px}}
.galeria{background:var(--surface);border-radius:8px;overflow:hidden;aspect-ratio:1}
.galeria img{width:100%;height:100%;object-fit:contain;display:block}
.grupo{margin-bottom:22px}
.grupo .eyebrow{display:block;margin-bottom:10px}
.chips{display:flex;gap:8px;flex-wrap:wrap}
.chip{font-size:13.5px;padding:9px 17px;border:1px solid var(--line);border-radius:100px;color:var(--mute);transition:.15s;background:var(--paper)}
.chip:hover{border-color:var(--ink);color:var(--ink)}
.chip[aria-pressed="true"]{background:var(--ink);color:var(--paper);border-color:var(--ink)}
.unidad{width:100%;border:1px solid var(--line);border-radius:6px;padding:15px;margin-bottom:9px;display:flex;justify-content:space-between;align-items:center;gap:14px;transition:.15s;background:var(--paper)}
.unidad:hover{border-color:var(--ink)}
.unidad .u1{font-size:14.5px;font-weight:500}
.unidad .u2{font-size:12px;color:var(--mute);font-family:'JetBrains Mono',monospace;letter-spacing:.04em;margin-top:3px}
.unidad .up{font-size:17px;font-weight:600;letter-spacing:-.02em;white-space:nowrap}
.bigprice{font-size:36px;font-weight:600;letter-spacing:-.03em}
.bigprice small{display:block;font-size:11px;color:var(--mute);font-weight:400;margin-top:7px;font-family:'JetBrains Mono',monospace;letter-spacing:.07em}
.bloque{border:1px solid var(--line);border-radius:6px;padding:20px;margin:24px 0}
.bloque h4{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.14em;color:var(--mute);text-transform:uppercase;margin-bottom:13px}
.trow{display:flex;justify-content:space-between;gap:16px;padding:9px 0;border-bottom:1px solid var(--line);font-size:14px}
.trow:last-child{border-bottom:none}
.trow span{color:var(--mute)}
.trow b{font-weight:500;font-family:'JetBrains Mono',monospace;font-size:12.5px;text-align:right}
.alerta{border:1px solid var(--ink);border-radius:6px;padding:14px 16px;margin:20px 0;font-size:13.5px;line-height:1.5}
.alerta b{font-family:'JetBrains Mono',monospace;font-size:10.5px;letter-spacing:.12em;display:block;margin-bottom:6px}
.vacio{color:var(--mute);padding:36px 0;font-size:15px}
footer{border-top:1px solid var(--line);padding:48px 0 34px;font-size:13.5px;color:var(--mute);margin-top:40px}
.legal{display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;font-size:12px;padding-top:20px;border-top:1px solid var(--line);margin-top:34px}
.wa{position:fixed;right:20px;bottom:20px;z-index:60;background:var(--ink);color:var(--paper);padding:14px 22px;border-radius:100px;font-size:14px;font-weight:500;box-shadow:0 6px 28px rgba(0,0,0,.16)}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
"""

JS = r"""
const fmt = c => '$ ' + (c/100).toLocaleString('es-AR',{maximumFractionDigits:0});
const ETQ = {disponible:'Disponible', por_encargo:'Por encargo \u00b7 7 a 10 d\u00edas', sin_stock:'Avisame cuando llegue'};
const img = p => IMG[p.ref] || IMG[p.arquetipo];
const fecha = s => s.split('-').reverse().join('/');
const wa = p => 'https://wa.me/?text=' + encodeURIComponent('Hola, me interesa el ' + p.nombreCompleto + ' \u2014 ref. #' + p.ref);
const coloresDe = p => p.colores || (p.color ? [p.color] : []);

const FAMILIAS = [...new Set(CATALOGO.map(p=>p.categoria))].map(cat=>{
  const l = CATALOGO.filter(p=>p.categoria===cat);
  return {cat, slug: cat.toLowerCase().replace(/[^a-z0-9]+/g,'-'), n:l.length,
          modelos:[...new Set(l.map(p=>p.modeloBase))].length,
          desde: Math.min(...l.map(p=>p.precioCentavos))};
});
const famPorSlug = s => FAMILIAS.find(f=>f.slug===s);
const famPorCat  = c => FAMILIAS.find(f=>f.cat===c);

function home(){
  return `<div class="wrap hero">
    <p class="eyebrow">${CATALOGO.length} unidades \u00b7 ${new Set(CATALOGO.map(p=>p.modeloBase)).size} modelos</p>
    <h1 class="big" style="margin-top:26px">Sab\u00e9s exactamente qu\u00e9 est\u00e1s comprando.</h1>
    <p class="lead">Cada equipo revisado, documentado y con garant\u00eda escrita. Estado real, salud de bater\u00eda real, precio actualizado.</p>
  </div>
  <div class="wrap"><div class="familias">
    ${FAMILIAS.map(f=>`<button class="familia" onclick="ir('#/${f.slug}')">
      <h3>${f.cat}</h3><p>${f.modelos} modelo${f.modelos>1?'s':''} disponibles</p>
      <div class="fl"><span>${String(f.n).padStart(2,'0')} UNIDADES</span><span>DESDE ${fmt(f.desde)}</span></div>
    </button>`).join('')}
  </div></div>
  <div style="background:var(--ink);color:var(--paper)"><div class="wrap" style="padding:76px 24px">
    <p class="eyebrow" style="color:#6E6E6E">Nuestro criterio</p>
    <h2 style="font-size:clamp(25px,3.8vw,42px);letter-spacing:-.04em;max-width:20ch;font-weight:600;line-height:1.08;margin-top:20px">No vendemos todo lo que se puede vender.</h2>
    <p style="color:#9E9E9E;max-width:52ch;margin-top:20px">Un equipo entra al cat\u00e1logo solo si podemos asesorarte sobre \u00e9l, respaldarlo con garant\u00eda y fotografiarlo nosotros mismos.</p>
  </div></div>`;
}

function familia(slug){
  const f = famPorSlug(slug); if(!f) return home();
  const l = CATALOGO.filter(p=>p.categoria===f.cat);
  const modelos = [...new Set(l.map(p=>p.modeloBase))].map(m=>{
    const u = l.filter(p=>p.modeloBase===m);
    return {m, slug:u[0].slug, n:u.length, desde:Math.min(...u.map(p=>p.precioCentavos)), im:img(u[0])};
  }).sort((a,b)=>b.desde-a.desde);
  return `<div class="wrap">
    <p class="crumb"><button onclick="ir('#/')">INICIO</button> / ${f.cat.toUpperCase()}</p>
    <h2 class="nivel">${f.cat}</h2>
    <p class="sub">${f.n} unidades \u00b7 ${modelos.length} modelos \u00b7 desde ${fmt(f.desde)}</p>
    <div class="modelos">${modelos.map(x=>`<button class="modelo" onclick="ir('#/${f.slug}/${x.slug}')">
      <div class="ph"><img src="${x.im}" alt="${x.m}" loading="lazy"></div>
      <h4>${x.m}</h4>
      <div class="desde"><span>${String(x.n).padStart(2,'0')} UNIDAD${x.n>1?'ES':''}</span><b>DESDE ${fmt(x.desde)}</b></div>
    </button>`).join('')}</div></div>`;
}

let selCap = null, selCol = null;
function modelo(fslug, mslug, reset){
  const f = famPorSlug(fslug); if(!f) return home();
  const u = CATALOGO.filter(p=>p.categoria===f.cat && p.slug===mslug);
  if(!u.length) return familia(fslug);
  if(reset){ selCap=null; selCol=null; }
  const nombre = u[0].modeloBase;
  const caps = [...new Set(u.map(p=>p.capacidadGb).filter(Boolean))].sort((a,b)=>a-b);
  const cols = [...new Set(u.flatMap(coloresDe))];
  const coincide = u.filter(p =>
    (!selCap || p.capacidadGb===selCap) && (!selCol || coloresDe(p).includes(selCol)));

  return `<div class="wrap">
    <p class="crumb"><button onclick="ir('#/')">INICIO</button> / <button onclick="ir('#/${f.slug}')">${f.cat.toUpperCase()}</button> / ${nombre.toUpperCase()}</p>
    <div class="detalle">
      <div class="galeria"><img src="${img(coincide[0]||u[0])}" alt="${nombre}"></div>
      <div>
        <h2 class="nivel" style="margin-top:0">${nombre}</h2>
        <p class="sub">${u.length} unidad${u.length>1?'es':''} \u00b7 desde ${fmt(Math.min(...u.map(p=>p.precioCentavos)))}</p>
        ${caps.length?`<div class="grupo"><span class="eyebrow">Capacidad</span><div class="chips">
          ${caps.map(c=>`<button class="chip" aria-pressed="${selCap===c}" onclick="pick('cap',${c})">${c>=1024?(c/1024)+' TB':c+' GB'}</button>`).join('')}
        </div></div>`:''}
        ${cols.length?`<div class="grupo"><span class="eyebrow">Color</span><div class="chips">
          ${cols.map(c=>`<button class="chip" aria-pressed="${selCol===c}" onclick="pick('col','${c}')">${c}</button>`).join('')}
        </div></div>`:''}
        <div class="grupo"><span class="eyebrow">Unidades que coinciden \u00b7 ${String(coincide.length).padStart(2,'0')}</span>
          ${coincide.length?coincide.map(p=>`<button class="unidad" onclick="ir('#/u/${p.ref}')">
            <div><div class="u1">${p.bateria?'Bater\u00eda '+p.bateria+'%':'Nuevo sellado'}${p.defecto?' \u00b7 detalle declarado':''}</div>
            <div class="u2">${p.estadoEtiqueta.toUpperCase()}${p.capacidadGb?' \u00b7 '+p.capacidadGb+' GB':''} \u00b7 #${p.ref}</div></div>
            <div class="up">${fmt(p.precioCentavos)}</div></button>`).join('')
          :'<p class="vacio">No hay unidades con esa combinaci\u00f3n. Prob\u00e1 otro color o capacidad.</p>'}
        </div>
      </div>
    </div></div>`;
}
function pick(t,v){
  if(t==='cap') selCap = (selCap===v?null:v); else selCol = (selCol===v?null:v);
  const partes = location.hash.replace(/^#\/?/,'').split('/').filter(Boolean);
  render(modelo(partes[0],partes[1],false));
}

function unidad(ref){
  const p = CATALOGO.find(x=>x.ref===ref); if(!p) return home();
  const f = famPorCat(p.categoria);
  const gar = p.estado==='nuevo_sellado'?'12 MESES':'6 MESES';
  return `<div class="wrap">
    <p class="crumb"><button onclick="ir('#/')">INICIO</button> / <button onclick="ir('#/${f.slug}')">${p.categoria.toUpperCase()}</button> / <button onclick="ir('#/${f.slug}/${p.slug}')">${p.modeloBase.toUpperCase()}</button> / #${p.ref}</p>
    <div class="detalle">
      <div class="galeria"><img src="${img(p)}" alt="${p.nombre}"></div>
      <div>
        <h2 class="nivel" style="margin-top:0">${p.nombre}</h2>
        <p class="sub">${p.estadoEtiqueta} \u00b7 ${ETQ[p.disponibilidad]}</p>
        <div class="bigprice">${fmt(p.precioCentavos)}<small>PRECIO ACTUALIZADO EL ${fecha(p.actualizado)}</small></div>
        ${p.defecto?`<div class="alerta"><b>DETALLE DECLARADO</b>${p.defecto.charAt(0).toUpperCase()+p.defecto.slice(1)}. Est\u00e1 informado antes de la compra y contemplado en el precio.</div>`:''}
        <div class="bloque"><h4>Estado de esta unidad</h4>
          <div class="trow"><span>Salud de bater\u00eda</span><b>${p.bateria?p.bateria+' %':'\u2014'}</b></div>
          <div class="trow"><span>Grado</span><b>${p.estadoEtiqueta.toUpperCase()}</b></div>
          <div class="trow"><span>Capacidad</span><b>${p.capacidadGb?(p.capacidadGb>=1024?(p.capacidadGb/1024)+' TB':p.capacidadGb+' GB'):'\u2014'}</b></div>
          <div class="trow"><span>Color</span><b>${(coloresDe(p).join(' \u00b7 ')||'\u2014').toUpperCase()}</b></div>
          <div class="trow"><span>Garant\u00eda</span><b>${gar}</b></div>
          <div class="trow"><span>Referencia</span><b>#${p.ref}</b></div>
        </div>
        <a class="btn btn-solid" style="width:100%;text-align:center" href="${wa(p)}" target="_blank" rel="noopener">Consultar por WhatsApp</a>
        <p style="font-size:12.5px;color:var(--mute);margin-top:12px;text-align:center">Te llega precargado: \u201cHola, me interesa el ${p.nombreCompleto} \u2014 ref. #${p.ref}\u201d</p>
      </div>
    </div></div>`;
}

function render(html){ document.getElementById('app').innerHTML = html; window.scrollTo(0,0); }
function ir(h){ location.hash = h; }
function rutear(){
  const partes = location.hash.replace(/^#\/?/,'').split('/').filter(Boolean);
  if(!partes.length) return render(home());
  if(partes[0]==='u') return render(unidad(partes[1]));
  if(partes.length===1) return render(familia(partes[0]));
  return render(modelo(partes[0],partes[1],true));
}
window.addEventListener('hashchange',rutear);
rutear();
"""

def construir():
    catalogo = [p for p in json.load(open(os.path.join(RAIZ, "catalogo.json"), encoding="utf-8")) if p["publicado"]]
    imgs, propias = cargar_imagenes()
    html = (
        '<!DOCTYPE html><html lang="es-AR"><head>\n'
        '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n'
        '<title>iPhone Connection \u2014 Tecnolog\u00eda con respaldo</title>\n'
        '<meta name="description" content="Tecnolog\u00eda revisada, documentada y con garant\u00eda escrita.">\n'
        '<meta property="og:title" content="iPhone Connection">\n'
        '<meta property="og:description" content="Sab\u00e9s exactamente qu\u00e9 est\u00e1s comprando.">\n'
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        '<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">\n'
        f'<style>{CSS}</style></head><body>\n'
        '<header><div class="wrap bar">\n'
        '<button class="logo" onclick="ir(\'#/\')">iPhone<em>Connection</em></button>\n'
        '<button class="wa-top">Consultar por WhatsApp</button>\n'
        '</div></header>\n<div id="app"></div>\n'
        '<footer><div class="wrap">\n'
        '<div class="logo" style="margin-bottom:10px">iPhone<em>Connection</em></div>\n'
        '<p style="max-width:36ch">Tecnolog\u00eda revisada, documentada y con garant\u00eda escrita.</p>\n'
        '<div class="legal"><span>\u00a9 2026 iPhone Connection</span><span>Prototipo \u00b7 precios de referencia</span></div>\n'
        '</div></footer>\n<button class="wa">WhatsApp</button>\n<script>\n'
        f'const CATALOGO = {json.dumps(catalogo, ensure_ascii=False)};\n'
        f'const IMG = {json.dumps(imgs)};\n'
        f'{JS}\n</script></body></html>'
    )
    os.makedirs(os.path.join(RAIZ, "deploy"), exist_ok=True)
    salida = os.path.join(RAIZ, "deploy/index.html")
    with open(salida, "w", encoding="utf-8") as f:
        f.write(html)
    open(os.path.join(RAIZ, "deploy/.nojekyll"), "w").close()
    print(f"OK deploy/index.html \u00b7 {len(catalogo)} unidades \u00b7 fotografia propia: {propias}")

if __name__ == "__main__":
    construir()
