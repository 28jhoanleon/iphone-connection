#!/usr/bin/env python3
"""
recortar-collage-auto.py — Recorta y asigna automaticamente iPhones de collages

Uso:
    python3 recortar-collage-auto.py [ruta-del-collage.png]

Ejemplo:
    python3 recortar-collage-auto.py /sdcard/Download/collage.png

Que hace:
    1. Detecta las 6 filas de iPhones
    2. Detecta los bloques (grupos del mismo modelo) dentro de cada fila
    3. Recorta el iPhone del MEDIO de cada bloque (mejor representacion)
    4. Asigna automaticamente el modelo basado en la estructura del collage
    5. Guarda en public/maestras/ con el nombre del modeloSlug correcto

Requiere: pip install Pillow
"""

from PIL import Image
import numpy as np
import sys
import os


def merge_regions(starts, ends, min_gap=25):
    if not starts:
        return [], []
    ms, me = [starts[0]], [ends[0]]
    for i in range(1, len(starts)):
        if starts[i] - me[-1] < min_gap:
            me[-1] = ends[i]
        else:
            ms.append(starts[i])
            me.append(ends[i])
    return ms, me


def detectar_filas(mask, min_altura=80, umbral_fila=500):
    row_sum = mask.sum(axis=1)
    active = row_sum > umbral_fila
    changes = np.diff(active.astype(int))
    starts = [0] if active[0] else []
    starts += list(np.where(changes == 1)[0])
    ends = list(np.where(changes == -1)[0])
    if active[-1]:
        ends.append(len(active) - 1)
    return [(s, e) for s, e in zip(starts, ends) if e - s >= min_altura]


def detectar_bloques(mask, y_start, y_end, umbral_bloque=30):
    row_slice = mask[y_start:y_end, :]
    col_sum = row_slice.sum(axis=0)
    active = col_sum > umbral_bloque
    changes = np.diff(active.astype(int))
    starts = [0] if active[0] else []
    starts += list(np.where(changes == 1)[0])
    ends = list(np.where(changes == -1)[0])
    if active[-1]:
        ends.append(len(active) - 1)

    fs, fe = [], []
    for s, e in zip(starts, ends):
        if e - s > 20:
            fs.append(s)
            fe.append(e)
    return merge_regions(fs, fe, min_gap=30)


def detectar_iphones_en_bloque(mask, y_start, y_end, x_start, x_end, min_ancho=25):
    bloque = mask[y_start:y_end, x_start:x_end]
    col_sum = bloque.sum(axis=0)
    active = col_sum > 15
    changes = np.diff(active.astype(int))
    starts = [0] if active[0] else []
    starts += list(np.where(changes == 1)[0])
    ends = list(np.where(changes == -1)[0])
    if active[-1]:
        ends.append(len(active) - 1)

    phones = []
    for s, e in zip(starts, ends):
        if e - s > min_ancho:
            phones.append((s, e))
    return phones


def recortar_phone(img, mask, y_start, y_end, x_start, x_end, phone_start, phone_end, pad=5):
    px_s = x_start + phone_start - pad
    px_e = x_start + phone_end + pad

    phone_mask = mask[y_start:y_end, px_s:px_e]
    v_sum = phone_mask.sum(axis=1)
    v_active = v_sum > 3
    v_changes = np.diff(v_active.astype(int))
    v_starts = [0] if v_active[0] else []
    v_starts += list(np.where(v_changes == 1)[0])
    v_ends = list(np.where(v_changes == -1)[0])
    if v_active[-1]:
        v_ends.append(len(v_active) - 1)

    if v_starts:
        py_s = y_start + v_starts[0] - pad
        py_e = y_start + v_ends[-1] + pad
        px_s -= pad
        px_e += pad

        w, h = img.size
        return img.crop((max(0, px_s), max(0, py_s), min(w, px_e), min(h, py_e)))
    return None


