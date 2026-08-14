#!/usr/bin/env python3
"""
Pipeline de imagenes maestras · iPhone Connection  (v2.2 robusta)

Reemplaza al segmentador de laminas. El modelo pasa a ser la unidad de trabajo:

    public/maestras/{modelo-slug}.{jpg|png|webp}   <- una imagen por modelo
                    | propagacion automatica
    public/productos/{REF}.webp                     <- todas sus referencias

Para agregar la foto de un modelo alcanza con dejar el archivo en `maestras/`
con el slug del modelo y correr `npm run imagenes`. No hay que tocar codigo ni
saber que referencias existen.

Normalizacion aplicada a toda imagen maestra, para que el catalogo se vea
uniforme aunque las fotos vengan de fuentes distintas:
  - recorte del fondo sobrante
  - centrado en lienzo cuadrado de 1000x1000
  - fondo blanco puro
  - mismo margen y mismo zoom relativo
  - WebP optimizado

Si un modelo no tiene maestra, conserva su imagen generada.
"""
import os as _os, sys as _sys
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))

import json, os, re, shutil, unicodedata
import numpy as np
from PIL import Image, UnidentifiedImageError

try:
    from validar_imagen import analizar
except Exception:
    # Fallback si no existe validar_imagen.py
    def analizar(ruta):
        return {"ok": True, "motivo": ""}

MAESTRAS = "public/maestras"
DESTINO = "public/productos"
ENTRADA = (".jpg", ".jpeg", ".png", ".webp")
LADO = 1000
MARGEN = 0.08          # proporcion del lado que queda libre alrededor
UMBRAL_FONDO = 244

# Magic bytes para validar imagenes reales antes de tocar PIL
MAGIC_IMAGEN = {
    b"\xff\xd8": "jpeg",
    b"\x89PNG": "png",
    b"GIF87a": "gif",
    b"GIF89a": "gif",
    b"RIFF": "webp",   # webp empieza con RIFF....WEBP
}


def es_imagen_valida(ruta: str) -> bool:
    """Verifica magic bytes antes de intentar abrir con PIL."""
    try:
        with open(ruta, "rb") as f:
            header = f.read(16)
    except Exception:
        return False

    if len(header) < 4:
        return False

    for magic, fmt in MAGIC_IMAGEN.items():
        if header.startswith(magic):
            # Para webp, verificar que sea realmente webp (RIFF...WEBP)
            if fmt == "webp":
                return b"WEBP" in header
            return True

    return False


