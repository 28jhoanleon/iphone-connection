#!/usr/bin/env python3
"""
Asignador de imágenes · iPhone Connection

Toma los recortes producidos por segmentar-laminas.py y los asigna a cada
referencia del catálogo.

Cuando un modelo tiene varias fotos (una por color), elige automáticamente la
que más se acerca al color declarado de esa unidad: compara el color dominante
del recorte contra el valor de referencia del nombre de color de la planilla.
Así no hay que asignar unidad por unidad.

Los modelos sin foto disponible conservan la imagen generada (.svg).
"""
import json, os, shutil
import numpy as np
from PIL import Image

RECORTES = "/tmp/seg"
DESTINO = "public/productos"

# modelo del catálogo -> recortes disponibles, en orden de lámina
FUENTES: dict[str, list[str]] = {
    "iPhone SE 2":        ["1000745398/1000745398-00.webp"],
    "iPhone 11":          ["1000745398/1000745398-01.webp"],
    "iPhone 12":          ["1000745398/1000745398-02.webp"],
    "iPhone 12 Pro":      ["1000745398/1000745398-03.webp"],
    "iPhone 12 Pro Max":  ["1000745398/1000745398-03.webp"],
    "iPhone 13":          [f"1000745398/1000745398-{i:02d}.webp" for i in (4, 5, 6, 7)],
    "iPhone 14":          [f"1000745398/1000745398-{i:02d}.webp" for i in (8, 9)],
    "iPhone 14 Pro":      ["1000745399/1000745399-01.webp"],
    "iPhone 15":          [f"1000745399/1000745399-{i:02d}.webp" for i in (3, 4, 5)],
    "iPhone 15 Pro":      [f"1000745399/1000745399-{i:02d}.webp" for i in (9, 10, 11)],
    "iPhone 16":          [f"1000745399/1000745399-{i:02d}.webp" for i in (16, 17, 18, 19)],
    "iPhone 16 Pro":      [f"1000745399/1000745399-{i:02d}.webp" for i in (23, 24, 25)],
    "iPhone 16 Pro Max":  [f"1000745399/1000745399-{i:02d}.webp" for i in (26, 27, 28, 29)],
    "Apple Watch Ultra 2 49MM": ["1000745414/1000745414-14.webp"],
    "Joystick PS5":       ["1000745395/1000745395-27.webp"],
    # sellados y resto del ecosistema (láminas 414 y 413)
    "iPhone 14 Plus":     ["1000745399/1000745399-00.webp"],
    "iPhone 15 Plus":     [f"1000745399/1000745399-{i:02d}.webp" for i in (6, 7, 8)],
    "iPhone 15 Pro Max":  [f"1000745399/1000745399-{i:02d}.webp" for i in (12, 13, 14, 15)],
    "iPhone 16 Plus":     [f"1000745399/1000745399-{i:02d}.webp" for i in (20, 21, 22)],
    "iPad 11":            ["1000745414/1000745414-01.webp"],
    "iPad Mini A17 Pro":  ["1000745414/1000745414-00.webp"],
    "iPad Air 11' M4":    ["1000745414/1000745414-03.webp"],
    "iPad Air 13' M4":    ["1000745414/1000745414-03.webp"],
    "iPad Pro 11'' M5":   ["1000745414/1000745414-04.webp"],
    'iPad Pro 13" M5':    ["1000745414/1000745414-05.webp"],
    "Apple Watch SE 2 + Cellular": ["1000745414/1000745414-12.webp"],
    "Apple Watch SE 3":   ["1000745414/1000745414-12.webp"],
    "Apple Watch Serie 11": ["1000745414/1000745414-13.webp"],
    "Apple Watch Serie 11 + Cellular": ["1000745414/1000745414-13.webp"],
    "Apple Watch Ultra 3": ["1000745414/1000745414-14.webp"],
    "Airpods Pro 3":      ["1000745414/1000745414-17.webp"],
    "Airpods 4Ta":        ["1000745414/1000745414-16.webp"],
    "Airpods 4Ta Noise Cancel": ["1000745414/1000745414-16.webp"],
    "Airpods Max Aaa":    ["1000745414/1000745414-18.webp"],
    "Airpods Pro 2 Aaa":  ["1000745414/1000745414-17.webp"],

    # Etapa 1 · lámina de los 10 modelos de iPhone que faltaban (2 filas x 5)
    "iPhone 12 Mini":     ["ip10/ip10-00.webp"],
    "iPhone 13 Mini":     ["ip10/ip10-01.webp"],
    "iPhone 13 Pro":      ["ip10/ip10-02.webp"],
    "iPhone 13 Pro Max":  ["ip10/ip10-03.webp"],
    "iPhone 14 Pro Max":  ["ip10/ip10-04.webp"],
    "iPhone 17":          ["ip10/ip10-05.webp"],
    "iPhone 17 Air":      ["ip10/ip10-06.webp"],
    "iPhone 17 Pro":      ["ip10/ip10-07.webp"],
    "iPhone 17 Pro Max":  ["ip10/ip10-08.webp"],
    "iPhone 17e":         ["ip10/ip10-09.webp"],

    # Etapa 2 · Samsung. Solo coincidencias EXACTAS de modelo.
    # La lámina trae S25+/S25/S24/Z Fold/Z Flip y la serie A anterior (A56/A36/A06),
    # que no están en la lista de precios: no se usan como reemplazo.
    "Samsung Galaxy S26 Ultra": ["sam/sam-00.webp"],
    "Samsung Galaxy S26 Plus":  ["sam/sam-01.webp"],
    "Samsung Galaxy S26":       ["sam/sam-02.webp"],
    "Samsung Galaxy S25 Ultra": ["sam/sam-03.webp"],
    "Samsung Galaxy A26":       ["sam/sam-15.webp"],
    "Samsung Galaxy A16":       ["sam/sam-16.webp"],
}

