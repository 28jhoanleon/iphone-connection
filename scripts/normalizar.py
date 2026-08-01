#!/usr/bin/env python3
"""
Normalización del catálogo · iPhone Connection
Doc 00 §7.4 (nomenclatura) · auditoría de catálogo 31/07/2026

Tres reglas de fondo:

1. TAXONOMÍA POR TIPO DE PRODUCTO, NO POR MARCA.
   Una categoría describe qué es el producto; la marca es un filtro dentro.
   Tener "Apple Watch" y "Relojes" como categorías hermanas obliga al cliente a
   saber de antemano qué marca quiere, que es lo contrario a navegar un catálogo.
   Excepción única y declarada: los celulares se separan en iPhone / Android,
   porque son decisiones de compra distintas y sostienen los silos de SEO.

2. UN MODELO AGRUPA SUS VARIANTES.
   "POCO X8 Pro 8RAM 256" y "POCO X8 Pro 12RAM 512" son el mismo modelo con
   distinta configuración. La RAM y el almacenamiento son atributos de la unidad.

3. EL VOCABULARIO ES CERRADO.
   Colores, capacidades y estados salen de una lista fija. Nada se escribe libre.
"""
import os as _os, sys as _sys
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))

import re

# ---------------------------------------------------------------- taxonomía
CATEGORIA_FINAL = {
    "iPhone": "iPhone",
    "Android": "Android",
    "Mac": "Notebooks",
    "Notebooks": "Notebooks",
    "iPad": "Tablets",
    "Tablets": "Tablets",
    "Apple Watch": "Relojes",
    "Relojes": "Relojes",
    "AirPods": "Audio",
    "Audio": "Audio",
    "Consolas": "Consolas",
    "Accesorios": "Accesorios",
    "Cámaras": "Cámaras",
}

# orden y jerarquía visual (Apple primero · decisión de marca del Doc 00)
ORDEN_CATEGORIA = ["iPhone", "Android", "Notebooks", "Tablets", "Relojes",
                   "Audio", "Consolas", "Accesorios", "Cámaras"]

# ---------------------------------------------------------------- colores
COLOR_CANONICO = {
    "negro": "Negro", "negros": "Negro", "black": "Negro", "midnight": "Negro",
    "blanco": "Blanco", "blancos": "Blanco", "white": "Blanco", "starlight": "Blanco",
    "silver": "Plata", "plata": "Plata",
    "gold": "Dorado", "dorado": "Dorado",
    "natural": "Titanio Natural",
    "desert": "Titanio Desert",
    "azul": "Azul", "blue": "Azul",
    "celeste": "Celeste",
    "verde": "Verde", "green": "Verde",
    "rojo": "Rojo", "red": "Rojo",
    "rosa": "Rosa", "pink": "Rosa",
    "lila": "Lila", "morado": "Lila", "purple": "Lila",
    "amarillo": "Amarillo", "yellow": "Amarillo",
    "orange": "Naranja", "naranja": "Naranja",
    "gris": "Gris", "grey": "Gris", "gray": "Gris",
}
COLOR_IGNORAR = {"varios", "consultar", "todos", "o", "y"}


def normalizar_colores(texto: str) -> list[str]:
    out = []
    for bruto in re.split(r"[\s/,]+", texto or ""):
        k = bruto.strip().lower()
        if not k or k in COLOR_IGNORAR:
            continue
        v = COLOR_CANONICO.get(k)
        if v and v not in out:
            out.append(v)
    return out


# ---------------------------------------------------------------- marcas
def detectar_marca(texto: str, categoria: str, defecto: str | None) -> str:
    t = f" {texto.lower()} "
    reglas = [
        ("apple", "Apple"), ("iphone", "Apple"), ("ipad", "Apple"), ("macbook", "Apple"),
        ("airpods", "Apple"), ("airtag", "Apple"), ("magsafe", "Apple"), ("pencil", "Apple"),
        ("imac", "Apple"), ("mac mini", "Apple"),
        ("samsung", "Samsung"), ("galaxy", "Samsung"),
        ("poco", "POCO"), ("redmi", "Xiaomi"), ("xiaomi", "Xiaomi"),
        ("motorola", "Motorola"), ("moto ", "Motorola"),
        ("lenovo", "Lenovo"), ("dell", "Dell"), ("asus", "Asus"), ("hp ", "HP"),
        ("jbl", "JBL"), ("sony", "Sony"), ("anker", "Anker"), ("qcy", "QCY"),
        ("nintendo", "Nintendo"), ("switch", "Nintendo"),
        ("ps5", "Sony"), ("ps4", "Sony"), ("playstation", "Sony"),
        ("go pro", "GoPro"), ("gopro", "GoPro"),
        ("amazfit", "Amazfit"), ("garmin", "Garmin"), ("stanley", "Stanley"),
        ("x view", "X View"),
    ]
    for aguja, marca in reglas:
        if aguja in t:
            return marca
    return defecto or "Genérico"


