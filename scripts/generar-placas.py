#!/usr/bin/env python3
"""
Generador de contenido para Instagram · iPhone Connection

Toma el catálogo y produce las placas listas para publicar. No hay que diseñar
nada ni sacar fotos: los datos que hacen creíble a la marca —estado, batería,
garantía, precio con fecha— ya están en el catálogo y son exactamente lo que
ninguna competencia publica.

    python3 scripts/generar-placas.py            # el plan de la semana
    python3 scripts/generar-placas.py --todos    # una placa por producto

Salida en contenido/: las imágenes en 1080x1350 (4:5, el formato que más
espacio ocupa en el feed) y los textos en un .txt para copiar y pegar.

Tipos de placa:
  producto   · la foto, el precio y el readout de transparencia
  dato       · un dato del catálogo que sostiene la promesa de la marca
  comparativa· dos unidades del mismo modelo con distinta batería y precio
"""
import os as _os, sys as _sys
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))

import json, os, random, textwrap
from datetime import date, timedelta
from PIL import Image, ImageDraw, ImageFont

SALIDA = "contenido"
W, H = 1080, 1350
TINTA = (10, 10, 10)
PAPEL = (250, 250, 250)
LINEA = (223, 222, 220)
GRIS = (110, 110, 115)
GRIS_SUAVE = (134, 134, 139)
MARGEN = 72
REALES = (".webp", ".jpg", ".jpeg", ".png")


def fuente(tam, negrita=False):
    """Busca una tipográfica del sistema; si no hay, usa la de Pillow."""
    rutas = [
        f"/system/fonts/Roboto-{'Bold' if negrita else 'Regular'}.ttf",
        f"/usr/share/fonts/truetype/dejavu/DejaVuSans{'-Bold' if negrita else ''}.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "C:/Windows/Fonts/arialbd.ttf" if negrita else "C:/Windows/Fonts/arial.ttf",
    ]
    for r in rutas:
        if os.path.exists(r):
            try:
                return ImageFont.truetype(r, tam)
            except Exception:
                pass
    return ImageFont.load_default(tam)


def precio_ars(p, tc, cfg):
    if not p["costoCentavos"]:
        return p["precioCentavos"]
    paso = cfg["redondeoPesos"] * 100
    # margen fijo en dolares por categoria, igual que en el resto del sistema
    m = cfg.get("margenPorModelo", {})
    usd = next((v for k, v in m.items() if k.lower() in p["modelo"].lower()), None)
    if usd is None:
        usd = cfg.get("margenPorCategoria", {}).get(p["categoria"], cfg.get("margenPorDefecto", 50))
    return round((p["costoCentavos"] + usd * 100) * tc / paso) * paso


def fmt(centavos):
    return "$ " + f"{centavos // 100:,}".replace(",", ".")


def ruta_foto(ref):
    return next((f"public/productos/{ref}{e}" for e in REALES
                 if os.path.exists(f"public/productos/{ref}{e}")), None)


def marca(d, y=None):
    """Firma de la marca. Siempre en el mismo lugar: es lo que da continuidad."""
    f1, f2 = fuente(30, True), fuente(30)
    y = y if y is not None else H - MARGEN - 34
    d.text((MARGEN, y), "iPhone", font=f1, fill=TINTA)
    ancho = d.textlength("iPhone", font=f1)
    d.text((MARGEN + ancho, y), "Connection", font=f2, fill=GRIS)


