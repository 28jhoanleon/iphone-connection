#!/usr/bin/env python3
"""
Reaplica las correcciones guardadas desde el panel.

El catálogo se regenera entero en cada sincronización, así que las correcciones
viven aparte y se vuelven a aplicar después. Es lo que hace que un arreglo hecho
una vez quede para siempre, aunque el proveedor siga mandando el dato incompleto.

Corre solo dentro de `npm run datos` y de la sincronización.
"""
import os as _os, sys as _sys
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))

import json, os

ARCHIVO = "data/correcciones.json"

if not os.path.exists(ARCHIVO):
    print("Sin correcciones guardadas.")
    raise SystemExit(0)

correcciones = json.load(open(ARCHIVO, encoding="utf-8"))
catalogo = json.load(open("data/catalogo.json", encoding="utf-8"))

aplicadas, ocultados = 0, 0
for p in catalogo:
    c = correcciones.get(p["ref"])
    if not c:
        continue
    if c.get("oculto"):
        p["publicado"] = False
        ocultados += 1
        continue
    for campo in ("nombre", "color", "categoria", "marca"):
        if c.get(campo):
            p[campo] = c[campo]
    aplicadas += 1

json.dump(catalogo, open("data/catalogo.json", "w", encoding="utf-8"),
          ensure_ascii=False, indent=2)

print(f"Correcciones aplicadas : {aplicadas}")
print(f"Productos ocultados    : {ocultados}")
