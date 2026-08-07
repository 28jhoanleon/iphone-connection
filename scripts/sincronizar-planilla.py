#!/usr/bin/env python3
"""
Sincronización del catálogo con la planilla publicada.

Descarga el CSV, lo procesa con el importador de siempre y compara el resultado
contra el catálogo vigente. NO publica nada: deja los cambios propuestos en
data/cambios-pendientes.json para que se aprueben desde /admin/sincronizar.

Ese paso intermedio existe porque la planilla es del proveedor: un error de
tipeo suyo llegaría publicado en minutos si la web leyera directo. El importador
ya frena categorías equivocadas, precios en cero y usados sin batería; la
aprobación frena lo que ninguna validación puede prever.

    python3 scripts/sincronizar-planilla.py            # ver cambios
    python3 scripts/sincronizar-planilla.py --aplicar  # aplicarlos
"""
import os as _os, sys as _sys
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))

import json, os, ssl, subprocess, urllib.request, urllib.error
from datetime import datetime

CONFIG = "data/sincronizacion.json"
ORIGEN = "datos/lista-completa.csv"
PENDIENTES = "data/cambios-pendientes.json"
CATALOGO = "data/catalogo.json"

# Si la planilla devuelve muchas menos filas que la última vez, algo se rompió
# del lado del proveedor. No se toca el catálogo: es preferible quedarse con
# datos viejos antes que vaciarlo.
CAIDA_MAXIMA = 0.35


def cargar_config() -> dict:
    if not os.path.exists(CONFIG):
        print(f"Falta {CONFIG}. Crealo con la URL de la planilla publicada.")
        raise SystemExit(1)
    return json.load(open(CONFIG, encoding="utf-8"))


def descargar(url: str) -> str | None:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60, context=ssl.create_default_context()) as r:
            if r.status != 200:
                print(f"  La planilla respondió HTTP {r.status}")
                return None
            return r.read().decode("utf-8-sig", errors="replace")
    except urllib.error.HTTPError as e:
        print(f"  La planilla respondió HTTP {e.code}. ¿Sigue publicada?")
    except Exception as e:
        print(f"  No se pudo leer la planilla: {type(e).__name__}")
    return None


def indexar(productos: list) -> dict:
    return {p["ref"]: p for p in productos}


def comparar(viejo: list, nuevo: list) -> dict:
    a, b = indexar(viejo), indexar(nuevo)
    # la referencia se asigna por orden, así que para comparar se usa la
    # identidad real del producto: modelo + capacidad + color + estado
    def clave(p):
        # La batería NO forma parte de la identidad: es un atributo que varía
        # entre lecturas. Incluirla hacía que el mismo producto figurara como
        # uno nuevo y otro dado de baja en cada sincronización.
        return (p["modelo"], p.get("capacidadGb"), p.get("color"), p["estado"])

    ka = {clave(p): p for p in viejo}
    kb = {clave(p): p for p in nuevo}

    precios, nuevos, salidos, otros = [], [], [], []

    for k, p in kb.items():
        if k not in ka:
            nuevos.append({"nombre": p["nombreCompleto"], "precio": p["precioCentavos"],
                           "categoria": p["categoria"]})
            continue
        v = ka[k]
        if v["precioCentavos"] != p["precioCentavos"]:
            precios.append({
                "nombre": p["nombreCompleto"],
                "antes": v["precioCentavos"], "despues": p["precioCentavos"],
                "variacion": round((p["precioCentavos"] / max(v["precioCentavos"], 1) - 1) * 100, 1),
            })
        if v.get("bateria") != p.get("bateria"):
            otros.append({"nombre": p["nombreCompleto"], "campo": "batería",
                          "detalle": f'{v.get("bateria")}% → {p.get("bateria")}%'})
        if v.get("defecto") != p.get("defecto"):
            otros.append({"nombre": p["nombreCompleto"], "campo": "detalle declarado"})
        if v["disponibilidad"] != p["disponibilidad"]:
            otros.append({"nombre": p["nombreCompleto"], "campo": "disponibilidad"})

    for k, p in ka.items():
        if k not in kb:
            salidos.append({"nombre": p["nombreCompleto"], "ref": p["ref"]})

    return {"precios": precios, "nuevos": nuevos, "salidos": salidos, "otros": otros}