# ---------------------------------------------------------------- nombres
CORRECCIONES = [
    (r"(?i)\bmacbook\b", "MacBook"),
    (r"(?i)\bairpods?\b", "AirPods"),
    (r"(?i)\bipad\b", "iPad"),
    (r"(?i)\biphone\b", "iPhone"),
    (r"(?i)\bimac\b", "iMac"),
    (r"(?i)\bgo\s*pro\b", "GoPro"),
    (r"(?i)\bpartybox\b", "PartyBox"),
    (r"(?i)\bbomboox\b", "Boombox"),
    (r"(?i)\bpencul\b", "Pencil"),
    (r"(?i)\bmagsaffe\b", "MagSafe"),
    (r"(?i)\bmagsafe\b", "MagSafe"),
    (r"(?i)\bserie\b", "Serie"),
    (r"(?i)\bultra\b", "Ultra"),
    (r"(?i)\bpro\b", "Pro"),
    (r"(?i)\bmax\b", "Max"),
    (r"(?i)\bmini\b", "Mini"),
    (r"(?i)\bplus\b", "Plus"),
    (r"(?i)\bair\b", "Air"),
    (r"(?i)\bfusion\b", "Fusion"),
    (r"(?i)\bpower\b", "Power"),
    (r"(?i)\blite\b", "Lite"),
    (r"(?i)\bnote\b", "Note"),
    (r"(?i)\bedge\b", "Edge"),
    (r"(?i)\btune\b", "Tune"),
    (r"(?i)\bcharge\b", "Charge"),
    (r"(?i)\bflip\b", "Flip"),
    (r"(?i)\bwatch\b", "Watch"),
    (r"(?i)\bcell(ular)?\b", "Cellular"),
    (r"(?i)\bnotebook\b", "Notebook"),
    (r"(?i)\btablet\b", "Tablet"),
    (r"(?i)\bjoystick\b", "Joystick"),
    (r"(?i)\bcargadores?\b", "Cargador"),
    (r"(?i)\bauriculares\b", "Auriculares"),
    (r"(?i)\boriginales?\b", "original"),
    (r"(?i)\bcertificados?\b", "certificado"),
    (r"(?i)\bse\s?(\d)\b", r"SE \1"),
    (r"(?i)\b(\d+)\s?ta\b", r"\1"),
    (r"(?i)\b(\d+)\s?th\b", r"\1"),
    (r"(?i)\b(\d+)\s?mm\b", r"\1mm"),
    (r"(?i)\bnew air\b", "Air"),
    (r"(?i)\bfit\s?(\d)\b", r"Fit \1"),
    (r"(?i)\bgpu/cpu\b", ""),
    (r"(?i)\+\s*pen\b", "+ Pen"),
    (r"(?i)\bauriculares\s+(tune|bt)\b", r"\1"),
    (r"(?i)\bbt\s+endurance\b", "Endurance"),
    (r"(?i)\btune\s+310\s+t310\b", "Tune 310"),
    (r"(?i)\bidea tab\b", "Idea Tab"),
    (r"(?i)\bufs\b", "UFS"),
    (r"(?i)\bamd\b", "AMD"),
    (r"(?i)\bintel\b", "Intel"),
    (r"(?i)\bcore\b", "Core"),
    (r"(?i)\bwindows\b", "Windows"),
]

# En notebooks el nombre comercial es marca + tamaño; el resto es configuración.
RECORTE_NOTEBOOK = re.compile(r'(?i)^(Notebook\s+\w+(?:\s+[\w]+)?\s+[\d.,]+\")')

PREFIJO_MARCA = {
    "Samsung": "Samsung Galaxy", "POCO": "POCO", "Xiaomi": "Xiaomi",
    "Motorola": "Motorola", "JBL": "JBL", "Amazfit": "Amazfit",
    "Garmin": "Garmin", "GoPro": "GoPro", "Nintendo": "Nintendo",
}


ACRONIMOS = {"GB", "TB", "MM", "RAM", "SSD", "GPU", "CPU", "LCD", "OLED", "VR2",
             "USB-C", "USBC", "BT", "NC", "5G", "4G", "WIFI", "LTE", "SE", "XL",
             "FE", "PS4", "PS5", "JBL", "HP", "AAA", "II", "III", "IV"}


