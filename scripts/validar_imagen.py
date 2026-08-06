#!/usr/bin/env python3
"""
Validador de recortes · iPhone Connection

Decide si una imagen es un PRODUCTO o basura (texto de la lámina, fragmento, ruido).
Ninguna imagen llega al catálogo sin pasar por acá.

La señal que separa texto de producto no es la estructura —una consola con dos
joysticks se parece a una línea de letras— sino la FÍSICA DEL TRAZO:

  · El texto es tinta negra pura sobre blanco: saturación casi nula.
  · El texto son trazos finos: gran parte de sus píxeles son grises de antialias.
  · Un objeto negro real (un reloj, un auricular) también tiene saturación baja,
    pero es una masa sólida: casi no tiene grises intermedios.

De ahí la regla: saturación baja + muchos grises intermedios = texto.
"""
import os as _os, sys as _sys
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))

import numpy as np
from PIL import Image
from scipy import ndimage

UMBRAL_BLANCO = 244
MIN_COBERTURA = 0.05      # el objeto debe ocupar al menos esto del lienzo
MIN_LADO = 0.18           # y medir al menos esto en su lado mayor
SAT_TEXTO = 0.045         # por debajo, no hay color
MEDIOS_TEXTO = 0.18       # proporción de grises de antialias
OSCURO_TEXTO = 0.30       # proporción de tinta casi negra
MIN_ENTROPIA = 1.2        # una imagen casi vacía no sirve


def analizar(ruta: str) -> dict:
    a = np.asarray(Image.open(ruta).convert("RGB")).astype(float)
    lum = a.mean(axis=2)
    tinta = lum < UMBRAL_BLANCO
    total = tinta.size
    res = {"ancho": a.shape[1], "alto": a.shape[0]}

    if tinta.sum() < 50:
        return {**res, "cobertura": 0.0, "texto": False, "motivo": "imagen vacía", "ok": False}

    ys, xs = np.where(tinta)
    bh = (ys.max() - ys.min() + 1) / a.shape[0]
    bw = (xs.max() - xs.min() + 1) / a.shape[1]
    px = lum[tinta]

    mx, mn = a.max(axis=2), a.min(axis=2)
    sat = float(np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)[tinta].mean())
    oscuro = float((px < 70).mean())
    medios = float(((px >= 70) & (px < 210)).mean())

    hist, _ = np.histogram(px, bins=32, range=(0, 255))
    p = hist / hist.sum()
    entropia = float(-(p[p > 0] * np.log2(p[p > 0])).sum())

    et, n = ndimage.label(tinta, structure=np.ones((3, 3)))
    tam = ndimage.sum(tinta, et, range(1, n + 1)) if n else np.array([])
    piezas = int((tam > total * 0.0004).sum())

    res.update({
        "cobertura": round(float(tinta.mean()), 4),
        "lado_mayor": round(float(max(bh, bw)), 3),
        "saturacion": round(sat, 4),
        "medios": round(medios, 3),
        "oscuro": round(oscuro, 3),
        "entropia": round(entropia, 2),
        "piezas": piezas,
    })

    # Trazo de texto: sin color, tinta oscura y mucho gris de antialias.
    es_texto = sat < SAT_TEXTO and medios > MEDIOS_TEXTO and oscuro > OSCURO_TEXTO

    # Salvedad para objetos oscuros sólidos. Un reloj o un auricular negro tiene
    # el mismo perfil de trazo que el texto, pero es una masa compacta: sus
    # píxeles llenan casi todo su recuadro. El texto, en cambio, son trazos
    # finos separados por blanco y nunca supera un tercio de su propio recuadro.
    solidez = float(tinta.sum() / max((ys.max() - ys.min() + 1) * (xs.max() - xs.min() + 1), 1))
    if es_texto and solidez > 0.42:
        es_texto = False
    res["solidez"] = round(solidez, 3)
    res["texto"] = bool(es_texto)

    if es_texto:
        return {**res, "motivo": "parece texto de la lámina", "ok": False}
    if tinta.mean() < MIN_COBERTURA:
        return {**res, "motivo": f"objeto muy chico ({tinta.mean():.1%} del lienzo)", "ok": False}
    if max(bh, bw) < MIN_LADO:
        return {**res, "motivo": "objeto diminuto", "ok": False}
    if entropia < MIN_ENTROPIA:
        return {**res, "motivo": "sin variación tonal", "ok": False}

    return {**res, "motivo": "", "ok": True}


def es_valida(ruta: str) -> bool:
    try:
        return analizar(ruta)["ok"]
    except Exception:
        return False
