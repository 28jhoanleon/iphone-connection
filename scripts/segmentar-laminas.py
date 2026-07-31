#!/usr/bin/env python3
"""
Segmentador de láminas · iPhone Connection

Detecta cada producto dentro de una lámina de catálogo, lo recorta, elimina los
márgenes, descarta la etiqueta de texto, lo centra sobre fondo blanco y lo exporta
a WebP cuadrado.

Método:
1. Máscara de píxeles no blancos.
2. Proyección vertical/horizontal -> grilla de celdas.
3. Dentro de cada celda, componentes conectados; se descartan los de texto
   (bajos y en el tercio inferior).
4. Bounding box del producto -> recorte cuadrado centrado con margen.
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

UMBRAL_BLANCO = 244      # por encima de esto se considera fondo
MARGEN = 0.08            # margen alrededor del producto, proporción del lado
SALIDA = 1000            # px del lado del WebP final


def mascara(im: Image.Image) -> np.ndarray:
    g = np.asarray(im.convert("L"))
    return g < UMBRAL_BLANCO


def bandas(perfil: np.ndarray, minimo: int = 8) -> list[tuple[int, int]]:
    """Devuelve los tramos contiguos con contenido."""
    activo = perfil > 0
    out, ini = [], None
    for i, a in enumerate(activo):
        if a and ini is None:
            ini = i
        elif not a and ini is not None:
            if i - ini >= minimo:
                out.append((ini, i))
            ini = None
    if ini is not None and len(activo) - ini >= minimo:
        out.append((ini, len(activo)))
    return out


def celdas(m: np.ndarray) -> list[tuple[int, int, int, int]]:
    """Grilla: primero filas (incluyen producto + etiqueta), luego columnas dentro de cada fila."""
    filas = bandas(m.sum(axis=1), minimo=int(m.shape[0] * 0.02))
    res = []
    for y0, y1 in filas:
        sub = m[y0:y1]
        cols = bandas(sub.sum(axis=0), minimo=int(m.shape[1] * 0.01))
        for x0, x1 in cols:
            res.append((x0, y0, x1, y1))
    return res


def producto_en_celda(m: np.ndarray, celda) -> tuple[int, int, int, int] | None:
    """Aísla el producto descartando los componentes de texto."""
    x0, y0, x1, y1 = celda
    sub = m[y0:y1, x0:x1]
    h, w = sub.shape
    if h < 20 or w < 20:
        return None

    etiquetas, n = ndimage.label(sub, structure=np.ones((3, 3)))
    if n == 0:
        return None

    objetos = ndimage.find_objects(etiquetas)
    piezas = []
    for i, sl in enumerate(objetos, start=1):
        sy, sx = sl
        alto = sy.stop - sy.start
        area = (etiquetas[sl] == i).sum()
        # Descarta la etiqueta de texto. Puede estar debajo del producto (láminas de
        # catálogo) o encima (láminas con título por tarjeta): se descarta en ambos casos
        # cuando el componente es bajo y vive en un extremo de la celda.
        arriba = sy.stop < h * 0.34
        abajo = sy.start > h * 0.62
        es_texto = alto < h * 0.12 and (arriba or abajo)

        # Marco de tarjeta: rectángulo fino que envuelve título y producto.
        # Ocupa casi toda la celda pero casi no tiene píxeles rellenos.
        ancho = sx.stop - sx.start
        caja = max(alto * ancho, 1)
        es_marco = alto > h * 0.85 and ancho > w * 0.85 and area / caja < 0.06

        if es_texto or es_marco or area < 40:
            continue
        piezas.append((sy.start, sy.stop, sx.start, sx.stop))

    if not piezas:
        return None

    ty0 = min(p[0] for p in piezas); ty1 = max(p[1] for p in piezas)
    tx0 = min(p[2] for p in piezas); tx1 = max(p[3] for p in piezas)
    if (ty1 - ty0) < h * 0.15 or (tx1 - tx0) < w * 0.10:
        return None

    # Última defensa contra etiquetas de dos líneas, que superan el umbral de altura.
    # Dentro del recorte se busca el mayor corte horizontal en blanco: si existe,
    # se conserva el bloque con más masa (el producto) y se descarta el otro (el texto).
    banda = sub[ty0:ty1, tx0:tx1]
    perfil = banda.sum(axis=1)
    vacias = perfil == 0
    mejor_ini, mejor_largo, ini = 0, 0, None
    for i, v in enumerate(vacias):
        if v and ini is None:
            ini = i
        elif not v and ini is not None:
            if i - ini > mejor_largo:
                mejor_ini, mejor_largo = ini, i - ini
            ini = None
    if ini is not None and len(vacias) - ini > mejor_largo:
        mejor_ini, mejor_largo = ini, len(vacias) - ini

    if mejor_largo > (ty1 - ty0) * 0.04:
        arriba = perfil[:mejor_ini].sum()
        abajo = perfil[mejor_ini + mejor_largo:].sum()
        if arriba >= abajo:
            ty1 = ty0 + mejor_ini
        else:
            ty0 = ty0 + mejor_ini + mejor_largo

    if (ty1 - ty0) < h * 0.12:
        return None
    return (x0 + tx0, y0 + ty0, x0 + tx1, y0 + ty1)


TINTA_OBJETIVO = 0.30   # proporción del lienzo que debe cubrir el producto
LADO_MAXIMO = 0.88      # ningún producto puede superar esta fracción del lienzo


def exportar(im: Image.Image, caja, destino: str) -> None:
    """
    Recorta, normaliza la escala y centra sobre lienzo cuadrado blanco.

    La escala NO se normaliza por el lado mayor: así un teléfono vertical llenaba
    el alto y una consola apaisada quedaba diminuta. Se normaliza por SUPERFICIE
    cubierta, que es lo que percibe el ojo, con un tope para que nada se desborde.
    """
    recorte = im.crop(caja).convert("RGB")
    w, h = recorte.size

    tinta = float((np.asarray(recorte.convert("L")) < UMBRAL_BLANCO).sum())
    lado_base = max(w, h) * (1 + MARGEN * 2)
    cobertura = tinta / (lado_base ** 2)

    factor = (TINTA_OBJETIVO / cobertura) ** 0.5 if cobertura > 0 else 1.0
    factor = max(1.0, min(factor, 2.4))
    # tope: el producto nunca supera LADO_MAXIMO del lienzo
    factor = min(factor, lado_base * LADO_MAXIMO / max(w, h))

    nw, nh = int(w * factor), int(h * factor)
    recorte = recorte.resize((nw, nh), Image.LANCZOS)

    lado = int(lado_base)
    lienzo = Image.new("RGB", (lado, lado), (255, 255, 255))
    lienzo.paste(recorte, ((lado - nw) // 2, (lado - nh) // 2))
    lienzo = lienzo.resize((SALIDA, SALIDA), Image.LANCZOS)
    lienzo.save(destino, "WEBP", quality=88, method=6)


def segmentar(ruta: str, prefijo: str, destino: str) -> list[str]:
    im = Image.open(ruta)
    m = mascara(im)
    os.makedirs(destino, exist_ok=True)
    generados = []
    for i, c in enumerate(celdas(m)):
        caja = producto_en_celda(m, c)
        if not caja:
            continue
        nombre = f"{prefijo}-{len(generados):02d}.webp"
        exportar(im, caja, os.path.join(destino, nombre))
        generados.append(nombre)
    return generados


if __name__ == "__main__":
    ruta, prefijo, destino = sys.argv[1], sys.argv[2], sys.argv[3]
    g = segmentar(ruta, prefijo, destino)
    print(f"{prefijo}: {len(g)} productos detectados")
