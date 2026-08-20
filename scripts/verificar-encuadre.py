#!/usr/bin/env python3
"""
Verifica el encuadre del catálogo contra un objetivo único.

Existe porque el arreglo anterior se propuso sin medir el estado real y apuntaba
para el lado equivocado: tomaba la mediana por modelo, que en varios grupos la
marcan las fotos sin normalizar, y habría agrandado las que ya estaban bien.

No corrige nada. Mide, y sirve para correrlo dos veces: antes de tocar, para
saber cuántas están fuera; y después, para confirmar que el número bajó. Si
después de normalizar el conteo de "fuera" no baja, el arreglo no funcionó,
por más que el script haya terminado sin error.

Uso:
    python3 scripts/verificar-encuadre.py             # objetivo 0.62
    python3 scripts/verificar-encuadre.py 0.73        # otro objetivo
    python3 scripts/verificar-encuadre.py 0.62 --lista
"""
import os as _os, sys as _sys
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))

from statistics import median
from PIL import Image
import numpy as np

DIR = "public/productos"
EXT = (".webp", ".jpg", ".jpeg", ".png")
UMBRAL = 244          # mismo que normalizar-encuadre.py, para comparar igual
TOLERANCIA = 0.04     # menos de 4% de diferencia no se percibe

args = [a for a in _sys.argv[1:] if not a.startswith("--")]
OBJETIVO = float(args[0]) if args else 0.62
LISTA = "--lista" in _sys.argv


def ocupacion(ruta):
    """Media geométrica alto/ancho del recorte del producto."""
    im = Image.open(ruta)
    a = np.array(im.convert("L"))
    ys, xs = np.where(a < UMBRAL)
    if len(ys) == 0:
        return None
    alto = (ys.max() - ys.min() + 1) / im.height
    ancho = (xs.max() - xs.min() + 1) / im.width
    return (alto * ancho) ** 0.5


def main():
    medidas = []
    for f in sorted(_os.listdir(DIR)):
        if not f.lower().endswith(EXT):
            continue
        o = ocupacion(_os.path.join(DIR, f))
        if o:
            medidas.append((_os.path.splitext(f)[0], o))

    if not medidas:
        print("no hay fotos reales en " + DIR)
        return

    vals = [m[1] for m in medidas]
    fuera = [m for m in medidas if abs(m[1] - OBJETIVO) / OBJETIVO > TOLERANCIA]

    print(f"objetivo: {OBJETIVO:.2f}   tolerancia: {TOLERANCIA:.0%}")
    print(f"fotos:    {len(medidas)}")
    print(f"mediana:  {median(vals):.3f}")
    print(f"rango:    {min(vals):.3f} – {max(vals):.3f}")
    print(f"dentro:   {len(medidas) - len(fuera)}")
    print(f"FUERA:    {len(fuera)}")

    # Histograma en pasos de 0.02: dos jorobas significan dos tandas distintas,
    # y eso es exactamente lo que hay que ver antes de elegir un objetivo.
    print()
    cubos = {}
    for _, o in medidas:
        cubos.setdefault(round(o / 0.02) * 0.02, 0)
        cubos[round(o / 0.02) * 0.02] += 1
    for k in sorted(cubos):
        marca = " <- objetivo" if abs(k - OBJETIVO) < 0.011 else ""
        print(f"  {k:.2f}  {'#' * min(cubos[k], 60):<60} {cubos[k]}{marca}")

    if LISTA and fuera:
        print("\nfuera de escala:")
        for ref, o in sorted(fuera, key=lambda x: -abs(x[1] - OBJETIVO)):
            print(f"  {ref:10} {o:.3f}  (x{OBJETIVO / o:.2f})")


if __name__ == "__main__":
    main()
