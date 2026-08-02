#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Descargador de imagenes para iPhoneConnection.
Usa Bing Images (mas permisivo que DDG desde Termux).
Solo necesita: pip install requests
"""

import re
import time
import requests
from pathlib import Path

MAESTRAS = Path("public/maestras")
LISTA = Path("modelos-sin-foto.txt")
DELAY = 2.5
TIMEOUT = 25

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0",
}

IMG_HEADERS = {
    "User-Agent": HEADERS["User-Agent"],
    "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    "Referer": "https://www.bing.com/images/search",
}


def bing_image_urls(query, max_results=10):
    """Busca imagenes en Bing y devuelve lista de URLs."""
    urls = []
    try:
        q = requests.utils.quote(query)
        url = f"https://www.bing.com/images/search?q={q}&form=HDRSC2&first=1"
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        text = r.text

        # Patron 1: murl en atributo m (JSON escapado)
        pattern1 = r'&quot;murl&quot;:&quot;(https?://[^&]+)&quot;'
        found = re.findall(pattern1, text)
        urls.extend([u.replace("\\u0026", "&") for u in found])

        # Patron 2: murl en JSON no escapado
        pattern2 = r'"murl":"(https?://[^"]+)"'
        found = re.findall(pattern2, text)
        urls.extend(found)

        # Patron 3: mediaurl
        pattern3 = r'"mediaurl":"(https?://[^"]+)"'
        found = re.findall(pattern3, text)
        urls.extend(found)

        # Patron 4: url en bloques de imagen
        pattern4 = r'"ou":"(https?://[^"]+)"'
        found = re.findall(pattern4, text)
        urls.extend(found)

        # Deduplicar y limpiar
        seen = set()
        clean = []
        for u in urls:
            u = u.strip().replace("\\u0026", "&").replace("\\", "")
            if u in seen or not u.startswith("http"):
                continue
            seen.add(u)
            clean.append(u)
        return clean[:max_results]
    except Exception as e:
        print(f"   ⚠️  Error Bing: {e}")
        return []


def download(url, dest):
    """Descarga imagen desde URL."""
    try:
        r = requests.get(url, headers=IMG_HEADERS, timeout=TIMEOUT, stream=True)
        if r.status_code == 200:
            data = r.content
            if len(data) > 2048:
                ct = r.headers.get("Content-Type", "")
                if "image" in ct or "octet-stream" in ct:
                    dest.write_bytes(data)
                    return True
    except Exception:
        pass
    return False


def parse_lista():
    items = []
    if not LISTA.exists():
        print(f"❌ No se encontro {LISTA}")
        return items
    with open(LISTA, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            m = re.match(r"^(\S+\.\w+)\s+#\s*(.+)$", line)
            if m:
                items.append((m.group(1).strip(), m.group(2).strip()))
    return items


def mejorar_query(archivo, producto):
    prefijos = {
        "iphone": "Apple iPhone",
        "ipad": "Apple iPad",
        "macbook": "Apple MacBook",
        "apple-watch": "Apple Watch",
        "apple-pencil": "Apple Pencil",
        "airpods": "Apple AirPods",
        "airtag": "Apple AirTag",
        "samsung-galaxy": "Samsung Galaxy",
        "samsung-tab": "Samsung Galaxy Tab",
        "xiaomi": "Xiaomi",
        "poco": "Xiaomi Poco",
        "motorola": "Motorola",
        "jbl": "JBL",
        "ps5": "PlayStation 5 PS5",
        "nintendo-switch": "Nintendo Switch",
        "garmin": "Garmin",
        "amazfit": "Amazfit",
        "gopro": "GoPro",
        "volante-logitech": "Logitech steering wheel PS5",
        "cargador": "original charger",
        "cable": "original cable",
        "notebook": "laptop notebook",
        "smart-watch": "smartwatch",
        "wallet-magsafe": "Apple MagSafe Wallet",
        "malla-nike": "Nike Apple Watch band",
        "xiaomi-sport-band": "Xiaomi Sport Band",
        "joystick": "DualSense controller",
    }
    base = producto
    low = archivo.lower()
    for pref, marca in prefijos.items():
        if low.startswith(pref):
            base = f"{marca} {producto}"
            break
    return f"{base} official product image white background"


def main():
    print("═" * 60)
    print("  📸 Descargador de imagenes (Bing Images)")
    print("═" * 60)

    MAESTRAS.mkdir(parents=True, exist_ok=True)
    items = parse_lista()
    if not items:
        return

    print(f"📋 Total: {len(items)}\n")
    ok = 0
    fail = []

    for idx, (archivo, producto) in enumerate(items, 1):
        dest = MAESTRAS / archivo
        if dest.exists():
            print(f"[{idx:03d}/{len(items)}] ⏭️  {archivo}")
            ok += 1
            continue

        q = mejorar_query(archivo, producto)
        print(f"[{idx:03d}/{len(items)}] 🔍 {producto}")
        print(f"         → {q}")

        urls = bing_image_urls(q, max_results=12)
        if not urls:
            print(f"         ❌ Bing no devolvio resultados")
            fail.append((archivo, producto))
            time.sleep(DELAY)
            continue

        downloaded = False
        for u in urls:
            if download(u, dest):
                kb = dest.stat().st_size / 1024
                print(f"         ✅ {kb:.1f} KB")
                ok += 1
                downloaded = True
                break
            time.sleep(0.4)

        if not downloaded:
            print(f"         ❌ Ninguna URL descargo correctamente")
            fail.append((archivo, producto))

        time.sleep(DELAY)

    print("\n" + "═" * 60)
    print(f"  ✅ {ok}/{len(items)}  |  ❌ {len(fail)}")
    print("═" * 60)
    if fail:
        print("\nFaltantes:")
        for a, p in fail:
            print(f"   - {a} ({p})")
        print("\n💡 Volve a correr el script para reintentar.")
    print("\n🚀 npm run imagenes")


if __name__ == "__main__":
    main()
