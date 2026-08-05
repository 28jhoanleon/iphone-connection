#!/usr/bin/env python3
"""
Normaliza el encuadre de todas las imágenes del catálogo.

Las fotos vienen de fuentes distintas y cada una trae su propio encuadre: un
iPhone ocupaba el 79% del alto y otro el 95%. Al pasar de una ficha a otra el
producto "salta" de tamaño, y eso es lo que hace que el catálogo se vea armado
con retazos en vez de fotografiado en un mismo estudio.

Se reescala cada producto para que ocupe una ALTURA fija según su tipo, con tope
de ancho para que nada se desborde. La altura objetivo cambia por arquetipo
porque un teléfono vertical y una consola apaisada no pueden ocupar lo mismo sin
que una de las dos quede diminuta.

Nunca deforma: el reescalado mantiene la proporción original.
"""
import os as _os, sys as _sys
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))

import json, os
import numpy as np
from PIL import Image

LADO = 1000
UMBRAL = 244
ANCHO_MAX = 0.86          # ningún producto supera esto del ancho del lienzo
ALTO_MAX = 0.86           # ni esto del alto

# Altura objetivo por tipo de producto. Los verticales pueden ocupar más alto;
# los apaisados se limitan por ancho y por eso se les da menos altura.
# Media geométrica objetivo del recorte, como fracción del lienzo.
# Un solo valor para todo el catálogo: es lo que hace que todo se vea del mismo
# tamaño al pasar de una ficha a otra, sin importar la forma del producto.
OBJETIVO = {}
POR_DEFECTO = 0.62
REALES = (".webp", ".jpg", ".jpeg", ".png")


def ruta(ref):
    return next((f"public/productos/{ref}{e}" for e in REALES
                 if os.path.exists(f"public/productos/{ref}{e}")), None)


def reencuadrar(archivo: str, objetivo: float) -> tuple[float, float] | None:
    im = Image.open(archivo)
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        fondo = Image.new("RGBA", im.size, (255, 255, 255, 255))
        im = Image.alpha_composite(fondo, im)
    im = im.convert("RGB")

    a = np.asarray(im).astype(float)
    m = a.mean(axis=2) < UMBRAL
    if m.sum() < 100:
        return None

    ys, xs = np.where(m)
    recorte = im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    w, h = recorte.size
    antes = h / a.shape[0]

    # Escala por SUPERFICIE aparente, no por altura.
    # Normalizar sólo la altura deja diminutos a los productos apaisados: un
    # parlante o una consola topan por ancho y quedan a la mitad de un teléfono.
    # Igualando la media geométrica del recorte, todos ocupan la misma
    # "presencia visual" sin importar su proporción.
    escala = (LADO * objetivo) / (w * h) ** 0.5
    # topes: nada se sale del lienzo
    if h * escala > LADO * ALTO_MAX:
        escala = (LADO * ALTO_MAX) / h
    if w * escala > LADO * ANCHO_MAX:
        escala = (LADO * ANCHO_MAX) / w

    recorte = recorte.resize((max(1, round(w * escala)), max(1, round(h * escala))), Image.LANCZOS)
    lienzo = Image.new("RGB", (LADO, LADO), (255, 255, 255))
    lienzo.paste(recorte, ((LADO - recorte.width) // 2, (LADO - recorte.height) // 2))

    salida = archivo.rsplit(".", 1)[0] + ".webp"
    lienzo.save(salida, "WEBP", quality=90, method=6)
    if salida != archivo:
        os.remove(archivo)
    return antes, recorte.height / LADO


def main():
    catalogo = [p for p in json.load(open("data/catalogo.json", encoding="utf-8")) if p["publicado"]]
    n, sin_cambio = 0, 0
    desvios = []

    for p in catalogo:
        f = ruta(p["ref"])
        if not f:
            continue
        obj = OBJETIVO.get(p["arquetipo"], POR_DEFECTO)
        r = reencuadrar(f, obj)
        if not r:
            sin_cambio += 1
            continue
        antes, despues = r
        desvios.append(abs(antes - despues))
        n += 1

    # verificación: se mide la media geométrica, que es lo que percibe el ojo
    # verificación: cuánta variación queda dentro de cada tipo
    import collections
    final = collections.defaultdict(list)
    for p in catalogo:
        f = ruta(p["ref"])
        if not f:
            continue
        a = np.asarray(Image.open(f).convert("L"))
        m = a < UMBRAL
        if m.sum() < 100:
            continue
        ys, xs = np.where(m)
        hh = ys.max() - ys.min() + 1
        ww = xs.max() - xs.min() + 1
        final[p["arquetipo"]].append((hh * ww) ** 0.5 / LADO)

    print(f"Imágenes reencuadradas: {n}")
    print(f"Sin contenido válido  : {sin_cambio}\n")
    print("Presencia visual (media geométrica del producto) por tipo:")
    peor = 0.0
    for k, v in sorted(final.items(), key=lambda x: -len(x[1])):
        rango = max(v) - min(v)
        peor = max(peor, rango)
        print(f"  {k:<18} n={len(v):>3}  {min(v):.3f} – {max(v):.3f}   rango {rango:.3f}")
    print(f"\nPeor variación: {peor:.3f}  ({'uniforme' if peor < 0.03 else 'revisar'})")


if __name__ == "__main__":
    main()
