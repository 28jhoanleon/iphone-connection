#!/usr/bin/env python3
"""
Pipeline de imagenes maestras · iPhone Connection (v2.3 Soporte Colores)

El modelo + color pasa a ser la unidad de trabajo:

    public/maestras/{slug}-{color}.webp    <- imagen para ese color
    public/maestras/{slug}.webp            <- imagen base del modelo
    
    Propagacion automatica:
    Si el producto en catalogo tiene el campo "color": "Negro", busca la maestra 
    "slug-negro.webp". Si no existe, usa la maestra "slug.webp" como fallback.
"""
import os as _os, sys as _sys
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))

import json, os, re, shutil, unicodedata
import numpy as np
from PIL import Image, UnidentifiedImageError

try:
    from validar_imagen import analizar
except Exception:
    def analizar(ruta):
        return {"ok": True, "motivo": ""}

MAESTRAS = "public/maestras"
DESTINO = "public/productos"
ENTRADA = (".jpg", ".jpeg", ".png", ".webp")
LADO = 1000
MARGEN = 0.08
UMBRAL_FONDO = 244

MAGIC_IMAGEN = {
    b"\xff\xd8": "jpeg",
    b"\x89PNG": "png",
    b"GIF87a": "gif",
    b"GIF89a": "gif",
    b"RIFF": "webp",
}

def slug(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")

def es_imagen_valida(ruta: str) -> bool:
    try:
        with open(ruta, "rb") as f:
            header = f.read(16)
    except Exception:
        return False
    if len(header) < 4:
        return False
    for magic, fmt in MAGIC_IMAGEN.items():
        if header.startswith(magic):
            if fmt == "webp":
                return b"WEBP" in header
            return True
    return False

def normalizar(origen: str, destino: str) -> bool:
    try:
        im = Image.open(origen)
    except Exception:
        return False
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        fondo = Image.new("RGBA", im.size, (255, 255, 255, 255))
        im = Image.alpha_composite(fondo, im)
    im = im.convert("RGB")
    a = np.asarray(im).astype(float)
    tinta = a.mean(axis=2) < UMBRAL_FONDO
    if tinta.sum() < 200:
        return False
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
    
    maestras_dict = {}  # full_slug -> ruta_al_archivo_webp
    rechazadas = []
    
    for f in sorted(os.listdir(MAESTRAS)):
        nombre, ext = os.path.splitext(f)
        if ext.lower() not in ENTRADA:
            continue
        
        origen = os.path.join(MAESTRAS, f)
        if not es_imagen_valida(origen):
            rechazadas.append((f, "archivo corrupto o HTML descargado"))
            continue
            
        salida = os.path.join(MAESTRAS, f"{nombre}.webp")
        try:
            ya_lista = ext.lower() == ".webp" and Image.open(origen).size == (LADO, LADO)
        except Exception:
            ya_lista = False

        if not ya_lista and not normalizar(origen, salida):
            rechazadas.append((f, "imagen vacia o sin contenido"))
            continue

        if ext.lower() != ".webp":
            os.remove(origen)

        v = analizar(salida)
        if not v["ok"]:
            os.remove(salida)
            rechazadas.append((f, v["motivo"]))
            continue
            
        maestras_dict[nombre] = salida

    asignadas = 0
    modelos_con_foto = 0
    
    for p in catalogo:
        base_slug = slug(p["modelo"])
        
        target_color = p.get('color')
        target_maestra = None
        
        if target_color:
            color_slug = slug(target_color)
            target_maestra = maestras_dict.get(f"{base_slug}-{color_slug}")
        
        if not target_maestra:
            target_maestra = maestras_dict.get(base_slug)

        if target_maestra:
            shutil.copy(target_maestra, os.path.join(DESTINO, f'{p["ref"]}.webp'))
            asignadas += 1
            modelos_con_foto += 1

    reales = (".webp", ".jpg", ".jpeg", ".png")
    con_foto = [p for p in catalogo if any(os.path.exists(f'{DESTINO}/{p["ref"]}{e}') for e in reales)]
    
    faltantes = set()
    for p in catalogo:
        ref = p["ref"]
        if not any(os.path.exists(f'{DESTINO}/{ref}{e}') for e in reales):
            modelo_base = p["modelo"]
            color_especifico = p.get("color")
            if color_especifico:
                faltantes.add(f"{slug(modelo_base)}-{slug(color_especifico)}.webp   # {modelo_base} ({color_especifico})")
            else:
                faltantes.add(f"{slug(modelo_base)}.webp   # {modelo_base}")

    print(f"Maestras disponibles      : {len(maestras_dict)}")
    print(f"Referencias asignadas     : {asignadas}")
    print(f"Fotos reales en productos : {len(con_foto)} / {len(catalogo)}")
    print(f"Imagen generada           : {len(catalogo) - len(con_foto)}")
    print(f"Unidades a buscar         : {len(faltantes)}")

    if rechazadas:
        print(f"\nRechazadas ({len(rechazadas)}):")
        for f, motivo in rechazadas:
            print(f"  - {f}: {motivo}")

    with open("reportes/modelos-sin-foto.txt", "w", encoding="utf-8") as f:
        f.write("# Deja la imagen en public/maestras/ con este nombre y corre: npm run imagenes\n")
        for m in sorted(faltantes):
            f.write(f"{m}\n")

if __name__ == "__main__":
    main()