# color declarado -> objetivo en HSV.
# Se compara por TONO y no por RGB: dos verdes de distinta luminosidad son el mismo
# color, pero en RGB quedan lejísimos. Los neutros se resuelven por luminosidad.
NEUTROS = {"negro": 0.12, "black": 0.12, "blanco": 0.94, "silver": 0.90}
TONOS = {
    "rosa": 340, "rojo": 2, "red": 2, "naranja": 25, "orange": 25,
    "gold": 40, "natural": 32, "desert": 33, "amarillo": 52,
    "verde": 120, "celeste": 200, "azul": 215, "blue": 215,
    "lila": 265, "morado": 275, "violeta": 275,
}

def color_dominante(ruta: str) -> tuple[float, float, float]:
    """
    Color del CUERPO del equipo.
    En estos renders la tapa está a la izquierda y la pantalla a la derecha; promediar
    la imagen entera devuelve el color del fondo de pantalla, no el del equipo.
    Se muestrea una ventana sobre la tapa y se usa la mediana, que ignora reflejos.
    """
    a = np.asarray(Image.open(ruta).convert("RGB")).astype(float)
    h, w, _ = a.shape
    reg = a[int(h * 0.34):int(h * 0.68), int(w * 0.16):int(w * 0.44)]
    lum = reg.mean(axis=2)
    px = reg[(lum > 18) & (lum < 250)]
    if len(px) < 200:
        px = reg.reshape(-1, 3)
    return tuple(np.median(px, axis=0))


def _hsv(rgb):
    import colorsys
    r, g, b = (c / 255 for c in rgb)
    return colorsys.rgb_to_hsv(r, g, b)  # (h 0-1, s 0-1, v 0-1)


def puntaje(rgb, clave: str) -> float:
    """Menor es mejor."""
    h, s, v = _hsv(rgb)
    for k, obj_v in NEUTROS.items():
        if k in clave:
            # un neutro se elige por luminosidad y penalizando saturación
            return abs(v - obj_v) * 100 + s * 60
    for k, obj_h in TONOS.items():
        if k in clave:
            d = abs(h * 360 - obj_h)
            d = min(d, 360 - d)          # el tono es circular
            return d + (1 - s) * 40      # penaliza candidatos desaturados
    return 999.0


def elegir(candidatos: list[str], color_declarado: str | None) -> str:
    if len(candidatos) == 1 or not color_declarado:
        return candidatos[0]
    clave = color_declarado.strip().lower()
    if not any(k in clave for k in {**NEUTROS, **TONOS}):
        return candidatos[0]
    return min(candidatos, key=lambda c: puntaje(color_dominante(os.path.join(RECORTES, c)), clave))


FUENTES_LOWER = {k.lower(): v for k, v in FUENTES.items()}


def main() -> None:
    catalogo = json.load(open("data/catalogo.json", encoding="utf-8"))
    asignadas, sin_foto, detalle = 0, [], []

    for u in catalogo:
        cands = FUENTES.get(u["modelo"]) or FUENTES_LOWER.get(u["modelo"].lower())
        if not cands:
            sin_foto.append(u["modelo"])
            continue
        color = u.get("color") or (u.get("colores") or [None])[0]
        elegido = elegir(cands, color)
        origen = os.path.join(RECORTES, elegido)
        if not os.path.exists(origen):
            sin_foto.append(u["modelo"])
            continue
        shutil.copy(origen, os.path.join(DESTINO, f'{u["ref"]}.webp'))
        asignadas += 1
        detalle.append(f'{u["ref"]:>5}  {u["modelo"]:<22} {str(color or "-"):<10} <- {os.path.basename(elegido)}')

    faltantes = sorted(set(sin_foto))
    print(f"Imágenes asignadas:      {asignadas} / {len(catalogo)}")
    print(f"Modelos sin foto:        {len(faltantes)} -> conservan imagen generada")
    for m in faltantes:
        print(f"   · {m}")
    open("reporte-imagenes.txt", "w", encoding="utf-8").write("\n".join(detalle))


if __name__ == "__main__":
    main()
