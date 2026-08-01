#!/usr/bin/env python3
"""Genera public/indice-busqueda.json para que el buscador no pese en cada página."""
import json, os, unicodedata, re

def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(c for c in s if unicodedata.category(c) != "Mn")

cat = [p for p in json.load(open("data/catalogo.json", encoding="utf-8")) if p["publicado"]]
cfg = json.load(open("data/precios.json", encoding="utf-8"))
TC = cfg["tcRespaldo"]

def precio(u):
    if not u["costoCentavos"]:
        return u["precioCentavos"]
    paso = cfg["redondeoPesos"] * 100
    return round(u["costoCentavos"] * TC * (1 + cfg["margen"]) / paso) * paso

def img(ref):
    for ext in ("jpg", "jpeg", "png", "webp", "svg"):
        if os.path.exists(f"public/productos/{ref}.{ext}"):
            return f"/productos/{ref}.{ext}"
    return f"/productos/{ref}.svg"

items, modelos = [], {}
for u in cat:
    modelos.setdefault(u["modeloSlug"], []).append(u)

for slug, us in modelos.items():
    items.append({"t": "m", "n": us[0]["modelo"], "h": f"/modelo/{slug}",
                  "i": img(us[0]["ref"]), "e": f"{len(us)} unidades",
                  "p": min(precio(u) for u in us),
                  "k": norm(f'{us[0]["modelo"]} {us[0]["categoria"]} {us[0]["marca"]}')})

for u in cat:
    colores = " ".join(u["colores"] or ([u["color"]] if u["color"] else []))
    items.append({"t": "u", "n": u["nombre"], "h": f'/unidad/{u["ref"]}',
                  "i": img(u["ref"]),
                  "e": "Stock inmediato" if u["disponibilidad"] == "disponible" else "Por encargo",
                  "p": precio(u),
                  "k": norm(f'{u["nombre"]} {u["ref"]} {u["estadoEtiqueta"]} {colores} {u["capacidadGb"] or ""}gb')})

json.dump(items, open("public/indice-busqueda.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(f"indice-busqueda.json · {len(items)} entradas · {os.path.getsize('public/indice-busqueda.json')//1024} KB")

import os as _os, sys as _sys
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
