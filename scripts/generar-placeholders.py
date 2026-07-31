#!/usr/bin/env python3
"""
Generador de imágenes placeholder · iPhone Connection
Doc 00 §7 (identidad visual) · sin renders oficiales, sin fotos de internet.

Produce SVG monocromos, del mismo sistema visual, uno por arquetipo de producto.
Vectoriales: pesan ~1 KB, escalan sin pérdida, no penalizan el LCP.
Se reemplazan por fotografía propia sin tocar el código: misma ruta, otro archivo.
"""
import os

BG      = "#F1F1F0"
BODY    = "#DEDDDA"
BODY_2  = "#D3D2CF"
SCREEN  = "#EAE9E7"
DETAIL  = "#C6C5C2"
LABEL   = "#B4B3B0"

def marco(inner: str, etiqueta: str) -> str:
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800" role="img" aria-label="Imagen provisoria de producto">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="{BODY}"/><stop offset="1" stop-color="{BODY_2}"/>
</linearGradient>
</defs>
<rect width="800" height="800" fill="{BG}"/>
{inner}
<text x="400" y="762" text-anchor="middle" font-family="monospace" font-size="13"
letter-spacing="4" fill="{LABEL}">{etiqueta}</text>
</svg>'''

def telefono():
    return marco(f'''
<rect x="295" y="125" width="210" height="440" rx="34" fill="url(#g)"/>
<rect x="308" y="138" width="184" height="414" rx="24" fill="{SCREEN}"/>
<rect x="368" y="150" width="64" height="13" rx="6.5" fill="{DETAIL}"/>
<rect x="318" y="152" width="70" height="70" rx="20" fill="{DETAIL}" opacity=".5"/>
<circle cx="340" cy="174" r="13" fill="{BODY_2}"/><circle cx="368" cy="174" r="13" fill="{BODY_2}"/>
<circle cx="340" cy="202" r="13" fill="{BODY_2}"/>''', "IPHONE CONNECTION")

def tablet():
    return marco(f'''
<rect x="255" y="150" width="290" height="400" rx="26" fill="url(#g)"/>
<rect x="269" y="164" width="262" height="372" rx="16" fill="{SCREEN}"/>
<circle cx="292" cy="186" r="11" fill="{DETAIL}"/>''', "IPHONE CONNECTION")

def notebook():
    return marco(f'''
<rect x="228" y="188" width="344" height="230" rx="12" fill="url(#g)"/>
<rect x="240" y="200" width="320" height="206" rx="6" fill="{SCREEN}"/>
<path d="M198 418 h404 l26 42 h-456 z" fill="{BODY_2}"/>
<rect x="360" y="432" width="80" height="7" rx="3.5" fill="{DETAIL}"/>''', "IPHONE CONNECTION")

def reloj():
    return marco(f'''
<rect x="352" y="196" width="96" height="120" rx="26" fill="{DETAIL}" opacity=".55"/>
<rect x="352" y="484" width="96" height="120" rx="26" fill="{DETAIL}" opacity=".55"/>
<rect x="326" y="288" width="148" height="224" rx="46" fill="url(#g)"/>
<rect x="340" y="302" width="120" height="196" rx="36" fill="{SCREEN}"/>
<rect x="474" y="352" width="12" height="42" rx="6" fill="{DETAIL}"/>''', "IPHONE CONNECTION")

def auriculares_in():
    return marco(f'''
<rect x="290" y="300" width="220" height="180" rx="46" fill="url(#g)"/>
<rect x="290" y="300" width="220" height="14" rx="7" fill="{DETAIL}" opacity=".6"/>
<circle cx="400" cy="466" r="7" fill="{DETAIL}"/>''', "IPHONE CONNECTION")

def auriculares_over():
    return marco(f'''
<path d="M282 400 a118 118 0 0 1 236 0" fill="none" stroke="{BODY_2}" stroke-width="26" stroke-linecap="round"/>
<rect x="246" y="380" width="76" height="140" rx="34" fill="url(#g)"/>
<rect x="478" y="380" width="76" height="140" rx="34" fill="url(#g)"/>''', "IPHONE CONNECTION")

def consola():
    return marco(f'''
<rect x="230" y="300" width="340" height="180" rx="26" fill="url(#g)"/>
<rect x="286" y="322" width="228" height="136" rx="12" fill="{SCREEN}"/>
<circle cx="260" cy="360" r="17" fill="{DETAIL}"/><circle cx="260" cy="424" r="17" fill="{DETAIL}"/>
<circle cx="540" cy="360" r="14" fill="{DETAIL}"/><circle cx="540" cy="424" r="14" fill="{DETAIL}"/>''', "IPHONE CONNECTION")

def accesorio():
    return marco(f'''
<circle cx="400" cy="392" r="112" fill="url(#g)"/>
<circle cx="400" cy="392" r="72" fill="{SCREEN}"/>
<rect x="388" y="504" width="24" height="112" rx="12" fill="{BODY_2}"/>''', "IPHONE CONNECTION")

ARQUETIPOS = {
    "telefono": telefono, "tablet": tablet, "notebook": notebook, "reloj": reloj,
    "auriculares-in": auriculares_in, "auriculares-over": auriculares_over,
    "consola": consola, "accesorio": accesorio,
}

# Mapa categoría -> arquetipo. Lo usa el importador.
MAPA_CATEGORIA = {
    "iphone": "telefono", "android": "telefono", "celular": "telefono", "smartphone": "telefono",
    "ipad": "tablet", "tablet": "tablet",
    "mac": "notebook", "macbook": "notebook", "notebook": "notebook", "laptop": "notebook",
    "watch": "reloj", "apple watch": "reloj", "smartwatch": "reloj", "reloj": "reloj",
    "airpods": "auriculares-in", "auriculares": "auriculares-in",
    "audio": "auriculares-over", "parlante": "auriculares-over",
    "consola": "consola", "gaming": "consola",
    "accesorio": "accesorio", "accesorios": "accesorio", "cargador": "accesorio", "funda": "accesorio",
}

def generar(destino="public/img/placeholder"):
    os.makedirs(destino, exist_ok=True)
    for nombre, fn in ARQUETIPOS.items():
        ruta = os.path.join(destino, f"{nombre}.svg")
        with open(ruta, "w", encoding="utf-8") as f:
            f.write(fn())
        print(f"  ✓ {ruta}")
    return len(ARQUETIPOS)

if __name__ == "__main__":
    n = generar()
    print(f"\n{n} placeholders generados.")
