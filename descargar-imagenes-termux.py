#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Descargador de imágenes para iPhoneConnection.
Solo usa 'requests' (sin duckduckgo-search, sin Rust).
Instalación: pip install requests
"""

import re
import time
import json
import requests
from pathlib import Path

MAESTRAS = Path("public/maestras")
LISTA = Path("modelos-sin-foto.txt")
DELAY = 2.0
TIMEOUT = 20

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Connection": "keep-alive",
}

IMG_HEADERS = {
    "User-Agent": HEADERS["User-Agent"],
    "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    "Referer": "https://duckduckgo.com/",
}


def get_vqd(query):
    """Obtiene token vqd de DuckDuckGo."""
    try:
        r = requests.get(
            "https://duckduckgo.com/",
            params={"q": query},
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        m = re.search(r'vqd="([^"]+)"', r.text)
        if m:
            return m.group(1)
        m = re.search(r'vqd=([a-zA-Z0-9_-]+)', r.text)
        if m:
            return m.group(1)
    except Exception as e:
        print(f"   ⚠️  Error obteniendo vqd: {e}")
    return None


def search_ddg(query, vqd, max_results=10):
    """Busca imágenes en DuckDuckGo vía endpoint i.js."""
    try:
        r = requests.get(
            "https://duckduckgo.com/i.js",
            params={
                "q": query,
                "vqd": vqd,
                "f": ",,,",
                "p": "1",
            },
            headers={
                **HEADERS,
                "Accept": "application/json",
                "Referer": f"https://duckduckgo.com/?q={requests.utils.quote(query)}",
                "X-Requested-With": "XMLHttpRequest",
            },
            timeout=TIMEOUT,
        )
        data = r.json()
        results = data.get("results", [])
        return results[:max_results]
    except Exception as e:
        print(f"   ⚠️  Error en búsqueda: {e}")
        return []


def download(url, dest):
    """Descarga imagen desde URL."""
    try:
        r = requests.get(url, headers=IMG_HEADERS, timeout=TIMEOUT)
        if r.status_code == 200 and len(r.content) > 1024:
            ct = r.headers.get("Content-Type", "")
            if "image" in ct or "octet-stream" in ct:
                dest.write_bytes(r.content)
                return True
    except Exception:
        pass
    return False


def parse_lista():
    items = []
    if not LISTA.exists():
        print(f"❌ No se encontró {LISTA}")
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
    return f"{base} official product image"


def main():
    print("═" * 60)
    print("  📸 Descargador de imágenes (solo requests)")
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

        vqd = get_vqd(q)
        if not vqd:
            print(f"         ❌ No se obtuvo token vqd")
            fail.append((archivo, producto))
            time.sleep(DELAY)
            continue

        results = search_ddg(q, vqd)
        downloaded = False
        for r in results:
            url = r.get("image") or r.get("thumbnail")
            if not url:
                continue
            if download(url, dest):
                kb = dest.stat().st_size / 1024
                print(f"         ✅ {kb:.1f} KB")
                ok += 1
                downloaded = True
                break
            time.sleep(0.5)

        if not downloaded:
            print(f"         ❌ Sin resultados válidos")
            fail.append((archivo, producto))

        time.sleep(DELAY)

    print("\n" + "═" * 60)
    print(f"  ✅ {ok}/{len(items)}  |  ❌ {len(fail)}")
    print("═" * 60)
    if fail:
        print("\nFaltantes:")
        for a, p in fail:
            print(f"   - {a} ({p})")
        print("\n💡 Volvé a correr el script para reintentar solo los faltantes.")
    print("\n🚀 npm run imagenes")


if __name__ == "__main__":
    main()
