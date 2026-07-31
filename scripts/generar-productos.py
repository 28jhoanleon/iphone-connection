#!/usr/bin/env python3
"""
Generador de imágenes por producto · iPhone Connection

Una imagen por unidad del catálogo, con:
- la GEOMETRÍA real del modelo (notch vs Dynamic Island, 2 vs 3 cámaras, home button,
  bordes redondeados vs planos, proporción de cada generación)
- el COLOR real declarado en la planilla

Sistema de reemplazo (requisito del fundador):
El sitio resuelve la imagen así -> public/img/productos/{REF}.jpg  (fotografía propia)
                               -> public/img/productos/{REF}.svg  (generada, fallback)
Dejar caer un JPG con el nombre de la referencia reemplaza la imagen. Cero código.
"""
import json, os, re

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEST = os.path.join(RAIZ, "public/img/productos")

BG = "#F1F1F0"

COLORES = {
    "negro": "#1D1D1F", "black": "#1D1D1F", "negros": "#1D1D1F",
    "blanco": "#F2F1ED", "silver": "#E3E4E6", "natural": "#C9C0B6",
    "gold": "#E3C9A8", "rosa": "#F0D4D4", "lila": "#D9CCE8", "morado": "#D9CCE8",
    "verde": "#C9DACC", "azul": "#B9C7D9", "blue": "#B9C7D9", "celeste": "#CBD9E3",
    "rojo": "#C4423F", "red": "#C4423F", "desert": "#D3BFA6", "orange": "#D9A87C",
    "varios": "#D8D7D4", "consultar": "#D8D7D4",
}

def color_de(p):
    fuente = " ".join(filter(None, [p.get("color") or "", " ".join(p.get("colores") or [])])).lower()
    for k, v in COLORES.items():
        if k in fuente:
            return v
    return "#D8D7D4"

def sombra(c):
    """Borde apenas más oscuro para dar volumen sin usar filtros."""
    n = int(c[1:], 16)
    r, g, b = (n >> 16) & 255, (n >> 8) & 255, n & 255
    f = 0.82
    return f"#{int(r*f):02X}{int(g*f):02X}{int(b*f):02X}"

def generacion(nombre):
    m = re.search(r"iphone\s+(se\s*2|\d+e|\d+)", nombre.lower())
    if not m:
        return None
    t = m.group(1).replace(" ", "")
    if t == "se2":
        return 0
    return int(re.sub(r"\D", "", t))

def telefono(p):
    """Dibuja el iPhone con la geometría de su generación."""
    n = generacion(p["nombre"])
    pro = "pro" in p["nombre"].lower()
    maxi = "max" in p["nombre"].lower()
    c = color_de(p); bd = sombra(c)
    scr = "#EDECEA"

    w = 290 if maxi else (274 if pro or (n and n >= 12) else 266)
    h = 600 if maxi else 578
    x, y = 400 - w/2, 400 - h/2
    r = 28 if n == 0 else (44 if n and n >= 12 else 38)

    partes = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{c}" stroke="{bd}" stroke-width="2"/>']

    if n == 0:  # SE 2 · marcos gruesos y botón de inicio
        partes.append(f'<rect x="{x+14}" y="{y+68}" width="{w-28}" height="{h-142}" fill="{scr}"/>')
        partes.append(f'<circle cx="400" cy="{y+h-36}" r="21" fill="none" stroke="{bd}" stroke-width="2"/>')
        partes.append(f'<circle cx="{x+46}" cy="{y+h-70}" r="17" fill="{bd}" opacity=".35"/>')
    else:
        partes.append(f'<rect x="{x+16}" y="{y+16}" width="{w-32}" height="{h-24}" rx="{r-10}" fill="{scr}"/>')
        if n >= 15 or (n == 14 and pro):  # Dynamic Island
            partes.append(f'<rect x="{400-39}" y="{y+29}" width="78" height="25" rx="12.5" fill="#101012"/>')
        else:  # notch
            partes.append(f'<rect x="{400-50}" y="{y+12}" width="100" height="29" rx="14" fill="{c}"/>')
        # módulo de cámara
        lentes = 3 if pro else 2
        mw = 122 if lentes == 3 else 98
        partes.append(f'<rect x="{x+20}" y="{y+20}" width="{mw}" height="{mw}" rx="34" fill="{bd}" opacity=".55"/>')
        lx, ly = x + 20 + 32, y + 20 + 32
        partes.append(f'<circle cx="{lx}" cy="{ly}" r="19" fill="{c}" stroke="{bd}" stroke-width="4"/>')
        partes.append(f'<circle cx="{lx}" cy="{ly+58}" r="19" fill="{c}" stroke="{bd}" stroke-width="4"/>')
        if lentes == 3:
            partes.append(f'<circle cx="{lx+58}" cy="{ly+58}" r="19" fill="{c}" stroke="{bd}" stroke-width="4"/>')
    return "".join(partes)

def reloj(p):
    c = color_de(p); bd = sombra(c)
    ultra = "ultra" in p["nombre"].lower()
    w, h = (228, 282) if ultra else (206, 256)
    x, y = 400 - w/2, 400 - h/2
    return (f'<rect x="{400-63}" y="{y-140}" width="126" height="158" rx="32" fill="{bd}" opacity=".45"/>'
            f'<rect x="{400-63}" y="{y+h-18}" width="126" height="158" rx="32" fill="{bd}" opacity=".45"/>'
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{60 if ultra else 54}" fill="{c}" stroke="{bd}" stroke-width="2"/>'
            f'<rect x="{x+12}" y="{y+12}" width="{w-32}" height="{h-32}" rx="{44}" fill="#101012"/>'
            f'<rect x="{x+w-2}" y="{y+80}" width="15" height="54" rx="7.5" fill="{bd}"/>')

def accesorio(p):
    c = color_de(p); bd = sombra(c)
    return (f'<path d="M300 340 q-34 60 -14 120 q22 62 68 44 q46 -20 92 -20 q46 0 92 20 q46 18 68 -44 '
            f'q20 -60 -14 -120 q-24 -42 -66 -30 q-40 12 -80 12 q-40 0 -80 -12 q-42 -12 -66 30 z" '
            f'fill="{c}" stroke="{bd}" stroke-width="2"/>'
            f'<circle cx="330" cy="392" r="26" fill="{bd}" opacity=".4"/>'
            f'<circle cx="470" cy="392" r="26" fill="{bd}" opacity=".4"/>')

def svg(p):
    if p["categoria"] == "iPhone":
        cuerpo = telefono(p)
    elif p["categoria"] == "Apple Watch":
        cuerpo = reloj(p)
    else:
        cuerpo = accesorio(p)
    sombra_piso = ('<ellipse cx="400" cy="726" rx="176" ry="17" fill="#000" opacity=".055"/>'
                   '<ellipse cx="400" cy="726" rx="104" ry="10" fill="#000" opacity=".05"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800" '
            f'role="img" aria-label="{p["nombre"]}"><rect width="800" height="800" fill="{BG}"/>'
            f'{sombra_piso}{cuerpo}</svg>')

def main():
    os.makedirs(DEST, exist_ok=True)
    catalogo = json.load(open(os.path.join(RAIZ, "catalogo.json"), encoding="utf-8"))
    for p in catalogo:
        with open(os.path.join(DEST, f'{p["ref"]}.svg'), "w", encoding="utf-8") as f:
            f.write(svg(p))
    print(f"✓ {len(catalogo)} imágenes generadas en public/img/productos/")

if __name__ == "__main__":
    main()
