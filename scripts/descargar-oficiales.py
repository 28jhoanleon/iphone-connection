#!/usr/bin/env python3
"""
Descarga de imágenes oficiales de fabricante · iPhone Connection

Corre en TU máquina (Termux, PC, lo que sea con salida a internet). Descarga las
imágenes del catálogo de fuentes, las normaliza y las deja en public/maestras/
con el nombre de slug que espera el pipeline.

    python3 scripts/descargar-oficiales.py
    npm run imagenes

Cada imagen se recorta, se centra sobre blanco puro y se exporta a 1000x1000
WebP con el mismo margen que el resto del catálogo. Si una URL falla o la imagen
no pasa la validación, se informa y ese modelo conserva su imagen generada.

El catálogo de fuentes vive en data/fuentes-imagenes.json: para agregar un modelo
alcanza con sumar una entrada ahí, sin tocar este script.
"""
import os as _os, sys as _sys
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))

import io, json, os, ssl, urllib.request, urllib.error

try:
    from PIL import Image
    import numpy as np
except ImportError:
    print("""
Faltan dependencias de imagen. Instalalas con:

  Termux : pkg install -y python && pip install pillow numpy
  Linux  : pip3 install pillow numpy
  macOS  : pip3 install pillow numpy
  Windows: py -m pip install pillow numpy
""")
    raise SystemExit(1)

from validar_imagen import analizar

MAESTRAS = "public/maestras"
LADO = 1000
MARGEN = 0.08
UMBRAL_FONDO = 244
TIMEOUT = 45

# Algunos CDN rechazan peticiones sin navegador declarado.
CABECERAS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept": "image/avif,image/webp,image/png,image/*,*/*;q=0.8",
}


def descargar(url: str):
    """Devuelve (datos, diagnóstico). Nunca lanza: un fallo no corta el proceso."""
    ctx = ssl.create_default_context()
    try:
        req = urllib.request.Request(url, headers=CABECERAS)
        with urllib.request.urlopen(req, timeout=TIMEOUT, context=ctx) as r:
            datos = r.read()
            redirigida = r.geturl() != url
            if r.status != 200:
                return None, f"HTTP {r.status}"
            if not datos:
                return None, "archivo vacío"
            tipo = r.headers.get("Content-Type", "")
            if "image" not in tipo:
                return None, f"no es imagen ({tipo or 'sin content-type'})"
            return datos, ("descargada · redirección" if redirigida else "descargada")
    except urllib.error.HTTPError as e:
        return None, f"HTTP {e.code}"
    except urllib.error.URLError as e:
        return None, f"sin conexión ({str(e.reason)[:40]})"
    except Exception as e:
        return None, f"error ({type(e).__name__})"


def normalizar(datos: bytes, destino: str) -> bool:
    """Aplana transparencia sobre blanco, recorta el sobrante y centra a 1000x1000."""
    try:
        im = Image.open(io.BytesIO(datos))
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
    factor = (LADO * (1 - MARGEN * 2)) / max(w, h)
    im = im.resize((max(1, int(w * factor)), max(1, int(h * factor))), Image.LANCZOS)

    lienzo = Image.new("RGB", (LADO, LADO), (255, 255, 255))
    lienzo.paste(im, ((LADO - im.width) // 2, (LADO - im.height) // 2))
    lienzo.save(destino, "WEBP", quality=90, method=6)
    return True


def main() -> None:
    os.makedirs(MAESTRAS, exist_ok=True)
    os.makedirs("reportes", exist_ok=True)
    fuentes = json.load(open("data/fuentes-imagenes.json", encoding="utf-8"))

    catalogo = [p for p in json.load(open("data/catalogo.json", encoding="utf-8")) if p["publicado"]]
    modelos = {p["modelo"] for p in catalogo}

    REALES = (".webp", ".jpg", ".jpeg", ".png")
    antes = {p["ref"] for p in catalogo
             if any(os.path.exists(f'public/productos/{p["ref"]}{e}') for e in REALES)}
    print(f"Cobertura antes: {len(antes)}/{len(catalogo)}\n")

    ok, fallidas, equivalentes = [], [], []

    entradas = [(k, v) for k, v in fuentes.items() if not k.startswith("_") and v.get("url")]
    invalidas = [k for k, v in fuentes.items() if not k.startswith("_") and not v.get("url")]
    total = len(entradas)
    for i, (slug_modelo, info) in enumerate(entradas):
        destino = os.path.join(MAESTRAS, f"{slug_modelo}.webp")
        if os.path.exists(destino):
            ok.append(slug_modelo)
            continue

        print(f"  [{i+1}/{total}] {slug_modelo} … ", end="", flush=True)
        datos, diag = descargar(info["url"])
        if not datos:
            print(diag)
            fallidas.append((slug_modelo, diag))
            continue

        transparencia = datos[:8] == b"\x89PNG\r\n\x1a\n" and b"tRNS" in datos[:2000] or b"RGBA" in datos[:100]
        if not normalizar(datos, destino):
            print("imagen corrupta o sin contenido")
            fallidas.append((slug_modelo, "imagen corrupta"))
            continue

        v = analizar(destino)
        if not v["ok"]:
            os.remove(destino)
            print(f"rechazada ({v['motivo']})")
            fallidas.append((slug_modelo, v["motivo"]))
            continue

        print(f"{diag} · {os.path.getsize(destino)//1024} KB" + (" · PNG con transparencia" if transparencia else ""))
        ok.append(slug_modelo)
        if info.get("equivalente"):
            equivalentes.append((slug_modelo, info["equivalente"]))

    if invalidas:
        print(f"\nSin URL válida ({len(invalidas)}): {', '.join(invalidas)}")
    print(f"\nDescargadas y validadas : {len(ok)}")
    print(f"Con foto equivalente    : {len(equivalentes)}")
    print(f"Fallidas                : {len(fallidas)}")
    for s, motivo in fallidas:
        print(f"  · {s}: {motivo}")

    huerfanas = [k for k in ok if k not in {__import__("re").sub(r"[^a-z0-9]+", "-",
                 __import__("unicodedata").normalize("NFKD", m.lower())).strip("-") for m in modelos}]
    if huerfanas:
        print(f"\nSin modelo asociado en el catálogo ({len(huerfanas)}): {huerfanas[:8]}")

    with open("reportes/descarga-oficiales.txt", "w", encoding="utf-8") as f:
        f.write(f"Descargadas: {len(ok)}\nFallidas: {len(fallidas)}\n\n")
        for s_, motivo in fallidas:
            f.write(f"{s_}: {motivo}\n")

    print(f"\nCobertura antes: {len(antes)}/{len(catalogo)}")
    print("Ahora corré:  npm run imagenes")


if __name__ == "__main__":
    main()
