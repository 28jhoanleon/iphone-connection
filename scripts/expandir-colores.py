#!/usr/bin/env python3
"""
Expande las unidades que llegan con varios colores en una unidad por color.

El proveedor manda una fila con "azul naranja" y el importador la guarda como
colores: ["Azul", "Naranja"] con color en null. Eso rompe tres cosas a la vez:
el filtro muestra la unidad en los dos colores, la foto sigue al filtro pero la
etiqueta sigue mostrando los dos, y el cliente no sabe qué equipo está mirando.

En usados cada unidad es única. Una fila con dos colores son dos equipos, no uno
de color ambiguo. Se separan.

La primera conserva la ref original para no romper links ya publicados; las
demás reciben sufijo -2, -3. El log queda en data/expansion-colores.json para
poder reaplicar tras cada sincronización y para poder revertir.

Uso:
    python3 scripts/expandir-colores.py            # aplica
    python3 scripts/expandir-colores.py --ver      # solo muestra, no escribe
"""
import os as _os, sys as _sys
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))

import json, re, shutil, unicodedata

CATALOGO = "data/catalogo.json"
LOG = "data/expansion-colores.json"
DIR_PROD = "public/productos"
DIR_MAESTRAS = "public/maestras"
EXT = (".webp", ".jpg", ".jpeg", ".png")

SOLO_VER = "--ver" in _sys.argv


def slug(t: str) -> str:
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")


def foto_para(modelo_slug: str, color: str) -> str | None:
    """Busca una maestra específica de ese color: iphone-13-azul.webp"""
    objetivo = f"{modelo_slug}-{slug(color)}"
    for carpeta in (DIR_MAESTRAS, DIR_PROD):
        if not _os.path.isdir(carpeta):
            continue
        for a in _os.listdir(carpeta):
            base, ext = _os.path.splitext(a)
            if ext.lower() in EXT and base.lower() == objetivo:
                return _os.path.join(carpeta, a)
    return None


def renombrar(nombre: str, color: str) -> str:
    """Mete el color en el nombre, antes del guion de estado si lo hay."""
    if " — " in nombre:
        cuerpo, estado = nombre.split(" — ", 1)
        return f"{cuerpo} {color} — {estado}"
    return f"{nombre} {color}"


def main():
    catalogo = json.load(open(CATALOGO, encoding="utf-8"))
    salida, log, sin_foto = [], [], []

    for u in catalogo:
        colores = u.get("colores") or []
        if len(colores) < 2:
            salida.append(u)
            continue

        refs = []
        for i, color in enumerate(colores):
            nueva = dict(u)
            nueva["ref"] = u["ref"] if i == 0 else f"{u['ref']}-{i + 1}"
            nueva["color"] = color
            nueva["colores"] = None
            nueva["nombre"] = renombrar(u.get("nombre") or u["modelo"], color)
            nueva["nombreCompleto"] = renombrar(
                u.get("nombreCompleto") or u["modelo"], color
            )
            nueva["expandidaDe"] = u["ref"]

            # Cada unidad necesita su propia foto del color correcto. Si existe
            # maestra de ese color se copia; si no, se marca y se resuelve desde
            # /admin/fotos. Nunca se reusa la foto de otro color: mostrar un
            # equipo azul en la ficha del naranja es exactamente el problema que
            # este script viene a arreglar.
            destino = _os.path.join(DIR_PROD, f"{nueva['ref']}.webp")
            origen = foto_para(u.get("modeloSlug", ""), color)
            if origen and not SOLO_VER:
                shutil.copyfile(origen, destino)
            elif not origen and not _os.path.exists(destino):
                faltantes = list(nueva.get("faltantes") or [])
                if "sin fotografía propia" not in faltantes:
                    faltantes.append("sin fotografía propia")
                nueva["faltantes"] = faltantes
                sin_foto.append(f"{nueva['ref']}  {nueva['nombreCompleto']}")

            refs.append(nueva["ref"])
            salida.append(nueva)

        log.append({"ref": u["ref"], "colores": colores, "generadas": refs})

    print(f"unidades antes: {len(catalogo)}")
    print(f"unidades despues: {len(salida)}")
    print(f"filas expandidas: {len(log)}")
    if sin_foto:
        print(f"\nnuevas sin foto ({len(sin_foto)}) — cargar en /admin/fotos:")
        for l in sin_foto:
            print("  " + l)

    if SOLO_VER:
        print("\n(--ver: no se escribio nada)")
        return

    shutil.copyfile(CATALOGO, CATALOGO.replace(".json", ".backup.json"))
    json.dump(salida, open(CATALOGO, "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    json.dump(log, open(LOG, "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print(f"\nlisto. backup en {CATALOGO.replace('.json', '.backup.json')}")


if __name__ == "__main__":
    main()
