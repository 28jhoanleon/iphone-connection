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
import os as _os, sys as _sys
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))
_os.makedirs("reportes", exist_ok=True)

import csv, json, re, sys, unicodedata
from datetime import date
sys.path.insert(0, "scripts")
from normalizar import (CATEGORIA_FINAL, ORDEN_CATEGORIA, normalizar_colores,
                        detectar_marca, limpiar_nombre, separar_modelo, es_replica)

ORIGEN = "datos/lista-completa.csv"
# El tipo de cambio y el margen viven en data/precios.json, no acá. Tenerlos
# escritos en el script hacía que cambiarlos en el JSON no tuviera efecto.
_cfg = json.load(open("data/precios.json", encoding="utf-8"))
_cfg = json.load(open("data/precios.json", encoding="utf-8"))
TC_PLANILLA = _cfg["tcRespaldo"]
MARGEN_CAT = _cfg.get("margenPorCategoria", {})
MARGEN_MODELO = _cfg.get("margenPorModelo", {})
MARGEN_DEFECTO = _cfg.get("margenPorDefecto", 50)


def margen_usd(categoria, modelo):
    """Monto fijo en dólares. El modelo tiene prioridad sobre la categoría."""
    for clave, usd in MARGEN_MODELO.items():
        if clave.lower() in str(modelo).lower():
            return usd
    return MARGEN_CAT.get(categoria, MARGEN_DEFECTO)

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
    "CAMARA":                  ("Accesorios", "camara", None),   # 1 solo producto: no justifica categoría propia
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

MENUDAS = {"para", "de", "del", "con", "y", "a", "en", "por"}

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
    """
    Precio en dólares desde el texto de la planilla.

    El punto es separador de MILES, no decimal: "$1.150" son mil ciento
    cincuenta dólares, no uno con quince. Interpretarlo al revés hacía que todo
    lo que costara más de mil se guardara mil veces más barato.
    """
    t = re.sub(r"[^\d.,]", "", str(txt or ""))
    if not t:
        return None
    if "," in t and "." in t:
        # el último separador que aparece es el decimal
        if t.rfind(",") > t.rfind("."):
            t = t.replace(".", "").replace(",", ".")
        else:
            t = t.replace(",", "")
    elif "," in t:
        # coma decimal sólo si deja uno o dos dígitos: "1,50" es decimal, "1,150" son miles
        t = t.replace(",", ".") if len(t.split(",")[-1]) <= 2 else t.replace(",", "")
    elif t.count(".") >= 1:
        # punto de miles si deja exactamente tres dígitos: "1.150" son miles
        if len(t.split(".")[-1]) == 3:
            t = t.replace(".", "")
    try:
        v = float(t)
    except ValueError:
        return None
    return v if v > 0 else None


# Los defectos vienen escritos a mano en la planilla, con abreviaturas y erratas.
# Se normalizan a texto correcto: aparecen publicados en la ficha del producto.
CORRECCIONES_DEFECTO = [
    (r"(?i)\bdetale\b", "detalle"),
    (r"(?i)^pixell?$", "Píxel muerto en pantalla"),
    (r"(?i)\bpixell?\b", "píxel"),
    (r"(?i)\bdet\b", "detalle"),
    (r"(?i)\bmin\.?\s+pantalla\b", "mínimo en pantalla"),
    (r"(?i)\bmin\.?\s+tapa\b", "mínimo en tapa"),
    (r"(?i)\bmin\.?\b", "mínimo"),
    (r"(?i)\bface id\b", "Face ID"),
    (r"(?i)\bvidrio camara\b", "vidrio de cámara"),
    (r"(?i)\bcamara\b", "cámara"),
    (r"(?i)\bpantalla y otro en tapa\b", "pantalla"),
    (r"(?i)\by otro con\b", "·"),
]


