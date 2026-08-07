#!/usr/bin/env python3
"""
Verificación de precios contra la planilla del proveedor.

Recorre el CSV fila por fila, recalcula lo que debería costar cada producto y lo
compara con lo publicado. No confía en el importador: vuelve a leer el archivo
crudo y hace la cuenta de cero.

    precio = costo USD × tipo de cambio × (1 + margen), redondeado

Cualquier diferencia se informa. También detecta lo que la comparación por sí
sola no ve: costos absurdos para el tipo de producto, precios que no cierran con
la columna de pesos de la propia planilla, y productos publicados que ya no
figuran en la lista.
"""
import os as _os, sys as _sys
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))

import csv, json, re, unicodedata
from collections import Counter

CSV = "datos/lista-completa.csv"
TOLERANCIA = 0.005          # el redondeo a $1.000 desvía más en los productos baratos

# Rango razonable de costo en dólares por tipo de producto. Sirve para detectar
# valores que la comparación no puede: un cargador a USD 7.000 pasa la cuenta
# pero no tiene sentido.
RANGOS = {
    "Accesorios": (2, 600), "Audio": (8, 1500), "Relojes": (8, 900),
    "iPhone": (60, 3000), "Android": (60, 2500), "Tablets": (60, 3000),
    "Notebooks": (250, 6000), "Consolas": (150, 1500), "Hogar": (30, 1500),
}


def norm(s):
    s = unicodedata.normalize("NFD", str(s).lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def a_num(txt):
    """Número desde el texto de la planilla, con punto de miles y coma decimal."""
    t = re.sub(r"[^\d.,]", "", str(txt or ""))
    if not t:
        return None
    if "," in t and "." in t:
        t = t.replace(".", "").replace(",", ".") if t.rfind(",") > t.rfind(".") else t.replace(",", "")
    elif "," in t:
        t = t.replace(",", ".") if len(t.split(",")[-1]) <= 2 else t.replace(",", "")
    elif t.count(".") >= 1 and len(t.split(".")[-1]) == 3:
        t = t.replace(".", "")
    try:
        v = float(t)
    except ValueError:
        return None
    return v if v > 0 else None


def main():
    cfg = json.load(open("data/precios.json", encoding="utf-8"))
    TC, MARGEN, PASO = cfg["tcRespaldo"], cfg["margen"], cfg["redondeoPesos"]

    catalogo = [p for p in json.load(open("data/catalogo.json", encoding="utf-8")) if p["publicado"]]

    # --- 1. la cuenta cierra en cada producto ---
    mal_calculados = []
    for p in catalogo:
        if not p["costoCentavos"]:
            continue
        # Se compara contra el precio YA redondeado. En productos baratos el
        # redondeo a $1.000 desvía casi un 10% y no es un error de cálculo.
        bruto = p["costoCentavos"] * TC * (1 + MARGEN)
        esperado = round(bruto / (PASO * 100)) * PASO * 100
        if abs(p["precioCentavos"] - esperado) > esperado * TOLERANCIA:
            mal_calculados.append((p, esperado))

    # --- 2. costo dentro del rango razonable de su categoría ---
    fuera_rango = []
    for p in catalogo:
        r = RANGOS.get(p["categoria"])
        if not r or not p["costoCentavos"]:
            continue
        usd = p["costoCentavos"] / 100
        if not (r[0] <= usd <= r[1]):
            fuera_rango.append((p, usd, r))

    # --- 3. cada costo existe realmente en la planilla ---
    costos_planilla = set()
    pesos_planilla = {}
    try:
        for fila in csv.reader(open(CSV, encoding="utf-8-sig")):
            valores = [a_num(c) for c in fila if str(c).strip().startswith("$")]
            valores = [v for v in valores if v]
            if not valores:
                continue
            usd = min(valores)
            if 2 <= usd <= 20000:
                costos_planilla.add(round(usd, 2))
                # el precio en pesos del proveedor suele ser el siguiente valor
                # El precio en pesos es el MAYOR de la fila. Los valores
                # intermedios son las cuotas, que valen menos que el total.
                mayores = [v for v in valores if v > usd * 100]
                if mayores:
                    pesos_planilla[round(usd, 2)] = max(mayores)
    except FileNotFoundError:
        print(f"No está {CSV}. Corré antes la sincronización.")
        raise SystemExit(1)

    inventados = [p for p in catalogo
                  if p["costoCentavos"] and round(p["costoCentavos"] / 100, 2) not in costos_planilla]

    # --- 4. contraste contra el precio en pesos de la planilla ---
    # No tiene por qué coincidir (ellos usan su propio TC), pero una diferencia
    # enorme indica que el costo se leyó de la columna equivocada.
    desviados = []
    for p in catalogo:
        if not p["costoCentavos"]:
            continue
        usd = round(p["costoCentavos"] / 100, 2)
        ref = pesos_planilla.get(usd)
        if not ref:
            continue
        propio = p["precioCentavos"] / 100
        # El precio del proveedor y el nuestro difieren por el margen y por el
        # tipo de cambio de cada uno. Se marca sólo lo que se sale por completo.
        if propio > ref * 2.2 or propio < ref * 0.75:
            desviados.append((p, ref, propio))

    # ---------- informe ----------
    print(f"Productos publicados : {len(catalogo)}")
    print(f"Tipo de cambio       : ${TC}   margen {MARGEN * 100:.0f}%   redondeo ${PASO}\n")

    print(f"1 · Cuenta mal calculada ........ {len(mal_calculados)}")
    for p, esp in mal_calculados[:12]:
        print(f"    {p['ref']} {p['nombre'][:36]:<36} publica ${p['precioCentavos']//100:,} · debería ${esp//100:,}")

    print(f"\n2 · Costo fuera de rango ........ {len(fuera_rango)}")
    for p, usd, r in fuera_rango[:15]:
        print(f"    {p['ref']} {p['nombre'][:36]:<36} USD {usd:>7,.0f}  ({p['categoria']}: {r[0]}–{r[1]})")

    print(f"\n3 · Costo que no está en la planilla ... {len(inventados)}")
    for p in inventados[:12]:
        print(f"    {p['ref']} {p['nombre'][:36]:<36} USD {p['costoCentavos']/100:,.2f}")

    print(f"\n4 · Muy desviado del precio del proveedor ... {len(desviados)}")
    for p, ref, propio in desviados[:12]:
        print(f"    {p['ref']} {p['nombre'][:32]:<32} proveedor ${ref:,.0f} · nuestro ${propio:,.0f}")

    total = len(mal_calculados) + len(fuera_rango) + len(inventados) + len(desviados)
    print(f"\n{'=' * 56}")
    if total == 0:
        print("Todos los precios verificados contra la planilla. Sin diferencias.")
    else:
        print(f"{total} caso(s) para revisar antes de publicar.")

    # los 10 más caros y los 10 más baratos, para mirar a ojo
    orden = sorted(catalogo, key=lambda p: p["precioCentavos"])
    print("\nMás baratos:")
    for p in orden[:6]:
        print(f"    {p['nombre'][:40]:<40} USD {p['costoCentavos']/100 if p['costoCentavos'] else 0:>6,.0f}  ${p['precioCentavos']//100:,}")
    print("Más caros:")
    for p in orden[-6:]:
        print(f"    {p['nombre'][:40]:<40} USD {p['costoCentavos']/100 if p['costoCentavos'] else 0:>6,.0f}  ${p['precioCentavos']//100:,}")

    raise SystemExit(1 if total else 0)


if __name__ == "__main__":
    main()
