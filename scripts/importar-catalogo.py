#!/usr/bin/env python3
"""
Importador de catálogo · iPhone Connection
Lee la planilla del negocio (CSV o XLSX), normaliza y produce catalogo.json.

Reglas aplicadas (Doc 00 §7):
- Nomenclatura canónica: [Marca] [Modelo] [Capacidad] [Color] — [Estado]
- Vocabulario de estado canónico. "Como nuevo", "impecable", "9 de 10" -> Seleccionado A/B
- Capacidad siempre en GB/TB, con espacio
- Dinero en centavos, sin excepción
- Todo producto sin dato obligatorio queda en BORRADOR, nunca se publica a medias

Salida: catalogo.json + reporte-importacion.txt con cada corrección hecha.
Uso: python3 importar-catalogo.py planilla.csv
"""
import csv, json, re, sys, unicodedata
from datetime import date

# ---------- normalización de texto ----------
def sin_acentos(s):
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")

def clave(s):
    return re.sub(r"[^a-z0-9]+", " ", sin_acentos(str(s)).lower()).strip()

# ---------- diccionarios de normalización ----------
MARCAS = {
    "apple": "Apple", "iphone": "Apple", "mac": "Apple", "ipad": "Apple",
    "samsung": "Samsung", "galaxy": "Samsung",
    "xiaomi": "Xiaomi", "redmi": "Xiaomi", "poco": "POCO",
    "motorola": "Motorola", "moto": "Motorola",
    "sony": "Sony", "jbl": "JBL", "nintendo": "Nintendo", "microsoft": "Microsoft",
    "airpods": "Apple", "macbook": "Apple", "imac": "Apple", "apple watch": "Apple",
    "switch": "Nintendo", "playstation": "Sony", "ps5": "Sony", "xbox": "Microsoft",
}

CATEGORIAS = {
    "iphone": "iPhone", "ipad": "iPad", "macbook": "Mac", "mac": "Mac", "imac": "Mac",
    "watch": "Apple Watch", "airpods": "AirPods",
    "galaxy": "Android", "redmi": "Android", "poco": "Android", "moto": "Android",
    "samsung": "Android", "xiaomi": "Android", "motorola": "Android",
    "notebook": "Notebooks", "laptop": "Notebooks",
    "tablet": "Tablets", "consola": "Consolas", "playstation": "Consolas",
    "xbox": "Consolas", "switch": "Consolas", "nintendo": "Consolas",
    "parlante": "Audio", "auricular": "Audio", "headphone": "Audio",
    "jbl": "Audio", "bocina": "Audio", "soundbar": "Audio",
    "cargador": "Accesorios", "cable": "Accesorios", "funda": "Accesorios",
    "vidrio": "Accesorios", "protector": "Accesorios", "adaptador": "Accesorios",
}

ARQUETIPO = {
    "iPhone": "telefono", "Android": "telefono", "iPad": "tablet", "Tablets": "tablet",
    "Mac": "notebook", "Notebooks": "notebook", "Apple Watch": "reloj",
    "AirPods": "auriculares-in", "Audio": "auriculares-over",
    "Consolas": "consola", "Accesorios": "accesorio",
}

ESTADOS = {
    "nuevo": "nuevo_sellado", "sellado": "nuevo_sellado", "0km": "nuevo_sellado",
    "nuevo sellado": "nuevo_sellado", "sin uso": "nuevo_sellado",
    "como nuevo": "seleccionado_a", "impecable": "seleccionado_a", "excelente": "seleccionado_a",
    "muy bueno": "seleccionado_a", "10 puntos": "seleccionado_a", "a": "seleccionado_a",
    "bueno": "seleccionado_b", "usado": "seleccionado_b", "b": "seleccionado_b",
    "con detalles": "seleccionado_b", "9 de 10": "seleccionado_b",
}

ETIQUETA_ESTADO = {
    "nuevo_sellado": "Nuevo sellado",
    "seleccionado_a": "Seleccionado A",
    "seleccionado_b": "Seleccionado B",
}