def placa_producto(p, tc, cfg, destino):
    im = Image.new("RGB", (W, H), PAPEL)
    d = ImageDraw.Draw(im)

    # etiqueta de estado, arriba
    et = "STOCK INMEDIATO" if p["disponibilidad"] == "disponible" else "POR ENCARGO"
    fet = fuente(22, True)
    ancho = d.textlength(et, font=fet)
    if p["disponibilidad"] == "disponible":
        d.rounded_rectangle([MARGEN, MARGEN, MARGEN + ancho + 44, MARGEN + 46], 23, fill=TINTA)
        d.text((MARGEN + 22, MARGEN + 12), et, font=fet, fill=PAPEL)
    else:
        d.rounded_rectangle([MARGEN, MARGEN, MARGEN + ancho + 44, MARGEN + 46], 23, outline=LINEA, width=2)
        d.text((MARGEN + 22, MARGEN + 12), et, font=fet, fill=GRIS)

    # foto del producto, centrada
    f = ruta_foto(p["ref"])
    if f:
        foto = Image.open(f).convert("RGB")
        lado = 620
        foto.thumbnail((lado, lado), Image.LANCZOS)
        # La foto viene con fondo blanco puro y el lienzo es #FAFAFA: sin esto
        # se ve un cuadrado más claro alrededor del producto.
        fondo = Image.new("RGB", foto.size, PAPEL)
        px = foto.load()
        fp = fondo.load()
        for yy in range(foto.height):
            for xx in range(foto.width):
                r, g, b = px[xx, yy]
                if r > 242 and g > 242 and b > 242:
                    px[xx, yy] = PAPEL
        im.paste(foto, ((W - foto.width) // 2, 168))

    y = 168 + 620 + 26

    # nombre
    fn = fuente(50, True)
    for linea in textwrap.wrap(p["nombre"], width=26)[:2]:
        d.text((MARGEN, y), linea, font=fn, fill=TINTA)
        y += 60

    # precio, el dato que más se busca
    y += 10
    fp = fuente(76, True)
    d.text((MARGEN, y), fmt(precio_ars(p, tc, cfg)), font=fp, fill=TINTA)
    y += 96

    # readout de transparencia: el elemento de firma de la marca
    celdas = [
        ("BATERÍA", f'{p["bateria"]}%' if p["bateria"] else "—"),
        ("GRADO", "NUEVO" if p["estado"] == "nuevo_sellado" else p["estado"][-1].upper()),
        ("GARANTÍA", "12M" if p["estado"] == "nuevo_sellado" else "6M"),
        ("REF", f'#{p["ref"]}'),
    ]
    y_r = H - MARGEN - 150
    d.line([MARGEN, y_r, W - MARGEN, y_r], fill=LINEA, width=2)
    ancho_c = (W - MARGEN * 2) / len(celdas)
    fk, fv = fuente(19), fuente(30, True)
    for i, (k, v) in enumerate(celdas):
        x = MARGEN + ancho_c * i
        d.text((x, y_r + 20), k, font=fk, fill=GRIS_SUAVE)
        d.text((x, y_r + 48), v, font=fv, fill=TINTA)
        if i:
            d.line([x - 14, y_r + 16, x - 14, y_r + 88], fill=LINEA, width=2)

    marca(d)
    im.save(destino, "JPEG", quality=92)


def placa_dato(titulo, bajada, destino):
    """Placa de texto sobre fondo oscuro. Rompe el ritmo del feed."""
    im = Image.new("RGB", (W, H), TINTA)
    d = ImageDraw.Draw(im)

    ft = fuente(78, True)
    y = 300
    for linea in textwrap.wrap(titulo, width=18)[:4]:
        d.text((MARGEN, y), linea, font=ft, fill=PAPEL)
        y += 92

    y += 40
    fb = fuente(34)
    for linea in textwrap.wrap(bajada, width=38)[:5]:
        d.text((MARGEN, y), linea, font=fb, fill=(158, 158, 158))
        y += 48

    f1, f2 = fuente(30, True), fuente(30)
    yb = H - MARGEN - 34
    d.text((MARGEN, yb), "iPhone", font=f1, fill=PAPEL)
    d.text((MARGEN + d.textlength("iPhone", font=f1), yb), "Connection", font=f2, fill=(158, 158, 158))
    im.save(destino, "JPEG", quality=92)


# ---------- textos ----------

def copy_producto(p, tc, cfg):
    """
    Texto de la publicación.

    Un pie de foto que repite el nombre y el precio no da motivo para detenerse:
    eso ya está en la imagen. Cada publicación arranca con una razón para mirar
    —qué hay que saber antes de comprar, por qué este equipo y no otro— y recién
    después dice qué es y cuánto sale.

    El ángulo se elige por las características reales del producto: un usado con
    batería alta y uno sellado no se cuentan igual.
    """
    bat = p.get("bateria")
    sellado = p["estado"] == "nuevo_sellado"
    unico = p.get("disponibilidad") == "ultima_unidad"
    gar = "12 meses" if sellado else "6 meses"
    estado = {"nuevo_sellado": "Nuevo sellado", "seleccionado_a": "Seleccionado A",
              "seleccionado_b": "Seleccionado B", "seleccionado_c": "Seleccionado C"}[p["estado"]]

    if unico and bat and bat >= 90:
        gancho = (f"Un {p['modelo']} usado con la batería al {bat}% no aparece seguido.\n"
                  "Este es uno, y es el único que tenemos.")
    elif unico:
        gancho = (f"Este {p['modelo']} es una unidad sola.\n"
                  "En usados no hay dos iguales: cuando se va, se va.")
    elif sellado and p["categoria"] == "iPhone":
        gancho = (f"{p['modelo']}, sellado de fábrica.\n"
                  "Caja cerrada, garantía de un año y la configuración inicial la hacemos con vos.")
    elif p["categoria"] in ("Notebooks", "Tablets"):
        gancho = (f"{p['nombre']}.\n"
                  "La configuración exacta está en la ficha: disco, memoria y placa, sin letra chica.")
    elif bat:
        gancho = (f"{p['modelo']} en estado {estado.lower()}, con la batería al {bat}%.\n"
                  "Ese número está publicado antes de que preguntes, porque es lo que "
                  "determina cuánto te va a durar.")
    else:
        gancho = (f"{p['nombre']}.\n"
                  "Revisado antes de publicarse, con garantía por escrito.")

    cuerpo = f"{estado}. Garantía de {gar}."
    if bat and not sellado:
        cuerpo += f" Salud de batería {bat}%."

    cierre = (f"Escribinos por WhatsApp con la referencia #{p['ref']} y te contamos "
              "todo lo que necesites saber antes de decidir.")

    return (f"{gancho}\n\n"
            f"{fmt(precio_ars(p, tc, cfg))}\n"
            f"{cuerpo}\n\n"
            f"{cierre}\n\n"
            "Sabés exactamente qué estás comprando.\n\n"
            f"#iPhoneConnection #{p['marca'].replace(' ', '')} #Rosario")


def main():
    cfg = json.load(open("data/precios.json", encoding="utf-8"))
    tc = cfg["tcRespaldo"]
    catalogo = [p for p in json.load(open("data/catalogo.json", encoding="utf-8"))
                if p["publicado"] and ruta_foto(p["ref"])]

    # Para publicar se exige que la foto corresponda al color declarado. Una
    # placa que dice "Azul" con una foto dorada destruye justo lo que la marca
    # promete. Los productos sin color declarado sí se publican.
    def color_ok(p):
        if not p.get("color"):
            return True
        try:
            import numpy as np
            import colorsys
            a = np.asarray(Image.open(ruta_foto(p["ref"])).convert("RGB")).astype(float)
            h_, w_, _ = a.shape
            reg = a[int(h_ * .34):int(h_ * .68), int(w_ * .16):int(w_ * .44)]
            lum = reg.mean(axis=2)
            px = reg[(lum > 18) & (lum < 250)]
            if len(px) < 200:
                return True
            r, g, b = (np.median(px, axis=0) / 255)
            hh, ss, vv = colorsys.rgb_to_hsv(r, g, b)
        except Exception:
            return True
        c = p["color"].lower()
        NEUTRO = {"negro": .12, "blanco": .94, "plata": .90, "gris": .55, "gold": .70, "dorado": .70}
        TONO = {"rosa": 340, "rojo": 2, "naranja": 25, "verde": 120, "celeste": 200,
                "azul": 215, "lila": 265, "morado": 275, "amarillo": 52}
        for k, v in NEUTRO.items():
            if k in c:
                return abs(vv - v) <= .30
        for k, t in TONO.items():
            if k in c:
                if ss < .10:
                    return False
                dd = abs(hh * 360 - t)
                return min(dd, 360 - dd) <= 50
        return True

    catalogo = [p for p in catalogo if color_ok(p)]

    os.makedirs(SALIDA, exist_ok=True)
    todos = "--todos" in _sys.argv

    if todos:
        elegidos = catalogo
    else:
        # Selección de la semana: variedad de categorías y de rangos de precio,
        # para que el feed no quede lleno de iPhones iguales.
        random.seed(date.today().isocalendar()[1])
        por_cat = {}
        for p in catalogo:
            por_cat.setdefault(p["categoria"], []).append(p)
        elegidos = []
        for cat in sorted(por_cat, key=lambda c: -len(por_cat[c])):
            elegidos.append(random.choice(por_cat[cat]))
            if len(elegidos) >= 6:
                break

    textos = []
    for p in elegidos:
        destino = os.path.join(SALIDA, f'producto-{p["ref"]}.jpg')
        placa_producto(p, tc, cfg, destino)
        textos.append((f'producto-{p["ref"]}.jpg', copy_producto(p, tc, cfg)))

    # placas de dato: sostienen la promesa entre publicaciones de producto
    con_bateria = [p for p in catalogo if p["bateria"]]
    disponibles = [p for p in catalogo if p["disponibilidad"] == "disponible"]
    # Las placas de dato defienden la promesa de la marca. Van entre las de
    # producto para que el feed no sea una lista de precios.
    DATOS = [
        ("¿Sabés al cuánto está la batería del usado que estás por comprar?",
         "Si la respuesta es no, no lo compres todavia. Es el dato que decide cuánto "
         "te va a durar, y el que casi nadie publica. Nosotros lo ponemos en cada "
         "ficha, antes de que preguntes.", "dato-bateria.jpg"),
        ("Garantía por escrito. No de palabra.",
         "Seis meses en seleccionados, doce en sellados. Las condiciones se entregan "
         "impresas el día de la compra, no se prometen por chat.", "dato-garantia.jpg"),
        ("Los usados son de a uno.",
         "No hay stock de un usado: hay ese equipo, con su batería y su estado. Por "
         "eso cada uno tiene su ficha propia y su precio propio.", "dato-unicos.jpg"),
        ("Hay equipos que no vendemos.",
         "Si no podemos revisarlo, respaldarlo con garantía y responder por él "
         "después, no entra al catálogo. Aunque se venda bien.", "dato-criterio.jpg"),
        (f"{len(catalogo)} equipos, todos con su estado declarado.",
         "Grado, salud de batería, garantía y precio actualizado. En la web, sin "
         "tener que escribir para saber cuánto sale.", "dato-catalogo.jpg"),
    ]
    for titulo, bajada, archivo in (DATOS if todos else DATOS[:2]):
        placa_dato(titulo, bajada, os.path.join(SALIDA, archivo))
        textos.append((archivo, f"{titulo}\n\n{bajada}\n\n"
                                "Sabés exactamente qué estás comprando.\n\n"
                                "#iPhoneConnection #Rosario #Tecnologia"))

    with open(os.path.join(SALIDA, "textos.txt"), "w", encoding="utf-8") as f:
        for archivo, copy in textos:
            f.write(f"{'=' * 60}\n{archivo}\n{'=' * 60}\n{copy}\n\n\n")

    # copia en public/ para que el panel las muestre. No van al repositorio:
    # son artefactos que se regeneran, no código.
    import shutil
    pub = "public/contenido"
    shutil.rmtree(pub, ignore_errors=True)
    os.makedirs(pub, exist_ok=True)
    for archivo, _ in textos:
        shutil.copy(os.path.join(SALIDA, archivo), os.path.join(pub, archivo))

    print(f"Placas generadas : {len(textos)}")
    print(f"Carpeta          : {SALIDA}/")
    print(f"Textos           : {SALIDA}/textos.txt")
    if not todos:
        print("\nPlan sugerido (3 por semana):")
        dias = ["lunes", "miércoles", "viernes"]
        for i, (archivo, _) in enumerate(textos[:6]):
            print(f"  semana {i // 3 + 1} · {dias[i % 3]:<10} {archivo}")


if __name__ == "__main__":
    main()
