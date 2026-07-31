#!/usr/bin/env python3
"""
Importador de la lista de precios recibida (formato IPHONES AS) -> catalogo.json

Decisiones aplicadas y por qué:
- La columna DOLARES se trata como COSTO, no como precio de venta. El precio se calcula
  con margen configurable. Si el margen es 0 el catálogo replica la lista tal cual.
- Batería en rango ("71 74") = varias unidades. Se toma el VALOR MENOR: declarar el peor
  número es la única opción compatible con el Doc 00.
- Varios colores en una fila = varias unidades del mismo modelo. Se importa como grupo
  y se marca para desglose por unidad en V2 (IMEI).
- Todo texto en DETALLE es un defecto declarado. Se publica visible, nunca se oculta.
"""
import csv, json, re, sys
from datetime import date

TC = 1520          # cotización de la propia planilla
MARGEN = 0.15      # margen propio sobre costo de proveedor · un solo numero para cambiarlo

def grado(bat, defecto):
    if bat is None:
        return "nuevo_sellado", "Nuevo sellado"
    if bat >= 85 and not defecto:
        return "seleccionado_a", "Seleccionado A"
    if bat >= 80:
        return "seleccionado_b", "Seleccionado B"
    return "seleccionado_c", "Seleccionado C"   # 70-79% · pendiente ADR-001

def main():
    filas = list(csv.DictReader(open("datos/lista-origen.csv", encoding="utf-8")))
    catalogo, reporte, ref = [], [], 100
    hoy = date.today().isoformat()

    for i, f in enumerate(filas, start=2):
        modelo_crudo = f["modelo"].strip()
        seccion = f["seccion"]

        # batería: rango -> menor valor
        bats = re.findall(r"\d+", f["bateria"] or "")
        if len(bats) > 1:
            bateria = min(int(b) for b in bats)
            reporte.append(f"Fila {i}: batería en rango «{f['bateria']}» -> se declara {bateria}% (el menor).")
        elif bats:
            bateria = int(bats[0])
        else:
            bateria = None

        defecto = (f["detalle"] or "").strip().lower()
        defecto = "" if defecto in ("semi nuevo", "usado") else defecto

        # nombre canónico
        if seccion == "usados" or seccion == "sellado":
            marca, categoria, arquetipo = "Apple", "iPhone", "telefono"
            t = modelo_crudo.replace("se2", "SE 2").replace("16e", "16e")
            t = " ".join(w if w in ("16e",) else w.capitalize() for w in t.split())
            t = t.replace("Se 2", "SE 2").replace("16E", "16e")
            nombre_modelo = "iPhone " + t
        elif seccion == "watch":
            marca, categoria, arquetipo = "Apple", "Apple Watch", "reloj"
            nombre_modelo = modelo_crudo
        else:
            marca, categoria, arquetipo = "Sony", "Accesorios", "accesorio"
            nombre_modelo = modelo_crudo

        if seccion == "sellado":
            bateria, estado, etiqueta = None, "nuevo_sellado", "Nuevo sellado"
        else:
            estado, etiqueta = grado(bateria, defecto)

        gb = int(f["gb"]) if f["gb"].strip().isdigit() else None
        colores = [c.strip().title() for c in (f["color"] or "").split() if c.strip()]
        multi = len(colores) > 1
        if multi:
            reporte.append(f"Fila {i}: {len(colores)} colores en una fila ({f['color']}) = varias unidades. Agrupadas.")

        costo_c = int(round(float(f["usd"]) * 100))
        precio_c = int(round(costo_c * TC * (1 + MARGEN)))

        if bateria is not None and bateria < 80:
            reporte.append(f"Fila {i}: batería {bateria}% — por debajo del piso del Doc 00. Grado C (ADR-001).")
        if defecto:
            reporte.append(f"Fila {i}: defecto declarado «{defecto}». Se publica visible.")

        ref += 1
        nombre = " ".join(x for x in [nombre_modelo, f"{gb} GB" if gb else "", colores[0] if len(colores) == 1 else ""] if x)

        import unicodedata as _u
        slug = _u.normalize("NFD", nombre_modelo.lower())
        slug = "".join(ch for ch in slug if _u.category(ch) != "Mn")
        slug = re.sub(r"[^a-z0-9]+", "-", slug).strip("-")

        catalogo.append({
            "ref": f"A{ref}",
            "modelo": nombre_modelo,
            "modeloSlug": slug,
            "nombre": nombre,
            "modeloBase": nombre_modelo,
            "slug": re.sub(r"[^a-z0-9]+", "-", nombre_modelo.lower()).strip("-"),
            "nombreCompleto": f"{nombre} — {etiqueta}",
            "marca": marca, "categoria": categoria, "arquetipo": arquetipo,
            "capacidadGb": gb,
            "color": colores[0] if len(colores) == 1 else None,
            "colores": colores if multi else None,
            "estado": estado, "estadoEtiqueta": etiqueta,
            "bateria": bateria,
            # Nota de la planilla (fila 4): "EQUIPOS AL 100% consultar batería cambiada".
            # Una batería al 100% en un usado suele significar reemplazo. Se declara.
            "bateriaPosibleReemplazo": bool(bateria == 100 and estado != "nuevo_sellado"),
            "defecto": defecto or None,
            "costoCentavos": costo_c,
            "precioCentavos": precio_c,
            "origen": "proveedor",
            "disponibilidad": "por_encargo",
            "publicado": True,
            "actualizado": hoy,
        })

    json.dump(catalogo, open("catalogo.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    bajo80 = [p for p in catalogo if p["bateria"] and p["bateria"] < 80]
    condef = [p for p in catalogo if p["defecto"]]
    grupos = [p for p in catalogo if p["colores"]]
    resumen = ["", "=" * 56,
        f"Filas procesadas:              {len(filas)}",
        f"Productos en catálogo:         {len(catalogo)}",
        f"Unidades agrupadas por color:  {len(grupos)} filas",
        f"Batería por debajo de 80%:     {len(bajo80)}  <- conflicto con Doc 00",
        f"Con defecto declarado:         {len(condef)}",
        f"Tipo de cambio aplicado:       ${TC}  ·  margen {MARGEN*100:.0f}%",
    ]
    open("reporte-importacion.txt", "w", encoding="utf-8").write("\n".join(reporte + resumen))
    print("\n".join(resumen))

if __name__ == "__main__":
    main()
