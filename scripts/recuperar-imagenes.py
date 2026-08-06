#!/usr/bin/env python3
"""
Recupera las imágenes faltantes del catálogo desde las maestras.

Las maestras son la fuente: cada foto descargada queda en public/maestras con el
slug del modelo. Si una imagen de public/productos se borró o se descartó, este
script la vuelve a generar desde ahí, aplicando el mismo encuadre y la misma
sombra que el resto del catálogo.

    python3 scripts/recuperar-imagenes.py            # informa qué falta
    python3 scripts/recuperar-imagenes.py --aplicar  # las regenera

Los modelos sin maestra quedan listados: para esos hace falta conseguir la foto
y dejarla en public/maestras con el nombre indicado.
"""
import os as _os, sys as _sys
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))

import json, os, re, shutil, unicodedata, subprocess

MAESTRAS = "public/maestras"
DESTINO = "public/productos"
REALES = (".webp", ".jpg", ".jpeg", ".png")
aplicar = "--aplicar" in _sys.argv


def slug(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def tiene_foto(ref: str) -> bool:
    return any(os.path.exists(f"{DESTINO}/{ref}{e}") for e in REALES)


def main():
    catalogo = [p for p in json.load(open("data/catalogo.json", encoding="utf-8")) if p["publicado"]]
    faltan = [p for p in catalogo if not tiene_foto(p["ref"])]

    if not faltan:
        print("No falta ninguna imagen.")
        return

    disponibles = {os.path.splitext(f)[0] for f in os.listdir(MAESTRAS)
                   if f.lower().endswith(REALES)}

    recuperables, sin_maestra = [], []
    for p in faltan:
        s = slug(p["modelo"])
        # se busca la maestra del modelo, con o sin color en el nombre
        cand = next((d for d in disponibles if d == s or d.startswith(s + "-")), None)
        (recuperables if cand else sin_maestra).append((p, cand))

    print(f"Sin imagen: {len(faltan)}")
    print(f"  recuperables desde maestras : {len(recuperables)}")
    print(f"  sin maestra disponible      : {len(sin_maestra)}\n")

    for p, cand in recuperables:
        print(f"  ✓ {p['ref']}  {p['nombre'][:38]:<38} <- {cand}")
    for p, _ in sin_maestra:
        print(f"  ✗ {p['ref']}  {p['nombre'][:38]:<38} falta {slug(p['modelo'])}.jpg")

    if not aplicar:
        print("\nCorré con --aplicar para regenerarlas.")
        return

    n = 0
    for p, cand in recuperables:
        origen = next(f"{MAESTRAS}/{cand}{e}" for e in REALES
                      if os.path.exists(f"{MAESTRAS}/{cand}{e}"))
        shutil.copy(origen, f"{DESTINO}/{p['ref']}.webp")
        n += 1
    print(f"\n{n} imágenes recuperadas.")

    if n:
        # el mismo encuadre y la misma sombra que el resto del catálogo
        for s in ("normalizar-encuadre.py", "aplicar-sombra.py"):
            if os.path.exists(f"scripts/{s}"):
                subprocess.run([_sys.executable, f"scripts/{s}"], check=False)
        subprocess.run([_sys.executable, "scripts/auditar-imagenes.py", "--borrar"], check=False)


if __name__ == "__main__":
    main()
