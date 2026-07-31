#!/usr/bin/env python3
"""
Importador de la planilla completa · iPhone Connection

La planilla tiene 18 secciones, cada una con su propio encabezado y su propio orden
de columnas. En vez de escribir un parser por sección, se detecta el encabezado de
cada bloque y se mapean las columnas por NOMBRE. Agregar una sección nueva a la
planilla no requiere tocar este script.

Reglas (Doc 00 + ADR-001):
- Sin precio en dólares no se importa: no publicamos lo que no podemos cotizar.
- Batería en rango ("71 74") -> se declara el valor MENOR.
- Batería 100% en usado -> se marca posible reemplazo (nota de la fila 4).
- Los detalles declarados se publican.
- Las columnas de cuotas se ignoran: hoy no se ofrece financiación.
"""
import csv, json, re, unicodedata
from datetime import date

ORIGEN = "datos/lista-completa.csv"
TC_PLANILLA = 1520
MARGEN = 0.15

# sección de la planilla -> (categoría, arquetipo, marca por defecto)
SECCIONES = {
    "SELECCION USADOS":        ("iPhone", "telefono", "Apple"),
    "IPHONES NUEVOS SELLADOS": ("iPhone", "telefono", "Apple"),
    "MACBOOK":                 ("Mac", "notebook", "Apple"),
    "IPAD":                    ("iPad", "tablet", "Apple"),
    "AIRPODS":                 ("AirPods", "auriculares-in", "Apple"),
    "APPLE WATCH":             ("Apple Watch", "reloj", "Apple"),
    "relojes":                 ("Relojes", "reloj", None),
    "SAMSUNG":                 ("Android", "telefono", "Samsung"),
    "XIAOMI":                  ("Android", "telefono", "Xiaomi"),
    "MOTOROLA":                ("Android", "telefono", "Motorola"),
    "NOTEBOOKS":               ("Notebooks", "notebook", None),
    "CONSOLAS":                ("Consolas", "consola", None),
    "JBL":                     ("Audio", "auriculares-over", "JBL"),
    "ACCESORIOS":              ("Accesorios", "accesorio", None),
    "TERMO":                   ("Accesorios", "accesorio", "Stanley"),
    "CAMARA":                  ("Cámaras", "accesorio", None),
    "TABLET":                  ("Tablets", "tablet", None),
}

ENCABEZADOS = {
    "modelo": ["modelo", "accesorio"],
    "capacidad": ["gb", "mm"],
    "bateria": ["bateria"],
    "color": ["color"],
    "usd": ["dolares", "precio usd"],
    "detalle": ["detalle"],
}

MARCAS_TEXTO = {
    "amazfit": "Amazfit", "garmin": "Garmin", "samsung": "Samsung", "xiaomi": "Xiaomi",
    "poco": "POCO", "redmi": "Xiaomi", "motorola": "Motorola", "moto ": "Motorola",
    "lenovo": "Lenovo", "dell": "Dell", "asus": "Asus", "jbl": "JBL", "sony": "Sony",
    "nintendo": "Nintendo", "ps5": "Sony", "ps4": "Sony", "go pro": "GoPro",
    "stanley": "Stanley", "x view": "X View", "apple": "Apple", "anker": "Anker",
}

ETIQUETA_ESTADO = {
    "nuevo_sellado": "Nuevo sellado", "seleccionado_a": "Seleccionado A",
    "seleccionado_b": "Seleccionado B", "seleccionado_c": "Seleccionado C",
}


def limpio(s):
    return re.sub(r"\s+", " ", str(s or "")).strip()


def slugify(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:60]


def a_usd(txt):
    t = re.sub(r"[^\d.,]", "", str(txt or ""))
    if not t:
        return None
    t = t.replace(",", "")
    try:
        v = float(t)
    except ValueError:
        return None
    return v if v > 0 else None


def grado(bat, defecto):
    if bat is None:
        return "nuevo_sellado"
    if bat >= 85 and not defecto:
        return "seleccionado_a"
    if bat >= 80:
        return "seleccionado_b"
    return "seleccionado_c"


def detectar_marca(texto, defecto):
    t = texto.lower()
    for k, v in MARCAS_TEXTO.items():
        if k in t:
            return v
    return defecto or "Sin marca"