def titular(s: str) -> str:
    """
    Capitaliza de forma consistente.
    Mantiene siglas conocidas y códigos de modelo (mezcla de letra y número),
    y baja a Capital el resto, incluidas las palabras que venían TODO EN MAYÚSCULA.
    """
    out = []
    for w in s.split():
        limpio = w.strip(".,")
        if limpio.upper() in ACRONIMOS:
            out.append(w.upper())
        elif re.fullmatch(r"(?i)m\d|a\d{1,2}|s\d{1,2}|t\d{3}|\d+[a-z]{1,3}|[a-z]\d+[-\w]*", limpio):
            out.append(w.upper() if len(limpio) <= 4 else w)
        elif re.search(r"\d", w) and re.search(r"[A-Za-z]", w):
            out.append(w)                       # código de modelo: se respeta
        else:
            out.append(w.capitalize())
    return " ".join(out)


def _dedupe(s: str) -> str:
    """Quita palabras repetidas consecutivas o marcas duplicadas."""
    palabras, out = s.split(), []
    for w in palabras:
        if out and w.lower() == out[-1].lower():
            continue
        if w.lower() in {x.lower() for x in out} and w.lower() in {
            "xiaomi", "samsung", "jbl", "apple", "motorola", "lenovo", "tablet", "notebook",
        }:
            continue
        out.append(w)
    return " ".join(out)


def limpiar_nombre(bruto: str, marca: str, categoria: str, prefijo: str | None = None) -> str:
    s = re.sub(r"\s+", " ", bruto).strip(" -–—·")
    # "8/256gb" = RAM/almacenamiento -> se saca del nombre
    s = re.sub(r"(?i)\b\d+\s*/\s*\d+\s*(gb|tb)?\b", " ", s)
    s = re.sub(r"(?i)\b\d+\s*/\s*\d+\b", " ", s)
    s = titular(s)
    for patron, reemplazo in CORRECCIONES:
        s = re.sub(patron, reemplazo, s)
    if prefijo and not s.lower().startswith(prefijo.lower()):
        s = f"{prefijo} {s}"
    pref = PREFIJO_MARCA.get(marca)
    if pref and not s.lower().startswith(pref.split()[0].lower()):
        s = f"{pref} {s}"
    s = re.sub(r"\s+", " ", s).strip(" -–—·,")
    if categoria == "Notebooks" and s.lower().startswith("notebook"):
        m = RECORTE_NOTEBOOK.match(s)
        if m:
            s = m.group(1)
    return _dedupe(s)


# ---------------------------------------------- modelo vs configuración
CONFIG = [
    (r"(?i)\b(\d+)\s*ram\b", "{} GB RAM"),
    (r"(?i)\b(\d+)\s*(gb|tb)\b", None),          # capacidad: ya vive en su campo
    (r"(?i)\b(5g|4g)\b", "{}"),
    (r"(?i)\b(\d+/\d+)\s*(gb)?\b", "{} GB"),
    (r"(?i)\b(\d+)\s*core\s*(gpu|cpu)\b", "{} core"),
    (r"(?i)\b(\d+/\d+)\s*(gpu/cpu|cpu/gpu)\b", "{} GPU/CPU"),
    (r"(?i)\b(con\s+mario\s+kart)\b", "{}"),
    (r"(?i)\b(1\s*joystick)\b", "{}"),
    (r"(?i)\b(caja\s+abierta)\b", "{}"),
    (r"(?i)\b(teclado\s*/?\s*pen)\b", "con teclado y pen"),
    (r"(?i)\b(con\s+pen\s+y\s+funda)\b", "{}"),
    (r"(?i)\b(wifi)\b", "WiFi"),
    (r"(?i)\+\s*(Cellular)\b", "{}"),
]


def separar_modelo(nombre: str) -> tuple[str, str]:
    """Devuelve (modelo agrupador, configuración de esta unidad)."""
    detalles, modelo = [], nombre
    for patron, plantilla in CONFIG:
        for m in re.finditer(patron, modelo):
            if plantilla:
                detalles.append(plantilla.format(m.group(1)))
        modelo = re.sub(patron, " ", modelo)
    modelo = re.sub(r"[(){}\[\]|]", " ", modelo)
    modelo = re.sub(r"\s+", " ", modelo).strip(" -–—·,")
    return modelo or nombre, " · ".join(dict.fromkeys(detalles))


# ---------------------------------------------- réplicas
def es_replica(nombre: str) -> bool:
    """
    'AAA' en el rubro significa réplica. Publicar una réplica bajo el nombre del
    original es exactamente lo que la marca dice combatir, así que no se importa.
    """
    return bool(re.search(r"(?i)\b(aaa|replica|réplica)\b|economic", nombre))
