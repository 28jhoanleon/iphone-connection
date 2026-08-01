#!/usr/bin/env python3
"""
Asignación de fotos por MODELO + COLOR, con propagación.

Regla de esta etapa: una foto correcta del modelo y color vale más que un SVG
generado. Si un iPhone 13 Azul sirve para cinco referencias del mismo modelo y
color, se reutiliza la misma foto en las cinco.

Orden de preferencia para cada unidad:
  1. foto ya asignada a su propia referencia (la más precisa)
  2. foto de una unidad del mismo modelo Y mismo color
  3. foto de una unidad del mismo modelo (cualquier color) — solo si la unidad
     no declara color, para no publicar un color equivocado
  4. imagen generada
"""
import os as _os, sys as _sys
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))

import json, os, shutil, tempfile, collections
from validar_imagen import analizar

DESTINO = "public/productos"
RECORTES = os.environ.get("RECORTES_DIR") or os.path.join(tempfile.gettempdir(), "lam")
REALES = (".webp", ".jpg", ".jpeg", ".png")


def color_de(u):
    c = u.get("color") or (u.get("colores") or [None])[0]
    return (c or "").strip().lower() or None


def ruta_real(ref):
    return next((f"{DESTINO}/{ref}{e}" for e in REALES if os.path.exists(f"{DESTINO}/{ref}{e}")), None)


def main():
    catalogo = [p for p in json.load(open("data/catalogo.json", encoding="utf-8")) if p["publicado"]]
    antes = sum(1 for p in catalogo if ruta_real(p["ref"]))

    # ---- 1. incorporar los recortes nuevos según el mapa verificado ----
    mapa = json.load(open("scripts/mapa-laminas.json", encoding="utf-8"))
    banco = {}   # (modelo, color) -> ruta de archivo fuente
    nuevos = 0
    for lamina, entradas in mapa.items():
        if lamina.startswith("_"):
            continue
        for e in entradas:
            origen = os.path.join(RECORTES, lamina, f"{lamina}-{e['i']:02d}.webp")
            if not os.path.exists(origen):
                continue
            if not analizar(origen)["ok"]:
                print(f"  descartado (no pasa validación): {lamina}-{e['i']:02d}")
                continue
            clave = (e["modelo"], (e["color"] or "").lower() or None)
            banco.setdefault(clave, origen)
            nuevos += 1

    # ---- 2. sumar al banco las fotos ya validadas del catálogo ----
    for p in catalogo:
        r = ruta_real(p["ref"])
        if r:
            banco.setdefault((p["modelo"], color_de(p)), r)

    # índice por modelo, para el caso de unidades sin color declarado
    por_modelo = collections.defaultdict(list)
    for (modelo, color), ruta in banco.items():
        por_modelo[modelo].append((color, ruta))

    # ---- 3. asignar a cada unidad ----
    propagadas, exactas, sin_foto = 0, 0, []
    for p in catalogo:
        if ruta_real(p["ref"]):
            exactas += 1
            continue

        color = color_de(p)
        origen = banco.get((p["modelo"], color))

        if not origen and not color:
            # sin color declarado: cualquier foto del modelo es válida
            opciones = por_modelo.get(p["modelo"])
            if opciones:
                origen = opciones[0][1]

        if not origen:
            sin_foto.append(p["modelo"])
            continue

        shutil.copy(origen, os.path.join(DESTINO, f'{p["ref"]}.webp'))
        propagadas += 1

    despues = sum(1 for p in catalogo if ruta_real(p["ref"]))
    faltantes = sorted(set(sin_foto))

    print(f"\nRecortes nuevos incorporados : {nuevos}")
    print(f"Fotos reales antes           : {antes}")
    print(f"Asignadas por propagación    : {propagadas}")
    print(f"Fotos reales después         : {despues} / {len(catalogo)}")
    print(f"Siguen con imagen generada   : {len(catalogo) - despues}")
    print(f"Modelos sin fotografía       : {len(faltantes)}")

    with open("reportes/modelos-sin-foto.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(faltantes))


if __name__ == "__main__":
    os.makedirs("reportes", exist_ok=True)
    main()
