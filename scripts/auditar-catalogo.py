#!/usr/bin/env python3
"""
Auditoría del catálogo · iPhone Connection
Detecta duplicados, categorías incoherentes, nomenclatura inconsistente,
categorías por debajo del mínimo publicable e imágenes faltantes.
"""
import json, os, re, collections

c = json.load(open("data/catalogo.json", encoding="utf-8"))
hallazgos = collections.defaultdict(list)

# 1 · duplicados exactos
vistos = {}
for p in c:
    k = (p["nombre"].lower(), p["capacidadGb"], p["costoCentavos"])
    if k in vistos:
        hallazgos["DUPLICADOS"].append(f'{p["ref"]} = {vistos[k]}  «{p["nombre"]}»')
    vistos[k] = p["ref"]

# 2 · producto en categoría equivocada
REGLAS = {
    "Audio": ("auricular", "parlante", "partybox", "bomboox", "charge", "flip", "go ", "pods", "airpods", "tune", "endurance", "pulse"),
    "Accesorios": ("cable", "cargador", "malla", "wallet", "battery", "airtag", "pencil", "teclado", "mouse", "joystick", "volante", "funda", "vidrio"),
    "Relojes": ("watch", "amazfit", "garmin", "band", "reloj"),
    "Consolas": ("ps5", "ps4", "nintendo", "switch", "xbox"),
    "Cámaras": ("go pro", "gopro", "camara"),
}
for p in c:
    low = p["nombre"].lower()
    for cat, claves in REGLAS.items():
        if any(k in low for k in claves) and p["categoria"] != cat:
            # excepciones legítimas
            if cat == "Audio" and p["categoria"] in ("AirPods",):
                continue
            if cat == "Relojes" and p["categoria"] == "Apple Watch":
                continue
            if cat == "Audio" and re.search(r"iphone|ipad|galaxy|redmi|poco|moto", low):
                continue
            hallazgos["CATEGORÍA"].append(f'{p["ref"]:<5} «{p["nombre"][:44]}» está en {p["categoria"]}, parece {cat}')
            break

# 3 · nomenclatura
for p in c:
    n = p["nombre"]
    if re.search(r"\b(gb|tb)\b", n) and not re.search(r"\d+ (GB|TB)", n):
        hallazgos["NOMENCLATURA"].append(f'{p["ref"]:<5} capacidad mal escrita: «{n}»')
    if re.search(r"''|\u2032|\u2033|\d\s+\"", n):
        hallazgos["NOMENCLATURA"].append(f'{p["ref"]:<5} pulgadas mal escritas: «{n}»')
    if re.search(r"\b(AAA|aaa)\b", n):
        hallazgos["NOMENCLATURA"].append(f'{p["ref"]:<5} código interno del proveedor visible: «{n}»')
    if n != n.strip() or "  " in n:
        hallazgos["NOMENCLATURA"].append(f'{p["ref"]:<5} espacios: «{n}»')
    if re.search(r"\b[a-z]{2,}\b", n.split()[0]) and not n.startswith(("iPhone", "iPad")):
        hallazgos["NOMENCLATURA"].append(f'{p["ref"]:<5} empieza en minúscula: «{n}»')

# 4 · categorías flacas
cat = collections.Counter(p["categoria"] for p in c)
for k, v in cat.items():
    if v < 6:
        hallazgos["CATEGORÍA FLACA"].append(f'{k}: {v} productos (mínimo 6 para publicar)')

# 5 · imágenes
reales = {f.rsplit(".", 1)[0] for f in os.listdir("public/productos") if not f.endswith(".svg")}
sin_foto = [p for p in c if p["ref"] not in reales]
hallazgos["IMÁGENES"].append(f"{len(sin_foto)} de {len(c)} productos sin fotografía real (usan imagen generada)")
arq = collections.Counter(p["arquetipo"] for p in sin_foto)
for k, v in arq.most_common():
    hallazgos["IMÁGENES"].append(f"   arquetipo {k}: {v}")

# 6 · precios sospechosos
for p in c:
    usd = (p["costoCentavos"] or 0) / 100
    if usd < 20 and p["categoria"] not in ("Accesorios", "Audio"):
        hallazgos["PRECIO"].append(f'{p["ref"]:<5} «{p["nombre"][:40]}» a USD {usd:.0f} en {p["categoria"]}')

for k in ["DUPLICADOS", "CATEGORÍA", "NOMENCLATURA", "CATEGORÍA FLACA", "PRECIO", "IMÁGENES"]:
    v = hallazgos.get(k, [])
    print(f"\n=== {k} ({len(v)}) ===")
    for x in v[:40]:
        print("  " + x)
    if len(v) > 40:
        print(f"  … y {len(v)-40} más")
