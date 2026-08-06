#!/usr/bin/env python3
"""
Sombra de apoyo unificada para todo el catálogo.

Las fotos vienen de fuentes distintas: algunas traen sombra propia, otras están
recortadas en seco. Esa mezcla es lo que más delata que el catálogo se armó con
material de varios orígenes.

Se elimina cualquier sombra heredada (queda absorbida al recortar sobre blanco)
y se genera una nueva idéntica para todos: elipse desenfocada bajo el producto,
alineada a su base y proporcional a su ancho. El resultado se percibe como si
todo se hubiera fotografiado sobre la misma mesa.

Es idempotente: volver a correrlo no acumula sombras, porque siempre parte del
recorte del producto.
"""
import os as _os, sys as _sys
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))

import json, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

LADO = 1000
UMBRAL = 244
OPACIDAD = 62        # de 255. Sutil pero perceptible: apoya, no dibuja.
DESENFOQUE = 26
ALTO_ELIPSE = 0.030  # del lienzo
ANCHO_ELIPSE = 0.86  # del ancho del producto
SEPARACION = 10      # px entre la base del producto y el centro de la sombra

REALES = (".webp", ".jpg", ".jpeg", ".png")


def ruta(ref):
    return next((f"public/productos/{ref}{e}" for e in REALES
                 if os.path.exists(f"public/productos/{ref}{e}")), None)


def con_sombra(archivo: str) -> bool:
    im = Image.open(archivo).convert("RGB")
    a = np.asarray(im).astype(float)
    m = a.mean(axis=2) < UMBRAL
    if m.sum() < 100:
        return False

    ys, xs = np.where(m)
    x0, x1 = int(xs.min()), int(xs.max())
    base = int(ys.max())
    ancho = x1 - x0

    # el producto limpio, sin lo que hubiera debajo
    producto = im.crop((x0, int(ys.min()), x1 + 1, base + 1))

    cx = (x0 + x1) // 2
    rx = max(12, int(ancho * ANCHO_ELIPSE / 2))
    ry = max(5, int(LADO * ALTO_ELIPSE / 2))
    cy = min(LADO - ry - 4, base + SEPARACION)

    capa = Image.new("L", (LADO, LADO), 0)
    ImageDraw.Draw(capa).ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=OPACIDAD)
    capa = capa.filter(ImageFilter.GaussianBlur(DESENFOQUE))

    lienzo = Image.new("RGB", (LADO, LADO), (255, 255, 255))
    lienzo.paste(Image.new("RGB", (LADO, LADO), (0, 0, 0)), (0, 0), capa)
    lienzo.paste(producto, (x0, int(ys.min())))

    salida = archivo.rsplit(".", 1)[0] + ".webp"
    lienzo.save(salida, "WEBP", quality=90, method=6)
    if salida != archivo:
        os.remove(archivo)
    return True


def main():
    catalogo = [p for p in json.load(open("data/catalogo.json", encoding="utf-8")) if p["publicado"]]
    n = 0
    for p in catalogo:
        f = ruta(p["ref"])
        if f and con_sombra(f):
            n += 1
    print(f"Sombra aplicada a {n} imágenes.")


if __name__ == "__main__":
    main()
