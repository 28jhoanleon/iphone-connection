#!/usr/bin/env python3
"""Normaliza una imagen suelta con el mismo criterio que todo el catálogo."""
import os as _os, sys as _sys
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))

import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

LADO, OBJETIVO, TOPE = 1000, 0.62, 0.86
origen, ref = sys.argv[1], sys.argv[2]

im = Image.open(origen)
if im.mode in ("RGBA", "LA", "P"):
    im = im.convert("RGBA")
    im = Image.alpha_composite(Image.new("RGBA", im.size, (255, 255, 255, 255)), im)
im = im.convert("RGB")

a = np.asarray(im).astype(float)
lum = a.mean(axis=2)

# El fondo no siempre es blanco: se toma el tono de las esquinas.
esq = [lum[0, 0], lum[0, -1], lum[-1, 0], lum[-1, -1]]
fondo = sum(esq) / 4
limite = fondo - 10 if (max(esq) - min(esq) < 12 and fondo > 150) else 244

m = lum < limite
if m.sum() < 200:
    raise SystemExit("La imagen está vacía o es toda de un color.")

ys, xs = np.where(m)
rec = im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
w, h = rec.size
e = min((LADO * OBJETIVO) / (w * h) ** 0.5, LADO * TOPE / h, LADO * TOPE / w)
nw, nh = max(1, round(w * e)), max(1, round(h * e))
rec = rec.resize((nw, nh), Image.LANCZOS)

base = (LADO - nh) // 2 + nh
cx, rx = LADO // 2, max(12, int(nw * 0.86 / 2))
ry = max(5, int(LADO * 0.03 / 2))
cy = min(LADO - ry - 4, base + 10)
capa = Image.new("L", (LADO, LADO), 0)
ImageDraw.Draw(capa).ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=62)
capa = capa.filter(ImageFilter.GaussianBlur(26))

lienzo = Image.new("RGB", (LADO, LADO), (255, 255, 255))
lienzo.paste(Image.new("RGB", (LADO, LADO), (0, 0, 0)), (0, 0), capa)
lienzo.paste(rec, ((LADO - nw) // 2, (LADO - nh) // 2))
lienzo.save(f"public/productos/{ref}.webp", "WEBP", quality=90, method=6)
print("ok")