def normalizar_defecto(txt: str) -> str:
    t = limpio(txt)
    if not t or t.lower() in ("semi nuevos", "semi nuevo", "usado", "usados"):
        return ""
    for pat, rep in CORRECCIONES_DEFECTO:
        t = re.sub(pat, rep, t)
    t = re.sub(r"\s{2,}", " ", t).replace("mínimo.", "mínimo").strip(" ·-.")
    return t[0].upper() + t[1:] if t else ""


def grado(bat, defecto):
    if bat is None:
        return "nuevo_sellado"
    if bat >= 85 and not defecto:
        return "seleccionado_a"
    if bat >= 80:
        return "seleccionado_b"
    return "seleccionado_c"


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
        # En varias filas la planilla corre las columnas cuando falta la
        # batería, y el precio en dólares termina en la celda del color. Se
        # busca el valor por su FORMA (empieza con $ y no es un precio en
        # pesos de seis cifras) en lugar de confiar en la posición.
        if usd is None:
            # Sólo se rescata cuando la celda propia vino vacía, nunca para
            # "corregir" un valor existente. Y se descartan los precios en
            # pesos: en la planilla conviven ambos, y un cargador de USD 8
            # aparece como $12.900 en la columna de al lado.
            for celda in c[:8]:
                t = celda.strip()
                if not t.startswith("$"):
                    continue
                v = a_usd(t)
                # un precio en pesos tiene separador de miles y supera los 20.000
                if v and 3 <= v <= 20000 and not (v > 3000 and "." in t):
                    usd = v
                    reporte.append(f"Fila {n}: precio USD tomado de otra columna (columnas corridas).")
                    break
        if usd is None:
            saltados += 1
            reporte.append(f"Fila {n}: «{modelo}» sin precio en dólares. No se importa.")
            continue

        categoria, arquetipo, marca_def = SECCIONES[seccion]

        low = modelo.lower()
        # Productos que no pertenecen a la sección donde los puso el proveedor.
        # Un robot aspirador dentro de la hoja de tablets no es una tablet.
        FUERA_DE_SECCION = {
            "aspirador": ("Hogar", "accesorio"),
            "aspiradora": ("Hogar", "accesorio"),
            "robot": ("Hogar", "accesorio"),
            "purificador": ("Hogar", "accesorio"),
            "balanza": ("Hogar", "accesorio"),
        }
        for pista, (cat_h, arq_h) in FUERA_DE_SECCION.items():
            if pista in modelo.lower():
                categoria, arquetipo = cat_h, arq_h
                es_ajeno = True
                reporte.append(f"Fila {n}: «{modelo}» reclasificado a {cat_h}.")
                break

        ACCESORIO_PROPIO = ("airtag", "malla", "pencil", "pencul", "teclado", "joystick",
                            "volante", "cable", "cargador", "wallet", "battery pack", "mouse")
        if any(low.startswith(k) for k in ACCESORIO_PROPIO):
            categoria, arquetipo = "Accesorios", "accesorio"

        # réplicas fuera del catálogo
        if es_replica(modelo):
            saltados += 1
            reporte.append(f"Fila {n}: «{modelo}» es réplica (AAA). No se importa.")
            continue

        bats = re.findall(r"\d+", col("bateria"))
        if len(bats) > 1:
            bateria = min(int(b) for b in bats)
            reporte.append(f"Fila {n}: batería en rango «{col('bateria')}» -> se declara {bateria}%.")
        elif bats:
            bateria = int(bats[0])
        else:
            bateria = None

        detalle = normalizar_defecto(col("detalle"))
        # Un usado sin batería declarada no se puede publicar (Doc 00 §7.3).
        sin_bateria = seccion == "SELECCION USADOS" and bateria is None
        if sin_bateria:
            reporte.append(f"Fila {n}: «{modelo}» es usado y no declara batería. Queda en borrador.")
        estado = grado(bateria, detalle) if seccion == "SELECCION USADOS" else "nuevo_sellado"
        if estado == "nuevo_sellado":
            bateria = None

        cap_txt = col("capacidad")
        m = re.search(r"(\d+)\s*(tb|gb|mm)?", cap_txt.lower())
        capacidad, medida_mm = None, None
        if m:
            v, u = int(m.group(1)), (m.group(2) or "")
            if u == "mm":
                medida_mm = v
            else:
                capacidad = v * 1024 if u == "tb" else v
        # capacidad escrita dentro del nombre (ej. "8/256gb")
        if capacidad is None:
            m2 = re.search(r"(?i)(\d+)\s*/\s*(\d+)\s*(gb|tb)", modelo)
            if m2:
                capacidad = int(m2.group(2)) * (1024 if m2.group(3).lower() == "tb" else 1)

        # --- Correcciones de auditoría (30/07/2026) -----------------------
        # Productos que aparecen dentro de una sección pero NO son de esa familia:
        # un joystick listado bajo iPhone no es un iPhone.
        NO_ES_DE_LA_SECCION = ("jostick", "joystick", "volante", "airtag", "malla",
                               "pencil", "pencul", "teclado", "mouse", "cable",
                               "cargador", "wallet", "battery pack", "funda", "vidrio")
        es_ajeno = any(k in modelo.lower() for k in NO_ES_DE_LA_SECCION)

        # La sección de usados no es sólo Apple: hay un Galaxy S22 suelto adentro.
        # Si el nombre trae marca ajena, manda la marca y no la sección.
        AJENAS = {"galaxy": "Android", "samsung": "Android", "xiaomi": "Android",
                  "redmi": "Android", "poco": "Android", "moto": "Android",
                  "motorola": "Android", "realme": "Android", "infinix": "Android"}
        if seccion in ("SELECCION USADOS", "IPHONES NUEVOS SELLADOS"):
            # Filas 83-84: hay Apple Watch sueltos en la sección de iPhone.
            # Se reconocen por la medida en milímetros y por el nombre de la línea.
            es_reloj = bool(re.search(r"\d+\s*mm", " ".join(c).lower())) or \
                re.match(r"(?i)^(serie|ultra|se ?\d)\b", modelo.strip())
            if es_reloj:
                categoria, arquetipo = "Relojes", "reloj"
                marca_def = "Apple"
                modelo = f"Apple Watch {modelo}"
                es_ajeno = True
                reporte.append(f"Fila {n}: «{modelo}» estaba en la sección de iPhone pero es un Apple Watch. Reclasificado.")
            cat_ajena = None if es_reloj else next((v for k, v in AJENAS.items() if k in modelo.lower()), None)
            if cat_ajena:
                categoria, arquetipo = cat_ajena, "telefono"
                es_ajeno = True
                reporte.append(f"Fila {n}: «{modelo}» estaba en la sección de iPhone pero es de otra marca. Reclasificado a {cat_ajena}.")

        # nombres comerciales correctos en lugar de la abreviatura del proveedor
        RENOMBRAR = [
            (r"(?i)^jostick ps5.*",        "Joystick PS5 DualSense"),
            (r"(?i)^joystick adicional",   "Joystick PS5 DualSense adicional"),
            (r"(?i)^volante ps5 logitech", "Volante Logitech para PS5"),
            (r"(?i)^airtag pack x1 gen 2", "AirTag Pack x1 (2ª generación)"),
            (r"(?i)^airtag pack x4",       "AirTag Pack x4"),
            (r"(?i)^airtag pack x1 aaa",   "AirTag Pack x1"),
            (r"(?i)^mallas? nike",         "Malla Nike para Apple Watch"),
            (r"(?i)^pencil 1$",            "Apple Pencil (1ª generación)"),
            (r"(?i)^pencil usbc",          "Apple Pencil (USB-C)"),
            (r"(?i)^pencul pro|^pencil pro", "Apple Pencil Pro"),
            (r"(?i)^auriculares bt x view xpods5", "X View XPods 5"),
            (r"(?i)^nintendo switch oled", "Nintendo Switch OLED 64 GB"),
            (r"(?i)^auriculares jbl tune 310", "JBL Tune 310 USB-C"),
            (r"(?i)^auriculares ultra pods economicos", "Auriculares inalámbricos"),
            (r"(?i)^teclado \+ mouse bluetooth", "Teclado y mouse Bluetooth"),
        ]
        for patron, reemplazo in RENOMBRAR:
            if re.match(patron, modelo.strip()):
                modelo = reemplazo
                break

        # recategorización por producto real, no por sección
        low2 = modelo.lower()
        if any(low2.startswith(k) for k in ("joystick", "volante", "airtag", "malla", "pencil",
                                            "apple pencil", "teclado", "cable", "cargador",
                                            "wallet", "battery pack")):
            categoria, arquetipo = "Accesorios", "accesorio"
        elif any(low2.startswith(k) for k in ("xpods", "x view xpods", "auriculares", "buds")):
            categoria, arquetipo = "Audio", "auriculares-in"

        marca = detectar_marca(modelo, categoria, marca_def)
        categoria = CATEGORIA_FINAL.get(categoria, categoria)
        PREFIJO_SECCION = {
            "SELECCION USADOS": "iPhone", "IPHONES NUEVOS SELLADOS": "iPhone",
            "APPLE WATCH": "Apple Watch", "IPAD": "iPad", "MACBOOK": "MacBook",
            "AIRPODS": "AirPods",
        }
        prefijo = None if es_ajeno else PREFIJO_SECCION.get(seccion)
        nombre_limpio = limpiar_nombre(modelo, marca, categoria, prefijo)
        # pulgadas siempre con el mismo signo: 13' / 13'' / 13 " -> 13"
        nombre_limpio = re.sub(r"(\d+(?:[.,]\d+)?)\s*(?:''|'|\u2033|\u2032)", r'\1"', nombre_limpio)
        # las specs largas de notebooks no van en el nombre
        m3 = re.match(r'(?i)^(Notebook [\w ]+?\d+[.,]?\d*")\s+(.*)$', nombre_limpio)
        cola = None
        if m3:
            nombre_limpio, cola = m3.group(1), m3.group(2).strip()

        modelo_base, config = separar_modelo(nombre_limpio)
        if cola:
            config = (config + " · " + cola).strip(" ·") if config else cola
        if medida_mm:
            modelo_base = f"{modelo_base} {medida_mm}mm"
        colores = normalizar_colores(col("color"))
        # La planilla mete el color en el modelo: "17 pro orange", "17 pro max blue".
        # El color es un atributo, no parte del nombre del modelo (Doc 00 §7.4).
        COLOR_EN_MODELO = {"orange": "Naranja", "blue": "Azul", "silver": "Plata",
                           "black": "Negro", "white": "Blanco", "gold": "Dorado",
                           "green": "Verde", "pink": "Rosa"}
        for ing, esp in COLOR_EN_MODELO.items():
            if re.search(rf"\b{ing}\b", modelo_base, flags=re.I):
                modelo_base = re.sub(rf"\s*\b{ing}\b", "", modelo_base, flags=re.I).strip()
                if not colores:
                    colores = [esp]
                break
        # línea "e" de Apple: siempre minúscula y pegada (16e, 17e)
        modelo_base = re.sub(r"(?i)\b(1[5-9])\s*e\b", r"\1e", modelo_base)

        cap_etq = ""
        if capacidad:
            cap_etq = f"{capacidad // 1024} TB" if capacidad >= 1024 and capacidad % 1024 == 0 else f"{capacidad} GB"
        def bajar_conectores(t: str) -> str:
            partes = t.split()
            return " ".join(
                w.lower() if i and w.lower() in MENUDAS else w for i, w in enumerate(partes)
            )

        modelo_base = bajar_conectores(modelo_base)

        # Notebooks y tablets: la configuración ES el producto. Cuatro MacBook
        # Pro M5 14" con distinta RAM y almacenamiento no son el mismo equipo,
        # y sin esos datos el cliente ve cuatro precios sin saber por qué.
        if categoria in ("Notebooks", "Tablets"):
            extras = []
            m_alm = re.search(r"\b(\d+)\s*(tb|gb)\b", modelo, re.I)
            if m_alm:
                extras.append(f"{m_alm.group(1)} {m_alm.group(2).upper()}")
            m_ram = re.search(r"\b(\d+)\s*ram\b", modelo, re.I)
            if m_ram:
                extras.append(f"{m_ram.group(1)} GB RAM")
            m_gpu = re.search(r"\b(\d+)\s*core\s*gpu\b", modelo, re.I)
            if m_gpu:
                extras.append(f"GPU {m_gpu.group(1)} núcleos")
            for e in extras:
                if e.lower() not in modelo_base.lower():
                    modelo_base += f" {e}"
        # siglas y nombres propios que no deben quedar en minúscula
        for mal, bien in (("Airtag", "AirTag"), ("usb-c", "USB-C"), ("Usb", "USB"),
                          ("Usbc", "USB-C"), ("Magsafe", "MagSafe"), ("Dualsense", "DualSense"),
                          ("Llevando El Celular", "(llevando el equipo)"),
                          ("Llevando El Cel", "(llevando el equipo)"),
                          ("Oled", "OLED"), ("Lte", "LTE"), ("Lcd", "LCD"), ("Vr2", "VR2")):
            modelo_base = modelo_base.replace(mal, bien)
        modelo_base = re.sub(r"(?i)^samsung galaxy (cargador|cable)", r"\1 Samsung", modelo_base)
        # RAM en formato uniforme: "8RAMB" / "12RAM" -> "8 GB RAM"
        modelo_base = re.sub(r"(?i)\b(\d+)\s*ramb?\b", r"\1 GB RAM", modelo_base)
        nombre = " ".join(x for x in [modelo_base, cap_etq, colores[0] if len(colores) == 1 else ""] if x)

        ARQ = [
            ("cable", "cable"), ("cargador", "cargador"), ("wallet", "accesorio"),
            ("magsafe", "cargador"), ("battery pack", "cargador"), ("airtag", "accesorio"),
            ("pencil", "accesorio"), ("malla", "accesorio"), ("joystick", "joystick"),
            ("volante", "joystick"), ("partybox", "parlante"), ("boombox", "parlante"),
            ("charge", "parlante"), ("flip", "parlante"), ("go ", "parlante"),
            ("airpods", "auriculares-in"), ("buds", "auriculares-in"),
            ("tune", "auriculares-over"), ("endurance", "auriculares-in"),
            ("gopro", "camara"), ("switch", "consola"), ("ps5", "consola"),
            ("band", "reloj"), ("watch", "reloj"), ("fit", "reloj"),
        ]
        nl = nombre_limpio.lower()
        arquetipo = next((a for k, a in ARQ if k in nl), None) or {
            "iPhone": "telefono", "Android": "telefono", "Tablets": "tablet",
            "Notebooks": "notebook", "Relojes": "reloj", "Audio": "auriculares-over",
            "Consolas": "consola", "Cámaras": "camara", "Accesorios": "accesorio",
        }.get(categoria, "accesorio")

        ref += 1
        costo_c = int(round(usd * 100))
        catalogo.append({
            "ref": f"A{ref}",
            "modelo": modelo_base,
            "modeloSlug": slugify(modelo_base),
            "config": config or None,
            "nombre": nombre,
            "nombreCompleto": f"{nombre} — {ETIQUETA_ESTADO[estado]}",
            "marca": marca,
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
            "precioCentavos": int(round((costo_c + margen_usd(categoria, modelo_base) * 100) * TC_PLANILLA)),
            "origen": "proveedor",
            "disponibilidad": "por_encargo",
            "publicado": not sin_bateria,
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
    open("reportes/reporte-importacion.txt", "w", encoding="utf-8").write("\n".join(reporte + resumen))
    print("\n".join(resumen))


if __name__ == "__main__":
    main()