def main() -> None:
    cfg = cargar_config()
    aplicar = "--aplicar" in _sys.argv

    print(f"Leyendo la planilla…")
    csv = descargar(cfg["url"])
    if csv is None:
        raise SystemExit(1)

    filas = [l for l in csv.splitlines() if l.strip(",; \t")]
    print(f"  {len(filas)} filas recibidas")

    previas = cfg.get("filas_ultima_sync")
    if previas and len(filas) < previas * (1 - CAIDA_MAXIMA):
        print(f"\n  La planilla pasó de {previas} a {len(filas)} filas.")
        print("  No se aplica nada: puede que el proveedor la haya movido o despublicado.")
        raise SystemExit(1)

    catalogo_actual = json.load(open(CATALOGO, encoding="utf-8"))
    respaldo = f"data/catalogo.backup.json"
    json.dump(catalogo_actual, open(respaldo, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    os.makedirs(os.path.dirname(ORIGEN), exist_ok=True)
    open(ORIGEN, "w", encoding="utf-8").write(csv)

    print("Procesando con el importador…")
    r = subprocess.run([_sys.executable, "scripts/importar-planilla.py"],
                       capture_output=True, text=True)
    if r.returncode != 0:
        print("  El importador falló. No se cambió nada.")
        print(r.stderr[-600:])
        json.dump(catalogo_actual, open(CATALOGO, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        raise SystemExit(1)

    catalogo_nuevo = json.load(open(CATALOGO, encoding="utf-8"))
    cambios = comparar(catalogo_actual, catalogo_nuevo)

    # el importador ya escribió el catálogo nuevo; se revierte hasta aprobar
    if not aplicar:
        json.dump(catalogo_actual, open(CATALOGO, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    resumen = {
        "fecha": datetime.now().isoformat(timespec="minutes"),
        "filas": len(filas),
        "totales": {k: len(v) for k, v in cambios.items()},
        **cambios,
    }
    json.dump(resumen, open(PENDIENTES, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    print(f"\n  Precios modificados : {len(cambios['precios'])}")
    print(f"  Productos nuevos    : {len(cambios['nuevos'])}")
    print(f"  Productos que salen : {len(cambios['salidos'])}")
    print(f"  Otros cambios       : {len(cambios['otros'])}")

    for c in cambios["precios"][:6]:
        signo = "+" if c["variacion"] > 0 else ""
        print(f"    {c['nombre'][:40]:<40} {c['antes']//100:>9,} → {c['despues']//100:>9,}  {signo}{c['variacion']}%")
    if len(cambios["precios"]) > 6:
        print(f"    … y {len(cambios['precios']) - 6} más")

    if aplicar:
        cfg["filas_ultima_sync"] = len(filas)
        cfg["ultima_sync"] = resumen["fecha"]
        json.dump(cfg, open(CONFIG, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        for s in ("generar-productos.py", "imagenes-maestras.py"):
            if os.path.exists(f"scripts/{s}"):
                subprocess.run([_sys.executable, f"scripts/{s}"], capture_output=True)
        subprocess.run([_sys.executable, "scripts/auditar-imagenes.py", "--borrar"], capture_output=True)
        subprocess.run([_sys.executable, "scripts/generar-indice.py"], capture_output=True)
        subprocess.run([_sys.executable, "scripts/auditar-catalogo.py"])
        print("\n  Cambios aplicados. Revisá /admin/sincronizar y hacé commit.")
    else:
        print(f"\n  Nada se aplicó todavía. Revisalos en /admin/sincronizar")
        print("  Para aplicarlos:  python3 scripts/sincronizar-planilla.py --aplicar")


if __name__ == "__main__":
    main()
