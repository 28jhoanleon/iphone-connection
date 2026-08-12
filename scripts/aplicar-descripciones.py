#!/usr/bin/env python3
"""
Reaplica las descripciones al catálogo tras cada importación.

El catálogo se regenera entero desde la planilla, así que las descripciones
—que no vienen del proveedor— se perdían en cada sincronización. Viven en
data/descripciones.json, indexadas por producto y no por referencia: la
referencia cambia si el proveedor reordena filas, el producto no.
"""
import os as _os, sys as _sys
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))

import json, os, re, unicodedata

ARCHIVO = "data/descripciones.json"


def clave(p):
    """Identidad estable del producto: no depende de la referencia."""
    t = f'{p["modelo"]}|{p.get("capacidadGb") or ""}|{p["estado"]}'
    t = unicodedata.normalize("NFD", t.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9|]+", "", t)


def migrar():
    """Primera corrida: pasa las descripciones del archivo viejo al nuevo formato."""
    viejo = "data/catalogo_con_descripciones.json"
    if os.path.exists(ARCHIVO) or not os.path.exists(viejo):
        return
    d = {}
    for p in json.load(open(viejo, encoding="utf-8")):
        if p.get("descripcion"):
            d[clave(p)] = p["descripcion"]
    json.dump(d, open(ARCHIVO, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"Migradas {len(d)} descripciones a {ARCHIVO}")


def main():
    migrar()
    if not os.path.exists(ARCHIVO):
        print("Sin descripciones guardadas.")
        return

    desc = json.load(open(ARCHIVO, encoding="utf-8"))
    catalogo = json.load(open("data/catalogo.json", encoding="utf-8"))

    n = 0
    for p in catalogo:
        d = desc.get(clave(p))
        if d:
            p["descripcion"] = d
            n += 1

    json.dump(catalogo, open("data/catalogo.json", "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    print(f"Descripciones aplicadas: {n} / {len(catalogo)}")


if __name__ == "__main__":
    main()
