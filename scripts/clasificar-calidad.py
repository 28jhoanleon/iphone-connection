#!/usr/bin/env python3
"""
Clasifica cada producto según si cumple el patrón de publicación.

El catálogo lo escribe el proveedor y su calidad es despareja: hay filas sin
color, sin batería declarada, con nombres cortados o sin foto propia. Publicar
todo por igual arrastra esa inconsistencia al sitio.

Este script separa lo que cumple de lo que no, y deja lo segundo listado para
revisar desde el panel. No borra nada: marca.

    calidad: "completo"  -> tiene todo lo que el patrón pide
             "aceptable" -> le falta algo secundario, se publica igual
             "revisar"   -> le falta algo que se ve en el sitio
"""
import os as _os, sys as _sys
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))

import json, os, re

REALES = (".webp", ".jpg", ".jpeg", ".png")


def foto_real(ref):
    return any(os.path.exists(f"public/productos/{ref}{e}") for e in REALES)


def evaluar(p):
    """Devuelve (calidad, [faltantes]). El orden de los checks es el de impacto visual."""
    faltan = []

    if not foto_real(p["ref"]):
        faltan.append("sin fotografía propia")

    nombre = p["nombre"]
    if len(nombre) < 8:
        faltan.append("nombre demasiado corto")
    if len(nombre) > 62:
        faltan.append("nombre demasiado largo")
    if re.search(r"[A-Z]{5,}", nombre):
        faltan.append("nombre en mayúsculas")
    if re.search(r"\s{2,}", nombre):
        faltan.append("nombre con espacios dobles")

    # El color sólo se exige donde el mismo modelo se vende en varios: en un
    # MacBook o una notebook genérica el proveedor no lo declara y no hace falta.
    if p["categoria"] in ("iPhone", "Android") and not p.get("color"):
        faltan.append("sin color declarado")

    # un usado sin batería contradice la promesa de la marca
    if p["estado"] != "nuevo_sellado" and p.get("bateria") is None:
        faltan.append("usado sin batería declarada")

    if not p["costoCentavos"] and not p["precioCentavos"]:
        faltan.append("sin precio")

    if p.get("marca") in (None, "", "Sin marca", "Genérico"):
        faltan.append("sin marca")

    # Lo grave es lo que el cliente ve mal. La falta de foto propia se lista
    # aparte porque ya tiene su propia pantalla y su propio flujo de carga.
    graves = {"sin color declarado", "usado sin batería declarada",
              "sin precio", "nombre demasiado corto", "sin marca"}
    if not faltan:
        return "completo", []
    if any(f in graves for f in faltan):
        return "revisar", faltan
    return "aceptable", faltan


def main():
    catalogo = json.load(open("data/catalogo.json", encoding="utf-8"))
    conteo = {"completo": 0, "aceptable": 0, "revisar": 0}

    for p in catalogo:
        if not p["publicado"]:
            continue
        calidad, faltan = evaluar(p)
        p["calidad"] = calidad
        p["faltantes"] = faltan
        conteo[calidad] += 1

    json.dump(catalogo, open("data/catalogo.json", "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)

    total = sum(conteo.values())
    print(f"Productos publicados : {total}")
    for k in ("completo", "aceptable", "revisar"):
        print(f"  {k:<10} {conteo[k]:>4}  ({100 * conteo[k] // max(total, 1)}%)")

    if conteo["revisar"]:
        print("\nRevisalos en /admin/revisar")


if __name__ == "__main__":
    main()
