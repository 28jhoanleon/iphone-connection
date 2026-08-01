#!/usr/bin/env python3
"""Auditoría del catálogo. Corre antes de publicar. Sale con error si hay anomalías graves."""
import json, os, re, collections, sys, unicodedata

c = [p for p in json.load(open("data/catalogo.json", encoding="utf-8"))]
pub = [p for p in c if p["publicado"]]
graves, avisos = [], []

def norm(s):
    s = unicodedata.normalize("NFD", str(s).lower())
    return "".join(x for x in s if unicodedata.category(x) != "Mn")

# --- referencias
refs = collections.Counter(p["ref"] for p in c)
for r, n in refs.items():
    if n > 1: graves.append(f"REF DUPLICADA · {r} aparece {n} veces")
for p in c:
    if not re.fullmatch(r"[A-Z]\d{3}", p["ref"]):
        avisos.append(f"REF con formato raro · {p['ref']}")

# --- nombres
for p in pub:
    n = p["nombre"]
    if len(n) < 4: graves.append(f"NOMBRE muy corto · {p['ref']} «{n}»")
    if len(n) > 60: avisos.append(f"NOMBRE muy largo ({len(n)}) · {p['ref']} «{n[:50]}…»")
    if re.search(r"[A-Z]{4,}", n): avisos.append(f"NOMBRE en mayúsculas · {p['ref']} «{n}»")
    if re.search(r"\s{2,}|^\s|\s$", n): avisos.append(f"NOMBRE con espacios sucios · {p['ref']}")
    if n != n.strip(): graves.append(f"NOMBRE sin recortar · {p['ref']}")

# --- nombre vs categoría
PISTAS = {
    "iPhone": r"iphone", "Relojes": r"watch|band|fit\b|amazfit|garmin|forerunner|instinct|smart watch",
    "Tablets": r"ipad|tab\b|pad\b|tablet", "Notebooks": r"macbook|notebook|imac",
    "Audio": r"airpods|jbl|auricular|xpods|buds|partybox|boombox|endurance|tune|charge|flip|go \d",
    "Consolas": r"ps5|playstation|switch|xbox|nintendo|vr2",
    "Android": r"galaxy|xiaomi|redmi|poco|moto|realme|infinix|honor|nokia|huawei",
}
for p in pub:
    pat = PISTAS.get(p["categoria"])
    if pat and not re.search(pat, norm(p["nombre"])):
        otras = [k for k, v in PISTAS.items() if k != p["categoria"] and re.search(v, norm(p["nombre"]))]
        if otras: graves.append(f"CATEGORÍA equivocada · {p['ref']} «{p['nombre']}» está en {p['categoria']}, parece {otras[0]}")

# --- precios
for p in pub:
    if p["precioCentavos"] <= 0: graves.append(f"PRECIO cero o negativo · {p['ref']}")
    if p["costoCentavos"] and p["precioCentavos"] <= p["costoCentavos"]:
        graves.append(f"PRECIO menor o igual al costo · {p['ref']}")
    # umbrales calibrados para el mercado argentino: un iPhone 17 Pro Max ronda los 3M
    if p["precioCentavos"] > 5_000_000_00: avisos.append(f"PRECIO fuera de rango · {p['ref']} ${p['precioCentavos']//100:,}")
    if p["precioCentavos"] < 10_000_00: avisos.append(f"PRECIO fuera de rango · {p['ref']} ${p['precioCentavos']//100:,}")

# --- estado y batería (Doc 00 + ADR-001)
for p in pub:
    e, b = p["estado"], p["bateria"]
    if e == "nuevo_sellado" and b not in (None, 100):
        avisos.append(f"SELLADO con batería declarada · {p['ref']} {b}%")
    if e != "nuevo_sellado":
        if b is None: graves.append(f"USADO sin batería · {p['ref']} (viola Doc 00)")
        elif e == "seleccionado_a" and b < 85: graves.append(f"GRADO A con batería {b}% · {p['ref']}")
        elif e == "seleccionado_b" and not (80 <= b < 85) and not p["defecto"]:
            avisos.append(f"GRADO B con batería {b}% y sin defecto declarado · {p['ref']}")
        elif e == "seleccionado_c" and b >= 80: avisos.append(f"GRADO C con batería {b}% · {p['ref']}")
    if e == "seleccionado_a" and p["defecto"]:
        graves.append(f"GRADO A con defecto declarado · {p['ref']}")

# --- imágenes
sin_img = [p["ref"] for p in pub if not any(
    os.path.exists(f"public/productos/{p['ref']}.{x}") for x in ("jpg", "jpeg", "png", "webp", "svg"))]
for r in sin_img: graves.append(f"SIN IMAGEN · {r}")

archivos = {f.rsplit(".", 1)[0] for f in os.listdir("public/productos")}
huerfanas = archivos - {p["ref"] for p in c}
for h in sorted(huerfanas): avisos.append(f"IMAGEN HUÉRFANA · {h} no corresponde a ningún producto")

# --- disponibilidad y marca
for p in pub:
    if p["disponibilidad"] not in ("disponible", "por_encargo", "sin_stock"):
        graves.append(f"DISPONIBILIDAD inválida · {p['ref']} «{p['disponibilidad']}»")
    if p["marca"] in ("", "Sin marca"): avisos.append(f"SIN MARCA · {p['ref']} «{p['nombre']}»")

# --- categorías por debajo del mínimo publicable (Doc 00)
cats = collections.Counter(p["categoria"] for p in pub)
for k, v in cats.items():
    if v < 6: avisos.append(f"CATEGORÍA FLACA · {k} tiene {v} productos (mínimo 6)")

# --- duplicados reales: mismo nombre, estado, batería y precio
firma = collections.Counter((p["nombre"], p["estado"], p["bateria"], p["precioCentavos"]) for p in pub)
for (n, _, _, _), v in firma.items():
    if v > 1: avisos.append(f"POSIBLE DUPLICADO · «{n}» x{v} idénticos")

print(f"Productos totales: {len(c)} · publicados: {len(pub)}")
print(f"Categorías: {dict(cats)}\n")
print(f"{'='*58}\nGRAVES: {len(graves)}")
for g in graves: print("  ✗", g)
print(f"\nAVISOS: {len(avisos)}")
for a in avisos[:40]: print("  ·", a)
if len(avisos) > 40: print(f"  … y {len(avisos)-40} más")

with open("reportes/reporte-auditoria.txt", "w", encoding="utf-8") as f:
    f.write(f"AUDITORÍA DE CATÁLOGO\nProductos: {len(c)} · publicados: {len(pub)}\n\n")
    f.write(f"GRAVES ({len(graves)})\n" + "\n".join("  " + g for g in graves))
    f.write(f"\n\nAVISOS ({len(avisos)})\n" + "\n".join("  " + a for a in avisos))

sys.exit(1 if graves else 0)

import os as _os, sys as _sys
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
_os.makedirs("reportes", exist_ok=True)
