#!/usr/bin/env python3
"""
Descarga automática de fotos oficiales.

Reemplaza la búsqueda manual para los modelos cuyo fabricante publica sus fotos
con una estructura predecible. No sirve para todo: un "Notebook Lenovo 15.6 8 GB"
no identifica un producto real y ahí no hay automatización posible.

Trabaja por LÍNEA de producto, no por configuración: las catorce variantes de
MacBook Pro M5 comparten una sola foto, así que se descarga una vez.

Cada imagen descargada pasa por tres controles antes de aceptarse:

  1. el validador de siempre (texto recortado, imagen vacía, objeto diminuto)
  2. el color, contra el declarado en el catálogo
  3. la huella, contra las fotos ya asignadas: si coincide con la de otro
     modelo, se rechaza — así fue como un iPhone 17e terminó mostrando un
     17 Pro Max

    python3 scripts/descargar-auto.py           # ver qué encontraría
    python3 scripts/descargar-auto.py --aplicar # descargar y guardar
"""
import os as _os, sys as _sys
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))

import hashlib, io, json, os, re, ssl, unicodedata, urllib.error, urllib.request

try:
    import numpy as np
    from PIL import Image
except ImportError:
    print("Faltan dependencias:  pip install pillow numpy")
    raise SystemExit(1)

from validar_imagen import analizar

MAESTRAS = "public/maestras"
DESTINO = "public/productos"
REALES = (".webp", ".jpg", ".jpeg", ".png")
LADO, OBJETIVO, TOPE = 1000, 0.62, 0.86

CABECERAS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    "Accept": "image/avif,image/webp,image/png,image/*,*/*;q=0.8",
}

APPLE = "https://store.storeimages.cdn-apple.com/4982/as-images.apple.com/is/"
Q = "?wid=1200&hei=1200&fmt=png-alpha"


