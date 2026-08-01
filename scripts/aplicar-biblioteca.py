#!/usr/bin/env python3
"""
Aplica la biblioteca de fotos por MODELO + COLOR a todas las referencias del catálogo.

Una foto del iPhone 12 Pro azul sirve para las cinco unidades de ese modelo y color:
son el mismo producto. Se reutiliza en todas en lugar de dejarlas con imagen generada.

Prioridad de coincidencia:
  1. modelo exacto + color exacto
  2. modelo exacto, cualquier color   (sólo si la unidad no declara color)
Nunca se usa la foto de un color distinto al declarado.
"""
import os as _os, sys as _sys
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))

import glob, json, shutil, unicodedata
from validar_imagen import analizar

BIBLIOTECA = "fotos-modelo"
DESTINO = "public/productos"

SINONIMOS = {
    "titanio natural": "natural", "titanio negro": "negro", "titanio blanco": "blanco",
    "titanio azul": "azul", "space black": "negro", "space gray": "gris",
    "medianoche": "negro", "black": "negro", "white": "blanco", "blue": "azul",
    "silver": "plata", "plata": "blanco", "gold": "dorado", "red": "rojo",
    "morado": "lila", "purpura": "lila", "violeta": "lila", "grafito": "gris",
    "titanium": "titanio", "desert": "dorado", "ultramarino": "azul",
    "azul sierra": "celeste", "verde azulado": "verde", "rosado": "rosa",
}

def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", str(s or "").lower().strip())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return SINONIMOS.get(s, s)

def clave_modelo(s: str) -> str:
    s = unicodedata.normalize("NFD", str(s).lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return "".join(c for c in s if c.isalnum())

# índice de la biblioteca: {(modelo, color): ruta}
fotos = {}
for f in glob.glob(f"{BIBLIOTECA}/*.webp"):
    base = _os.path.basename(f)[:-5]
    mod, _, col = base.partition("__")
    fotos[(clave_modelo(mod.replace("_", " ")), norm(col))] = f

catalogo = json.load(open("data/catalogo.json", encoding="utf-8"))
nuevas, ya, sin_foto = 0, 0, []

for p in catalogo:
    if not p["publicado"]:
        continue
    ref = p["ref"]
    if any(_os.path.exists(f"{DESTINO}/{ref}{e}") for e in (".webp", ".jpg", ".jpeg", ".png")):
        ya += 1
        continue

    km = clave_modelo(p["modelo"])
    colores = [p["color"]] if p["color"] else (p["colores"] or [])
    elegida = None
    for c in colores:
        elegida = fotos.get((km, norm(c)))
        if elegida:
            break
    if not elegida and not colores:
        elegida = next((v for (m, _), v in fotos.items() if m == km), None)

    if not elegida:
        sin_foto.append((p["modelo"], p["categoria"]))
        continue
    if not analizar(elegida)["ok"]:
        sin_foto.append((p["modelo"], p["categoria"]))
        continue

    shutil.copy(elegida, f"{DESTINO}/{ref}.webp")
    nuevas += 1

pub = [p for p in catalogo if p["publicado"]]
reales = sum(1 for p in pub if any(_os.path.exists(f'{DESTINO}/{p["ref"]}{e}') for e in (".webp", ".jpg", ".jpeg", ".png")))
print(f"Fotos ya asignadas   : {ya}")
print(f"Nuevas desde biblioteca: {nuevas}")
print(f"COBERTURA            : {reales}/{len(pub)} con foto real ({100*reales//len(pub)}%)")

import collections
faltan = collections.Counter(sin_foto)
print(f"\nModelos sin fotografía: {len(faltan)}")
with open("reportes/modelos-sin-foto.txt", "w", encoding="utf-8") as f:
    for (mod, cat), n in sorted(faltan.items(), key=lambda x: (x[0][1], x[0][0])):
        f.write(f"{cat:<12} {mod}  ({n} unidades)\n")