def main():
    filas = list(csv.reader(open(ORIGEN, encoding="utf-8-sig")))
    seccion, mapa, ancla = None, None, None
    catalogo, reporte, ref = [], [], 100
    hoy = date.today().isoformat()
    saltados = 0

    for n, fila in enumerate(filas, start=1):
        c = [limpio(x) for x in fila]
        if not any(c):
            continue

        # ¿inicia una sección?
        titulo = next((k for k in SECCIONES if c[0].upper().startswith(k.upper())), None)
        if titulo and not any(c[1:8]):
            seccion, mapa, ancla = titulo, None, None
            continue

        if not seccion:
            continue

        # ¿es la fila de encabezados de esta sección?
        bajos = [x.lower() for x in c]
        if any(h in bajos for h in ("modelo", "accesorio")):
            mapa = {}
            for i, h in enumerate(bajos):
                for campo, alias in ENCABEZADOS.items():
                    if h in alias and campo not in mapa:
                        mapa[campo] = i
            continue

        if not mapa:
            continue

        def col(campo):
            i = mapa.get(campo)
            return c[i] if i is not None and i < len(c) else ""

        modelo = col("modelo")
        # fila de continuación: hereda el modelo anterior (ej. iPad con dos capacidades)
        if not modelo and ancla and (col("capacidad") or col("usd")):
            modelo = ancla
        if not modelo:
            continue
        ancla = modelo

        usd = a_usd(col("usd"))
        if usd is None:
            saltados += 1
            reporte.append(f"Fila {n}: «{modelo}» sin precio en dólares. No se importa.")
            continue

        categoria, arquetipo, marca_def = SECCIONES[seccion]

        # correcciones puntuales de categoría por contenido
        low = modelo.lower()
        ACCESORIO_PROPIO = ("airtag", "malla", "pencil", "pencul", "teclado", "joystick",
                            "volante", "cable", "cargador", "wallet", "battery pack", "mouse")
        # "PS5 LECTORA 1TB 1 JOYSTICK" es una consola, no un joystick: el accesorio
        # solo manda cuando encabeza el nombre.
        if any(low.startswith(k) for k in ACCESORIO_PROPIO) or low.startswith("auriculares"):
            if not low.startswith("auriculares"):
                categoria, arquetipo = "Accesorios", "accesorio"

        bats = re.findall(r"\d+", col("bateria"))
        if len(bats) > 1:
            bateria = min(int(b) for b in bats)
            reporte.append(f"Fila {n}: batería en rango «{col('bateria')}» -> se declara {bateria}%.")
        elif bats:
            bateria = int(bats[0])
        else:
            bateria = None

        detalle = col("detalle").lower()
        detalle = "" if detalle in ("semi nuevos", "usado") else detalle
        estado = grado(bateria, detalle) if seccion == "SELECCION USADOS" else "nuevo_sellado"
        if estado == "nuevo_sellado":
            bateria = None

        cap_txt = col("capacidad")
        m = re.search(r"(\d+)\s*(tb|gb|mm)?", cap_txt.lower())
        capacidad = None
        if m:
            v = int(m.group(1))
            u = m.group(2) or ""
            capacidad = v * 1024 if u == "tb" else (None if u == "mm" else v)

        colores = [x.strip().title() for x in col("color").split() if x.strip()]
        colores = [x for x in colores if x.lower() not in ("consultar", "o")]

        # nombre visible
        PREFIJO = {"iPhone": "iPhone", "Apple Watch": "Apple Watch", "iPad": "iPad"}
        pref = PREFIJO.get(categoria)
        base = f"{pref} {modelo}" if pref and not modelo.lower().startswith(pref.lower()) else modelo
        base = re.sub(r"(?i)^(iphone|ipad|apple watch)\s+\1", r"\1", base)
        base = re.sub(r"(?i)\bse(\d)\b", r"SE \1", base)
        base = re.sub(r"(?i)\bserie\b", "Serie", base)
        base = re.sub(r"(?i)\bultra\b", "Ultra", base)
        base = re.sub(r"(?i)\b11th\b", "11", base)
        base = re.sub(r"(?i)\bnew air\b", "Air", base)
        base = re.sub(r"(?i)\bpencul\b", "Pencil", base)
        base = re.sub(r"(?i)\+ cell\b", "+ Cellular", base)
        # capitalización consistente (Doc 00 §7.4)
        MENOR = {"pro", "max", "mini", "plus", "air", "ultra", "e"}
        base = " ".join(
            w.capitalize() if w.lower() in MENOR else w
            for w in base.split()
        )
        base = base.replace("Iphone", "iPhone").replace("Ipad", "iPad")
        # la medida del Watch va en el nombre, no en capacidad
        if categoria == "Apple Watch" and cap_txt:
            base = f"{base} {cap_txt.lower().replace(' ', '')}"
        nombre = " ".join(
            x for x in [base,
                        f"{capacidad} GB" if capacidad and capacidad < 1024 else (f"{capacidad // 1024} TB" if capacidad else ""),
                        colores[0] if len(colores) == 1 else ""]
            if x
        )

        ref += 1
        costo_c = int(round(usd * 100))
        catalogo.append({
            "ref": f"A{ref}",
            "modelo": base,
            "modeloSlug": slugify(base),
            "nombre": nombre,
            "nombreCompleto": f"{nombre} — {ETIQUETA_ESTADO[estado]}",
            "marca": detectar_marca(modelo, marca_def),
            "categoria": categoria,
            "arquetipo": arquetipo,
            "capacidadGb": capacidad,
            "color": colores[0] if len(colores) == 1 else None,
            "colores": colores if len(colores) > 1 else None,
            "estado": estado,
            "estadoEtiqueta": ETIQUETA_ESTADO[estado],
            "bateria": bateria,
            "bateriaPosibleReemplazo": bool(bateria == 100 and estado != "nuevo_sellado"),
            "defecto": detalle or None,
            "costoCentavos": costo_c,
            "precioCentavos": int(round(costo_c * TC_PLANILLA * (1 + MARGEN))),
            "origen": "proveedor",
            "disponibilidad": "por_encargo",
            "publicado": True,
            "actualizado": hoy,
        })

    json.dump(catalogo, open("data/catalogo.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    import collections
    cat = collections.Counter(p["categoria"] for p in catalogo)
    resumen = ["", "=" * 58,
               f"Productos importados:      {len(catalogo)}",
               f"Sin precio (no importados): {saltados}", ""]
    for k, v in cat.most_common():
        resumen.append(f"  {k:<14} {v}")
    open("reporte-importacion.txt", "w", encoding="utf-8").write("\n".join(reporte + resumen))
    print("\n".join(resumen))


if __name__ == "__main__":
    main()