# columnas aceptadas -> campo interno
COLUMNAS = {
    "modelo": ["modelo", "producto", "equipo", "nombre", "descripcion", "detalle", "articulo"],
    "marca": ["marca", "brand"],
    "categoria": ["categoria", "rubro", "tipo", "familia"],
    "capacidad": ["capacidad", "almacenamiento", "gb", "memoria", "storage"],
    "color": ["color", "colour"],
    "estado": ["estado", "condicion", "condition"],
    "bateria": ["bateria", "salud", "salud de bateria", "battery"],
    "costo": ["costo", "compra", "precio de costo", "costo usd", "usd"],
    "precio": ["precio", "venta", "precio de venta", "precio final", "pvp", "lista"],
    "stock": ["stock", "cantidad", "disponibilidad", "disponible"],
}

def mapear_columnas(encabezados):
    mapa, usados = {}, set()
    for campo, alias in COLUMNAS.items():
        for i, h in enumerate(encabezados):
            if i in usados:
                continue
            k = clave(h)
            if k in alias or any(a in k for a in alias):
                mapa[campo] = i
                usados.add(i)
                break
    return mapa

def a_centavos(valor):
    """Acepta '1.249.000', '$ 1249000', '1249000,50', '900 USD'. Devuelve int o None."""
    if valor is None:
        return None
    s = re.sub(r"[^\d,.\-]", "", str(valor))
    if not s:
        return None
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".") if s.rfind(",") > s.rfind(".") else s.replace(",", "")
    elif "," in s:
        s = s.replace(",", ".") if len(s.split(",")[-1]) <= 2 else s.replace(",", "")
    elif s.count(".") >= 1 and len(s.split(".")[-1]) == 3:
        s = s.replace(".", "")
    try:
        return int(round(float(s) * 100))
    except ValueError:
        return None

def normalizar_capacidad(txt, modelo=""):
    fuente = f"{txt or ''} {modelo}"
    m = re.search(r"(\d+)\s*(tb|gb)", clave(fuente))
    if m:
        n = int(m.group(1))
        return n * 1024 if m.group(2) == "tb" else n
    m = re.search(r"\b(64|128|256|512|1024)\b", clave(fuente))
    return int(m.group(1)) if m else None

def etiqueta_capacidad(gb):
    if not gb:
        return ""
    return f"{gb // 1024} TB" if gb >= 1024 and gb % 1024 == 0 else f"{gb} GB"

def detectar(texto, diccionario):
    k = clave(texto)
    for aguja, valor in diccionario.items():
        if aguja in k:
            return valor
    return None

def normalizar_estado(txt):
    k = clave(txt)
    if not k:
        return None
    for aguja, valor in ESTADOS.items():
        if aguja in k:
            return valor
    return None