def slug(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def normalizar(origen: str, destino: str) -> bool:
    """Recorta, centra sobre blanco y exporta WebP de 1000x1000."""
    try:
        im = Image.open(origen)
    except UnidentifiedImageError:
        return False
    except Exception:
        return False

    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        fondo = Image.new("RGBA", im.size, (255, 255, 255, 255))
        im = Image.alpha_composite(fondo, im)
    im = im.convert("RGB")

    a = np.asarray(im).astype(float)
    tinta = a.mean(axis=2) < UMBRAL_FONDO
    if tinta.sum() < 200:
        return False

    ys, xs = np.where(tinta)
    im = im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))

    w, h = im.size
    disponible = LADO * (1 - MARGEN * 2)
    factor = disponible / max(w, h)
    nuevo_w = max(1, int(w * factor))
    nuevo_h = max(1, int(h * factor))
    im = im.resize((nuevo_w, nuevo_h), Image.LANCZOS)

    lienzo = Image.new("RGB", (LADO, LADO), (255, 255, 255))
    lienzo.paste(im, ((LADO - im.width) // 2, (LADO - im.height) // 2))
    lienzo.save(destino, "WEBP", quality=86, method=6)
    return True


def main() -> None:
    os.makedirs(MAESTRAS, exist_ok=True)
    os.makedirs("reportes", exist_ok=True)

    catalogo = [p for p in json.load(open("data/catalogo.json", encoding="utf-8")) if p["publicado"]]
    por_slug = {}
    for p in catalogo:
        por_slug.setdefault(slug(p["modelo"]), []).append(p)

    # ---- 1. normalizar las maestras nuevas ----
    disponibles, rechazadas = {}, []
    for f in sorted(os.listdir(MAESTRAS)):
        nombre, ext = os.path.splitext(f)
        if ext.lower() not in ENTRADA:
            continue
        # Las maestras pueden llamarse {modelo} o {modelo}-{color}. Aceptar sólo
        # la primera forma descartaba las 108 fotos por color, y por eso todas
        # las unidades de un modelo terminaban con la misma imagen.
        if nombre not in por_slug and not any(nombre.startswith(m + "-") for m in por_slug):
            rechazadas.append((f, "no corresponde a ningun modelo del catalogo"))
            continue

        origen = os.path.join(MAESTRAS, f)

        # VALIDACION ROBUSTA: verificar que sea imagen real antes de tocar PIL
        if not es_imagen_valida(origen):
            rechazadas.append((f, "archivo corrupto o no es una imagen real (probablemente HTML descargado por error)"))
            continue

        salida = os.path.join(MAESTRAS, f"{nombre}.webp")
        # Si ya es WebP de 1000x1000 viene normalizada del descargador: no se reprocesa.
        try:
            ya_lista = ext.lower() == ".webp" and Image.open(origen).size == (LADO, LADO)
        except Exception:
            ya_lista = False

        if not ya_lista and not normalizar(origen, salida):
            rechazadas.append((f, "imagen vacia o sin contenido"))
            continue
        if ext.lower() != ".webp":
            os.remove(origen)   # ya existe la version WebP normalizada

        v = analizar(salida)
        if not v["ok"]:
            os.remove(salida)
            rechazadas.append((f, v["motivo"]))
            continue
        disponibles[nombre] = salida

    # ---- 2. propagar, prefiriendo la maestra del color exacto ----
    # Hay maestras nombradas {modelo}-{color}: sin esto, todas las unidades de
    # un modelo recibían la misma foto y se perdía la distinción por color.
    # La maestra solo se aplica donde no hay ya una foto: una imagen verificada
    # para esa referencia puntual es mas precisa que la del modelo.
    asignadas, modelos_ok = 0, 0
    def color_slug(p):
        # Si la unidad declara varios colores, no se le asigna la foto de uno:
        # mostraría un equipo rosa donde el título dice "Rosa / Verde".
        if p.get("colores") and len(p["colores"]) > 1:
            return None
        c = p.get("color") or (p.get("colores") or [None])[0]
        return slug(c) if c else None

    # primero las maestras con color: {modelo}-{color}
    usadas = set()
    for s, imagen in disponibles.items():
        for modelo_slug, unidades in por_slug.items():
            if not s.startswith(modelo_slug + "-"):
                continue
            color = s[len(modelo_slug) + 1:]
            for p in unidades:
                if color_slug(p) == color and p["ref"] not in usadas:
                    if any(os.path.exists(f'{DESTINO}/{p["ref"]}{e}') for e in (".jpg", ".jpeg", ".png")):
                        continue
                    shutil.copy(imagen, os.path.join(DESTINO, f'{p["ref"]}.webp'))
                    usadas.add(p["ref"])
                    asignadas += 1
            modelos_ok += 1

    # Después las maestras sin color, para lo que quedó sin asignar.
    for s, imagen in disponibles.items():
        for p in por_slug.get(s, []):
            if p["ref"] in usadas:
                continue
            if any(os.path.exists(f'{DESTINO}/{p["ref"]}{e}') for e in (".jpg", ".jpeg", ".png")):
                continue
            shutil.copy(imagen, os.path.join(DESTINO, f'{p["ref"]}.webp'))
            usadas.add(p["ref"])
            asignadas += 1
        modelos_ok += 1

    # Último recurso: reutilizar la foto de otra unidad del MISMO modelo, pero
    # sólo si el color coincide o si ninguna de las dos lo declara. Reutilizar
    # sin mirar el color publicaba un iPhone Plata con la foto del Rosa, que es
    # peor que no tener foto: el cliente compra por lo que ve.
    reales_ext = (".webp", ".jpg", ".jpeg", ".png")
    def color_de(p):
        c = p.get("color") or (p.get("colores") or [None])[0]
        return slug(c) if c else None

    for modelo_slug, unidades in por_slug.items():
        con_foto = [p for p in unidades
                    if any(os.path.exists(f'{DESTINO}/{p["ref"]}{e}') for e in reales_ext)]
        if not con_foto:
            continue
        for p in unidades:
            if any(os.path.exists(f'{DESTINO}/{p["ref"]}{e}') for e in reales_ext):
                continue
            mismo = next((q for q in con_foto if color_de(q) == color_de(p)), None)
            if not mismo:
                continue
            origen = next(f'{DESTINO}/{mismo["ref"]}{e}' for e in reales_ext
                          if os.path.exists(f'{DESTINO}/{mismo["ref"]}{e}'))
            shutil.copy(origen, os.path.join(DESTINO, f'{p["ref"]}.webp'))
            asignadas += 1

    # ---- 3. informe ----
    reales = (".webp", ".jpg", ".jpeg", ".png")
    con_foto = [p for p in catalogo
                if any(os.path.exists(f'{DESTINO}/{p["ref"]}{e}') for e in reales)]
    sin_foto = sorted({p["modelo"] for p in catalogo if p not in con_foto})

    print(f"Maestras normalizadas   : {modelos_ok}")
    print(f"Referencias asignadas   : {asignadas}")
    print(f"Fotos reales            : {len(con_foto)} / {len(catalogo)}")
    print(f"Imagen generada         : {len(catalogo) - len(con_foto)}")
    print(f"Modelos sin fotografia  : {len(sin_foto)}")

    if rechazadas:
        print(f"\nRechazadas ({len(rechazadas)}):")
        for f, motivo in rechazadas:
            print(f"  - {f}: {motivo}")

    with open("reportes/modelos-sin-foto.txt", "w", encoding="utf-8") as f:
        f.write("# Deja la imagen en public/maestras/ con este nombre y corre: npm run imagenes\n")
        for m in sin_foto:
            f.write(f"{slug(m)}.jpg    # {m}\n")


if __name__ == "__main__":
    main()