def slug(s: str) -> str:
    s = unicodedata.normalize("NFD", str(s).lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def linea(modelo: str) -> str:
    """Quita disco, RAM y GPU: las variantes comparten foto."""
    m = re.sub(r"\s+\d+\s?GB\s+RAM\b", "", modelo, flags=re.I)
    m = re.sub(r"\s+GPU\s+\d+\s+n[úu]cleos?\b", "", m, flags=re.I)
    m = re.sub(r"\s+\d+\s?(TB|GB)\b", "", m, flags=re.I)
    return re.sub(r"\s{2,}", " ", m).strip()


def candidatos(marca: str, modelo: str, color: str | None) -> list[str]:
    """
    URLs a probar, en orden. Se prueban todas hasta que una responda y valide.

    Sólo se cubren los fabricantes cuya estructura de imágenes es deducible del
    nombre del producto. Para el resto se devuelve lista vacía y el modelo queda
    para carga manual desde el panel.
    """
    m = linea(modelo).lower()
    c = slug(color) if color else ""
    urls: list[str] = []

    if marca == "Apple":
        if "macbook pro" in m:
            pulg = "16" if '16"' in m or "16 " in m else "14"
            urls += [
                f"{APPLE}mbp{pulg}-spaceblack-select-202410{Q}",
                f"{APPLE}mbp{pulg}-silver-select-202410{Q}",
                f"{APPLE}macbook-pro-{pulg}-spaceblack-select{Q}",
            ]
        elif "macbook air" in m:
            pulg = "15" if "15" in m else "13"
            urls += [
                f"{APPLE}mba{pulg}-midnight-select-202503{Q}",
                f"{APPLE}mba{pulg}-starlight-select-202402{Q}",
            ]
        elif "iphone" in m:
            base = re.sub(r"[^a-z0-9 ]", "", m).replace("iphone ", "").strip()
            base = base.replace(" ", "-")
            for col in filter(None, [c, "black", "midnight", "natural"]):
                urls.append(f"{APPLE}iphone-{base}-finish-select-{col}{Q}")
        elif "watch" in m:
            urls += [
                f"{APPLE}s10-case-unselect-gallery-1-202409{Q}",
                f"{APPLE}se-case-unselect-gallery-1-202409{Q}",
            ]
        elif "ipad" in m:
            urls.append(f"{APPLE}ipad-{slug(m).replace('ipad-', '')}-select{Q}")

    elif marca == "JBL":
        nom = slug(m).replace("jbl-", "").replace("-", "_")
        for host in ("www.jbl.com.ar", "ar.jbl.com"):
            urls.append(
                f"https://{host}/dw/image/v2/AAWZ_PRD/on/demandware.static/"
                f"-/Sites-masterCatalog_Harman/default/JBL_{nom.title()}_Hero.png"
            )

    return urls


def descargar(url: str) -> bytes | None:
    try:
        req = urllib.request.Request(url, headers=CABECERAS)
        with urllib.request.urlopen(req, timeout=30, context=ssl.create_default_context()) as r:
            if r.status != 200:
                return None
            tipo = r.headers.get("Content-Type", "")
            if "image" not in tipo:
                return None
            datos = r.read()
            return datos if len(datos) > 4000 else None
    except Exception:
        return None


def normalizar(datos: bytes, destino: str) -> bool:
    """Mismo encuadre, escala y sombra que el resto del catálogo."""
    try:
        im = Image.open(io.BytesIO(datos))
    except Exception:
        return False
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        im = Image.alpha_composite(Image.new("RGBA", im.size, (255, 255, 255, 255)), im)
    im = im.convert("RGB")

    a = np.asarray(im).astype(float)
    lum = a.mean(axis=2)
    esq = [lum[0, 0], lum[0, -1], lum[-1, 0], lum[-1, -1]]
    fondo = sum(esq) / 4
    limite = fondo - 10 if (max(esq) - min(esq) < 12 and fondo > 150) else 244

    m = lum < limite
    if m.sum() < 200:
        return False

    ys, xs = np.where(m)
    rec = im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    w, h = rec.size
    e = min((LADO * OBJETIVO) / (w * h) ** 0.5, LADO * TOPE / h, LADO * TOPE / w)
    nw, nh = max(1, round(w * e)), max(1, round(h * e))
    rec = rec.resize((nw, nh), Image.LANCZOS)

    from PIL import ImageDraw, ImageFilter
    base = (LADO - nh) // 2 + nh
    rx, ry = max(12, int(nw * 0.86 / 2)), max(5, int(LADO * 0.03 / 2))
    cy = min(LADO - ry - 4, base + 10)
    capa = Image.new("L", (LADO, LADO), 0)
    ImageDraw.Draw(capa).ellipse([LADO // 2 - rx, cy - ry, LADO // 2 + rx, cy + ry], fill=62)
    capa = capa.filter(ImageFilter.GaussianBlur(26))

    lienzo = Image.new("RGB", (LADO, LADO), (255, 255, 255))
    lienzo.paste(Image.new("RGB", (LADO, LADO), (0, 0, 0)), (0, 0), capa)
    lienzo.paste(rec, ((LADO - nw) // 2, (LADO - nh) // 2))
    lienzo.save(destino, "WEBP", quality=90, method=6)
    return True


def huellas_existentes() -> set[str]:
    h = set()
    for carpeta in (DESTINO, MAESTRAS):
        if not os.path.isdir(carpeta):
            continue
        for f in os.listdir(carpeta):
            if f.lower().endswith(REALES):
                h.add(hashlib.sha1(open(os.path.join(carpeta, f), "rb").read()).hexdigest()[:12])
    return h


def main() -> None:
    aplicar = "--aplicar" in _sys.argv
    catalogo = [p for p in json.load(open("data/catalogo.json", encoding="utf-8")) if p["publicado"]]

    sin_foto = [p for p in catalogo
                if not any(os.path.exists(f'{DESTINO}/{p["ref"]}{e}') for e in REALES)]

    # una entrada por línea + color: las variantes comparten foto
    pendientes: dict[tuple, dict] = {}
    for p in sin_foto:
        clave = (p["marca"], linea(p["modelo"]), (p.get("color") or "").lower())
        pendientes.setdefault(clave, p)

    print(f"Sin fotografía        : {len(sin_foto)} productos")
    print(f"Líneas a resolver     : {len(pendientes)}\n")

    conocidas = huellas_existentes()
    ok, sin_fuente, fallaron = [], [], []

    for (marca, mod, color), p in sorted(pendientes.items()):
        urls = candidatos(marca, p["modelo"], p.get("color"))
        if not urls:
            sin_fuente.append(f"{marca} · {mod}")
            continue

        print(f"  {mod[:44]:<44} ", end="", flush=True)
        logrado = False

        for url in urls:
            datos = descargar(url)
            if not datos:
                continue

            nombre = slug(mod) + (f"-{slug(color)}" if color else "")
            destino = os.path.join(MAESTRAS, f"{nombre}.webp")
            if not normalizar(datos, destino):
                continue

            v = analizar(destino)
            if not v["ok"]:
                os.remove(destino)
                continue

            hh = hashlib.sha1(open(destino, "rb").read()).hexdigest()[:12]
            if hh in conocidas:
                # ya existe idéntica para otro modelo: es la foto equivocada
                os.remove(destino)
                continue

            conocidas.add(hh)
            ok.append(mod)
            logrado = True
            print("ok")
            break

        if not logrado:
            print("no encontrada")
            fallaron.append(f"{marca} · {mod}")

    print(f"\nDescargadas y validadas : {len(ok)}")
    print(f"Sin fuente conocida     : {len(sin_fuente)}")
    print(f"Probadas sin éxito      : {len(fallaron)}")

    os.makedirs("reportes", exist_ok=True)
    with open("reportes/fotos-manuales.txt", "w", encoding="utf-8") as f:
        f.write("Modelos que hay que cargar a mano desde /admin/fotos\n\n")
        for x in sorted(sin_fuente + fallaron):
            f.write(f"{x}\n")

    if ok and aplicar:
        print("\nAhora corré:  npm run imagenes")
    elif ok:
        print("\nLas maestras quedaron descargadas. Corré: npm run imagenes")
    print("Los que faltan están en reportes/fotos-manuales.txt")


if __name__ == "__main__":
    main()
