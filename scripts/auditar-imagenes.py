#!/usr/bin/env python3
"""
Auditoría de imágenes del catálogo.

Recorre todas las imágenes reales de public/productos, valida cada una y borra
las que no pasan. El catálogo cae automáticamente a la imagen generada, que
siempre existe. Sale con error si queda algún producto sin imagen.

Uso:  python3 scripts/auditar-imagenes.py [--borrar]
"""
import csv, hashlib, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from validar_imagen import analizar

DIR = "public/productos"
REALES = (".webp", ".jpg", ".jpeg", ".png")
borrar = "--borrar" in sys.argv

catalogo = [p for p in json.load(open("data/catalogo.json", encoding="utf-8")) if p["publicado"]]
filas, invalidas, sin_imagen = [], [], []

for p in catalogo:
    ref = p["ref"]
    real = next((f"{DIR}/{ref}{e}" for e in REALES if os.path.exists(f"{DIR}/{ref}{e}")), None)
    generada = os.path.exists(f"{DIR}/{ref}.svg")

    if real:
        v = analizar(real)
        estado = "OK" if v["ok"] else "FALLBACK"
        filas.append({
            "referencia": ref, "producto": p["nombre"], "categoria": p["categoria"],
            "archivo": os.path.basename(real),
            "ocupacion_pct": round(v.get("cobertura", 0) * 100, 1),
            "texto_detectado": "si" if v.get("texto") else "no",
            "resolucion": f'{v.get("ancho","?")}x{v.get("alto","?")}',
            "estado": estado, "motivo": v.get("motivo", ""),
        })
        if not v["ok"]:
            invalidas.append((ref, p["nombre"], v["motivo"]))
            if borrar:
                os.remove(real)
                if not generada:
                    sin_imagen.append(ref)
    else:
        filas.append({
            "referencia": ref, "producto": p["nombre"], "categoria": p["categoria"],
            "archivo": f"{ref}.svg" if generada else "—",
            "ocupacion_pct": "", "texto_detectado": "no", "resolucion": "vectorial",
            "estado": "GENERADA" if generada else "SIN IMAGEN", "motivo": "",
        })
        if not generada:
            sin_imagen.append(ref)

# firma de lo aprobado: el build de Vercel la verifica sin necesitar Python
firmadas = {}
for p in catalogo:
    ref = p["ref"]
    real = next((f"{DIR}/{ref}{e}" for e in REALES if os.path.exists(f"{DIR}/{ref}{e}")), None)
    if real and analizar(real)["ok"]:
        firmadas[ref] = hashlib.sha1(open(real, "rb").read()).hexdigest()[:16]
json.dump(firmadas, open("data/imagenes-validadas.json", "w"), indent=0, sort_keys=True)

campos = ["referencia", "producto", "categoria", "archivo", "ocupacion_pct",
          "texto_detectado", "resolucion", "estado", "motivo"]
with open("reporte-imagenes.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=campos); w.writeheader(); w.writerows(filas)

import collections
est = collections.Counter(r["estado"] for r in filas)
print(f"Imágenes auditadas: {len(filas)}")
for k, v in est.most_common():
    print(f"  {k:<12} {v}")

if invalidas:
    print(f"\nINVÁLIDAS ({len(invalidas)}){' · BORRADAS' if borrar else ''}:")
    for ref, nombre, motivo in invalidas:
        print(f"  ✗ {ref}  {nombre[:38]:<38} {motivo}")

if sin_imagen:
    print(f"\nSIN NINGUNA IMAGEN: {len(sin_imagen)} -> {', '.join(sin_imagen[:10])}")
    sys.exit(1)

if invalidas and not borrar:
    print("\nHay imágenes inválidas publicadas. Corré con --borrar para reemplazarlas por la generada.")
    sys.exit(1)

print("\nTodas las imágenes del catálogo son válidas.")
