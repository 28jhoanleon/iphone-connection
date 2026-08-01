#!/usr/bin/env python3
"""
Pipeline de imágenes maestras · iPhone Connection

Reemplaza al segmentador de láminas. El modelo pasa a ser la unidad de trabajo:

    public/maestras/{modelo-slug}.{jpg|png|webp}   ← una imagen por modelo
                    ↓ propagación automática
    public/productos/{REF}.webp                     ← todas sus referencias

Para agregar la foto de un modelo alcanza con dejar el archivo en `maestras/`
con el slug del modelo y correr `npm run imagenes`. No hay que tocar código ni
saber qué referencias existen.

Normalización aplicada a toda imagen maestra, para que el catálogo se vea
uniforme aunque las fotos vengan de fuentes distintas:
  · recorte del fondo sobrante
  · centrado en lienzo cuadrado de 1000x1000
  · fondo blanco puro
  · mismo margen y mismo zoom relativo
  · WebP optimizado

Si un modelo no tiene maestra, conserva su imagen generada.
"""
import os as _os, sys as _sys
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))

import json, os, re, shutil, unicodedata
import numpy as np
from PIL import Image
from validar_imagen import analizar

MAESTRAS = "public/maestras"
DESTINO = "public/productos"
ENTRADA = (".jpg", ".jpeg", ".png", ".webp")
LADO = 1000
MARGEN = 0.08          # proporción del lado que queda libre alrededor
UMBRAL_FONDO = 244


def slug(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def normalizar(origen: str, destino: str) -> bool:
    """Recorta, centra sobre blanco y exporta WebP de 1000x1000."""
    im = Image.open(origen)
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
    im = im.resize((max(1, int(w * factor)), max(1, int(h * factor))), Image.LANCZOS)

    lienzo = Image.new("RGB", (LADO, LADO), (255, 255, 255))
    lienzo.paste(im, ((LADO - im.width) // 2, (LADO - im.height) // 2))
    lienzo.save(destino, "WEBP", quality=86, method=6)
    return True


def main() -> None:
    os.makedirs(MAESTRAS, exist_ok=True)
    os.makedirs("reportes", exist_ok=True)

    catalogo = [p for p in json.load(open("data/catalogo.json", encoding="utf-8")) if p["publicado"]]
    por_slug = {}
    for p in catalogo:
        por_slug.setdefault(slug(p["modelo"]), []).append(p)

    # ---- 1. normalizar las maestras nuevas ----
    disponibles, rechazadas = {}, []
    for f in sorted(os.listdir(MAESTRAS)):
        nombre, ext = os.path.splitext(f)
        if ext.lower() not in ENTRADA:
            continue
        if nombre not in por_slug:
            rechazadas.append((f, "no corresponde a ningún modelo del catálogo"))
            continue

        salida = os.path.join(MAESTRAS, f"{nombre}.norm.webp")
        origen = os.path.join(MAESTRAS, f)
        if ext.lower() == ".webp" and nombre.endswith(".norm"):
            continue
        if not normalizar(origen, salida):
            rechazadas.append((f, "imagen vacía o sin contenido"))
            continue

        v = analizar(salida)
        if not v["ok"]:
            os.remove(salida)
            rechazadas.append((f, v["motivo"]))
            continue
        disponibles[nombre] = salida

    # ---- 2. propagar a todas las referencias del modelo ----
    asignadas, modelos_ok = 0, 0
    for s, imagen in disponibles.items():
        for p in por_slug[s]:
            shutil.copy(imagen, os.path.join(DESTINO, f'{p["ref"]}.webp'))
            asignadas += 1
        modelos_ok += 1

    # ---- 3. informe ----
    reales = (".webp", ".jpg", ".jpeg", ".png")
    con_foto = [p for p in catalogo
                if any(os.path.exists(f'{DESTINO}/{p["ref"]}{e}') for e in reales)]
    sin_foto = sorted({p["modelo"] for p in catalogo if p not in con_foto})

    print(f"Maestras normalizadas   : {modelos_ok}")
    print(f"Referencias asignadas   : {asignadas}")
    print(f"Fotos reales            : {len(con_foto)} / {len(catalogo)}")
    print(f"Imagen generada         : {len(catalogo) - len(con_foto)}")
    print(f"Modelos sin fotografía  : {len(sin_foto)}")

    if rechazadas:
        print(f"\nRechazadas ({len(rechazadas)}):")
        for f, motivo in rechazadas:
            print(f"  · {f}: {motivo}")

    with open("reportes/modelos-sin-foto.txt", "w", encoding="utf-8") as f:
        f.write("# Dejá la imagen en public/maestras/ con este nombre y corré: npm run imagenes\n")
        for m in sin_foto:
            f.write(f"{slug(m)}.jpg    # {m}\n")


if __name__ == "__main__":
    main()