# Mapeo de estructura del collage conocido
# Cada fila tiene bloques con cierta cantidad de iPhones
# Basado en el collage: iPhone 11 al 17e
FILAS_MODELOS = [
    ["iphone-11", "iphone-12", "iphone-12-mini", "iphone-12-pro"],
    ["iphone-13", "iphone-13-mini", "iphone-13-pro", "iphone-13-pro-max"],
    ["iphone-14", "iphone-14-plus", "iphone-14-pro", "iphone-14-pro-max"],
    ["iphone-15", "iphone-15-plus", "iphone-15-pro", "iphone-15-pro-max"],
    ["iphone-16", "iphone-16-plus", "iphone-16-pro", "iphone-16-pro-max"],
    ["iphone-17", "iphone-17-air", "iphone-17-pro", "iphone-17-pro-max", "iphone-17e"],
]


def main():
    if len(sys.argv) < 2:
        print("Uso: python3 recortar-collage-auto.py [ruta-del-collage.png]")
        print("Ejemplo: python3 recortar-collage-auto.py /sdcard/Download/collage.png")
        sys.exit(1)

    ruta = sys.argv[1]
    salida = "public/maestras"
    os.makedirs(salida, exist_ok=True)

    print("\n📸 Recortar Collage Auto — iPhoneConnection\n")
    print("Cargando: " + ruta)

    img = Image.open(ruta)
    arr = np.array(img)
    gray = np.mean(arr, axis=2)
    mask = gray < 220

    print("Dimensiones: " + str(img.size))

    # Detectar filas
    filas = detectar_filas(mask)
    print("Filas detectadas: " + str(len(filas)))

    if len(filas) > len(FILAS_MODELOS):
        print("⚠️  Mas filas que modelos conocidos. Usando las primeras " + str(len(FILAS_MODELOS)))
        filas = filas[:len(FILAS_MODELOS)]

    recortados = 0
    asignados = 0

    for f_idx, (y_s, y_e) in enumerate(filas):
        modelos_fila = FILAS_MODELOS[f_idx] if f_idx < len(FILAS_MODELOS) else []
        print("\n📂 Fila " + str(f_idx + 1) + " (Y=" + str(y_s) + "-" + str(y_e) + ")")

        # Detectar bloques en la fila
        b_starts, b_ends = detectar_bloques(mask, y_s, y_e)
        print("  Bloques detectados: " + str(len(b_starts)) + " | Usando: " + str(len(modelos_fila)))

        # SOLO procesar los primeros N bloques (donde N = cantidad de modelos en la fila)
        for b_idx in range(min(len(modelos_fila), len(b_starts))):
            x_s, x_e = b_starts[b_idx], b_ends[b_idx]
            phones = detectar_iphones_en_bloque(mask, y_s, y_e, x_s, x_e)

            if not phones:
                print("    Bloque " + str(b_idx + 1) + ": ❌ sin iPhones")
                continue

            # Tomar el iPhone del MEDIO del bloque (mejor representacion del modelo)
            mid_idx = len(phones) // 2
            phone_s, phone_e = phones[mid_idx]
            crop = recortar_phone(img, mask, y_s, y_e, x_s, x_e, phone_s, phone_e)

            if crop is None:
                continue

            slug = modelos_fila[b_idx]
            nombre = slug + ".png"
            ruta_salida = os.path.join(salida, nombre)

            # Si ya existe, no sobreescribir
            if os.path.exists(ruta_salida):
                base, ext = os.path.splitext(nombre)
                counter = 1
                while os.path.exists(os.path.join(salida, base + "_" + str(counter) + ext)):
                    counter += 1
                ruta_salida = os.path.join(salida, base + "_" + str(counter) + ext)

            crop.save(ruta_salida)
            asignados += 1
            print("    ✅ " + slug + " -> " + ruta_salida + " (" + str(crop.size[0]) + "x" + str(crop.size[1]) + ")")
            recortados += 1

    print("\n" + "=" * 50)
    print("RESUMEN")
    print("=" * 50)
    print("Recortes totales: " + str(recortados))
    print("Asignados automaticamente: " + str(asignados))
    print("Guardados en: " + salida + "/")
    print("\n👉 Ahora corre: npm run imagenes")
    print("=" * 50)


if __name__ == "__main__":
    main()
