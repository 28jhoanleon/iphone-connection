#!/usr/bin/env python3
"""
Pipeline de imagenes maestras v2.4 - Con advertencias de colores
"""
import os as _os, sys as _sys
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))

import json, os, re, shutil, unicodedata
import numpy as np
from PIL import Image, UnidentifiedImageError

MAESTRAS = "public/maestras"
DESTINO = "public/productos"
ENTRADA = (".jpg", ".jpeg", ".png", ".webp")
LADO = 1000
MARGEN = 0.08
UMBRAL_FONDO = 244

MAGIC_IMAGEN = { b"\xff\xd8": "jpeg", b"\x89PNG": "png", b"GIF87a": "gif", b"GIF89a": "gif", b"RIFF": "webp" }

def slug(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")

def es_imagen_valida(ruta: str) -> bool:
    try:
        with open(ruta, "rb") as f:
            header = f.read(16)
    except Exception: return False
    if len(header) < 4: return False
    for magic, fmt in MAGIC_IMAGEN.items():
        if header.startswith(magic):
            if fmt == "webp": return b"WEBP" in header
            return True
    return False

def normalizar(origen: str, destino: str) -> bool:
    try: im = Image.open(origen)
    except Exception: return False
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        fondo = Image.new("RGBA", im.size, (255, 255, 255, 255))
        im = Image.alpha_composite(fondo, im)
    im = im.convert("RGB")
    a = np.asarray(im).astype(float)
    tinta = a.mean(axis=2) < UMBRAL_FONDO
    if tinta.sum() < 200: return False
    ys, xs = np.where(tinta)
    im = im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    w, h = im.size
    disponible = LADO * (1 - MARGEN * 2)
    factor = disponible / max(w, h)
    nuevo_w = max(1, int(w * factor))
    nuevo_h = max(1, int(h * factor))
    im = im.resize((nuevo_w, nuevo_h), Image.LANCZOS)
    lienzo = Image.new("RGB", (LADO, LADO), (255, 255, 255))
    lienzo.paste(im, ((LADO - im.width) // 2, (LADO - im.height) // 2))
    lienzo.save(destino, "WEBP", quality=86, method=6)
    return True

def main() -> None:
    os.makedirs(MAESTRAS, exist_ok=True)
    os.makedirs("reportes", exist_ok=True)

    catalogo = [p for p in json.load(open("data/catalogo.json", encoding="utf-8")) if p["publicado"]]
    maestras_dict = {}
    for f in sorted(os.listdir(MAESTRAS)):
        nombre, ext = os.path.splitext(f)
        if ext.lower() not in ENTRADA: continue
        origen = os.path.join(MAESTRAS, f)
        if not es_imagen_valida(origen): continue
        salida = os.path.join(MAESTRAS, f"{nombre}.webp")
        try:
            ya_lista = ext.lower() == ".webp" and Image.open(origen).size == (LADO, LADO)
        except Exception: ya_lista = False
        if not ya_lista and not normalizar(origen, salida): continue
        if ext.lower() != ".webp": os.remove(origen)
        maestras_dict[nombre] = salida

    asignadas = 0
    print("\n🔍 VERIFICACIÓN DE IMÁGENES POR COLOR:")
    for p in catalogo:
        base_slug = slug(p["modelo"])
        target_color = p.get('color')
        target_maestra = None
        
        # Si tiene un color específico en el campo "color"
        if target_color:
            color_slug = slug(target_color)
            target_maestra = maestras_dict.get(f"{base_slug}-{color_slug}")
            if not target_maestra:
                print(f"   ⚠️  FALTA: {base_slug}-{color_slug}.webp para la ref {p['ref']} ({p['color']})")

        # Si NO tiene "color", intentamos usar el primer elemento del array "colores" o la imagen base
        elif p.get('colores') and len(p['colores']) > 0:
            # intentamos usar el primer color del array (o la imagen base si prefieres)
            primer_color = p['colores'][0]
            color_slug = slug(primer_color)
            target_maestra = maestras_dict.get(f"{base_slug}-{color_slug}")
            if not target_maestra:
                target_maestra = maestras_dict.get(base_slug) 

        # Fallback final: imagen base del modelo
        if not target_maestra:
            target_maestra = maestras_dict.get(base_slug)

        if target_maestra:
            shutil.copy(target_maestra, os.path.join(DESTINO, f'{p["ref"]}.webp'))
            asignadas += 1

    reales = (".webp", ".jpg", ".jpeg", ".png")
    con_foto = [p for p in catalogo if any(os.path.exists(f'{DESTINO}/{p["ref"]}{e}') for e in reales)]
    
    print(f"\n📊 ESTADÍSTICAS FINALES:")
    print(f"Maestras disponibles      : {len(maestras_dict)}")
    print(f"Referencias asignadas     : {asignadas}")
    print(f"Fotos reales en productos : {len(con_foto)} / {len(catalogo)}")

if __name__ == "__main__":
    main()