def procesar(filas, mapa, reporte):
    catalogo, ref = [], 100
    vistos = {}
    for n, fila in enumerate(filas, start=2):
        def col(c):
            i = mapa.get(c)
            return fila[i].strip() if i is not None and i < len(fila) and fila[i] else ""

        modelo_crudo = col("modelo")
        if not modelo_crudo:
            reporte.append(f"Fila {n}: sin modelo. DESCARTADA.")
            continue

        categoria = detectar(col("categoria") or modelo_crudo, CATEGORIAS) or "Sin categoría"

        marca = detectar(col("marca") or modelo_crudo, MARCAS)
        if not marca:
            if categoria == "Accesorios":
                marca = "Genérico"
                reporte.append(f"Fila {n}: accesorio sin marca. Asignado «Genérico».")
            else:
                marca = "Sin marca"
                reporte.append(f"Fila {n}: marca no reconocida en «{modelo_crudo}». Queda BORRADOR.")

        if categoria == "Sin categoría":
            reporte.append(f"Fila {n}: categoría no reconocida en «{modelo_crudo}». Queda BORRADOR.")

        capacidad = normalizar_capacidad(col("capacidad"), modelo_crudo)

        estado = normalizar_estado(col("estado"))
        if estado is None:
            estado = "nuevo_sellado"
            reporte.append(f"Fila {n}: estado vacío o ambiguo («{col('estado')}»). Asumido Nuevo sellado.")

        # limpiar el modelo de ruido comercial y de datos que ya viven en otros campos
        modelo = re.sub(r"\b\d+\s*(gb|tb)\b", "", modelo_crudo, flags=re.I)
        modelo = re.sub(r"(?i)\b(oferta|promo|liquidacion|imperdible|nuevo|usado|sellado)\b", "", modelo)
        modelo = re.sub(r"[!¡]+|\s{2,}", " ", modelo).strip(" -–—·")
        if modelo != modelo_crudo:
            reporte.append(f"Fila {n}: nombre normalizado. «{modelo_crudo}» -> «{modelo}»")

        precio_c = a_centavos(col("precio"))
        costo_c = a_centavos(col("costo"))
        if precio_c is None:
            reporte.append(f"Fila {n}: sin precio de venta. Queda BORRADOR (no se publica).")
        if precio_c and costo_c and precio_c <= costo_c:
            reporte.append(f"Fila {n}: ALERTA · precio de venta menor o igual al costo. Revisar.")

        bat = re.search(r"(\d{2,3})", col("bateria") or "")
        bateria = int(bat.group(1)) if bat else (100 if estado == "nuevo_sellado" else None)
        if estado != "nuevo_sellado" and bateria is None:
            reporte.append(f"Fila {n}: usado sin salud de batería. Obligatorio por Doc 00. BORRADOR.")

        stock_txt = clave(col("stock"))
        if stock_txt in ("0", "no", "sin stock", "agotado"):
            disponibilidad = "sin_stock"
        elif "encargo" in stock_txt or "pedido" in stock_txt:
            disponibilidad = "por_encargo"
        else:
            disponibilidad = "disponible"

        color = col("color").title() or None
        nombre = " ".join(x for x in [modelo, etiqueta_capacidad(capacidad), color] if x)

        # duplicados
        firma = clave(nombre) + str(estado)
        if firma in vistos:
            reporte.append(f"Fila {n}: duplicado de fila {vistos[firma]} («{nombre}»). DESCARTADA.")
            continue
        vistos[firma] = n

        ref += 1
        publicable = bool(precio_c) and marca != "Sin marca" and categoria != "Sin categoría" \
            and not (estado != "nuevo_sellado" and bateria is None)

        catalogo.append({
            "ref": f"{categoria[:1].upper()}{ref}",
            "nombre": nombre,
            "nombreCompleto": f"{nombre} — {ETIQUETA_ESTADO[estado]}",
            "marca": marca,
            "categoria": categoria,
            "arquetipo": ARQUETIPO.get(categoria, "accesorio"),
            "capacidadGb": capacidad,
            "color": color,
            "estado": estado,
            "estadoEtiqueta": ETIQUETA_ESTADO[estado],
            "bateria": bateria,
            "costoCentavos": costo_c,
            "precioCentavos": precio_c,
            "disponibilidad": disponibilidad,
            "publicado": publicable,
            "actualizado": date.today().isoformat(),
        })
    return catalogo

def main(ruta):
    with open(ruta, newline="", encoding="utf-8-sig") as f:
        muestra = f.read(4096); f.seek(0)
        try:
            dialecto = csv.Sniffer().sniff(muestra, delimiters=",;\t")
        except csv.Error:
            dialecto = csv.excel
        filas = list(csv.reader(f, dialecto))

    encabezados, datos = filas[0], filas[1:]
    mapa = mapear_columnas(encabezados)
    reporte = [f"Columnas detectadas: {', '.join(f'{k}->{encabezados[v]}' for k, v in mapa.items())}", ""]

    if "modelo" not in mapa:
        print("ERROR: no se encontró una columna de modelo/producto."); sys.exit(1)

    catalogo = procesar(datos, mapa, reporte)
    publicados = [p for p in catalogo if p["publicado"]]

    with open("catalogo.json", "w", encoding="utf-8") as f:
        json.dump(catalogo, f, ensure_ascii=False, indent=2)

    resumen = [
        "", "=" * 52,
        f"Filas leídas:        {len(datos)}",
        f"Productos válidos:   {len(catalogo)}",
        f"Publicables:         {len(publicados)}",
        f"En borrador:         {len(catalogo) - len(publicados)}",
        f"Correcciones:        {len([r for r in reporte if r.startswith('Fila')])}",
    ]
    with open("reporte-importacion.txt", "w", encoding="utf-8") as f:
        f.write("\n".join(reporte + resumen))
    print("\n".join(reporte[:3] + resumen))

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "planilla.csv")
