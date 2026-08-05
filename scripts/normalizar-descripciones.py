#!/usr/bin/env python3
"""
Normaliza las descripciones generadas por IA a la voz de marca (Doc 00 §7).

El modelo escribió en español neutro-peninsular y con lenguaje de venta agresivo:
34 "al mejor precio", 67 "oportunidad perfecta", 15 "espectacular". Ese léxico
está explícitamente prohibido: la marca informa, no presiona.

Se corrige el texto y se recorta a una longitud que entre en la ficha sin
competir con los datos, que son el argumento de venta real.
"""
import os as _os, sys as _sys
_os.chdir(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))))

import json, re

FUERA = [
    (r"(?i),?\s*(y|a)?\s*(un|el)?\s*precio\s+(inigualable|inmejorable|imbatible)", ""),
    (r"(?i)\s*al mejor precio(\s+del mercado)?", ""),
    (r"(?i)\s*a un precio (inigualable|inmejorable|que no vas a encontrar)", ""),
    (r"(?i)(es|una)\s*la?\s*oportunidad perfecta (de|para)\s*", "permite "),
    (r"(?i)\boportunidad perfecta\b", "opción"),
    (r"(?i)\bespectacular(es|mente)?\b", "de gran calidad"),
    (r"(?i)\bincreíbles?\b", "muy buenos"),
    (r"(?i)\bimperdible\b", ""),
    # voseo argentino
    (r"(?i)\bhazte con\b", "Llevate"),
    (r"(?i)\bllévate\b", "Llevate"),
    (r"(?i)\belige\b", "elegí"),
    (r"(?i)\belegir entre\b", "elegir entre"),
    (r"(?i)\bdisfruta de\b", "Disfrutá de"),
    (r"(?i)\btienes\b", "tenés"),
    (r"(?i)\bpuedes\b", "podés"),
]

def limpiar(t) -> str:
    if not t:
        return ""
    for pat, rep in FUERA:
        t = re.sub(pat, rep, t)
    t = re.sub(r"\s{2,}", " ", t)
    t = re.sub(r"\s+([,.])", r"\1", t)
    t = re.sub(r"[,.]\s*[,.]", ".", t)
    t = re.sub(r"\.\s*\.", ".", t).strip(" ,.")
    # Sólo se corrige la capitalización de las palabras que introdujo el
    # reemplazo, no la del texto original: bajar todo rompería nombres propios
    # como Apple o los grados Seleccionado A/B/C.
    for w in ("Te permite", "Permite", "La opción", "Llevate"):
        t = re.sub(rf"(?<=[a-zá-ú,:] ){re.escape(w)}",
                   w[0].lower() + w[1:], t)
    t = re.sub(r"(?<=[.!?] )([a-záéíóúñ])", lambda m: m.group(1).upper(), t)
    t = re.sub(r"(?i)\belige\b", "elegí", t)

    # dos oraciones como máximo: la ficha ya muestra los datos duros
    frases = re.split(r"(?<=[.!?])\s+", t)
    t = " ".join(frases[:2]).strip()
    if t and not t.endswith("."):
        t += "."
    return t[0].upper() + t[1:] if t else ""


def main():
    base = json.load(open("data/catalogo.json", encoding="utf-8"))
    desc = {x["ref"]: x.get("descripcion", "") for x in
            json.load(open("data/catalogo_con_descripciones.json", encoding="utf-8"))}

    n, saltadas = 0, 0
    for p in base:
        d = limpiar(desc.get(p["ref"], ""))
        if len(d) < 60:
            saltadas += 1
            continue
        p["descripcion"] = d
        n += 1

    json.dump(base, open("data/catalogo.json", "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)

    texto = " ".join(p.get("descripcion", "") for p in base).lower()
    restos = [f for f in ("al mejor precio", "oportunidad perfecta", "espectacular",
                          "hazte", "tienes", "puedes", "elige") if f in texto]
    print(f"Descripciones normalizadas : {n}")
    print(f"Descartadas (muy cortas)   : {saltadas}")
    print(f"Léxico prohibido restante  : {restos or 'ninguno'}")
    largos = [len(p["descripcion"]) for p in base if p.get("descripcion")]
    print(f"Largo medio                : {sum(largos)//len(largos)} caracteres")


if __name__ == "__main__":
    main()
