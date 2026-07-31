#!/usr/bin/env python3
"""
Verificación previa al deploy.
Corta el build si falta un dato real de la empresa: la regla del proyecto es
que no haya datos de ejemplo en ninguna pantalla.
"""
import json, sys

OBLIGATORIOS = ["whatsapp", "instagram", "zona", "horarios", "socios"]
DESCRIPCION = {
    "whatsapp": "Número comercial propio con código de país (ej: 5493411234567)",
    "instagram": "Usuario de Instagram de la marca",
    "zona": "Ciudad o zona de operación",
    "horarios": "Días y horario de atención",
    "socios": "Nombres de los dos socios",
}

e = json.load(open("data/empresa.json", encoding="utf-8"))
faltan = [k for k in OBLIGATORIOS if not e.get(k)]

if faltan:
    print("\n  No se puede publicar. Faltan datos reales de la empresa:\n")
    for k in faltan:
        print(f"   · {k:<10} {DESCRIPCION[k]}")
    print("\n  Completalos en data/empresa.json\n")
    sys.exit(1)

print(f"  Datos de empresa completos · {e['nombre']}")
