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
    (r"(?i)\s*(a|con)\s+un\s+precio\s+inigualable", ""),
    (r"(?i)\binigualables?\b", "muy buena"),
    (r"(?i)\bdisfrutá?\s+de\b", "disfrutá de"),
    (r"(?i)\belig[ea]\b", "elegí"),
    # lenguaje publicitario que la marca no usa: se informa, no se elogia
    (r"(?i)\bel\s+\w+\s+definitivo\b", "una opción sólida"),
    (r"(?i)\bpara los amantes de la m[úu]sica\b", ""),
    (r"(?i)\bmantiene la fiesta encendida\b", "dura"),
    (r"(?i)\bsin preocupaciones\b", ""),
    (r"(?i)\bcalidad premium que s[óo]lo \w+ puede ofrecer\b", "calidad de la marca"),
    (r"(?i)\bque solo \w+ puede ofrecer\b", ""),
    (r"(?i)\bsonido masivo\b", "sonido potente"),
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
    """Normaliza el archivo de descripciones, que es la fuente permanente."""
    d = json.load(open("data/descripciones.json", encoding="utf-8"))
    antes = " ".join(d.values()).lower()

    for k in list(d):
        t = limpiar(d[k])
        if len(t) >= 60:
            d[k] = t

    json.dump(d, open("data/descripciones.json", "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)

    texto = " ".join(d.values()).lower()
    # se busca palabra completa: "elegí" contiene "elig" y daba falso positivo
    import re as _re
    restos = [f for f in ("al mejor precio", "oportunidad perfecta", "espectacular",
                          "inigualable", "hazte", "tienes", "puedes", "elige",
                          "disfruta de", "imperdible")
              if _re.search(rf"\b{_re.escape(f)}\b", texto)]
    print(f"Descripciones normalizadas : {len(d)}")
    print(f"Léxico prohibido antes     : "
          f"{sum(antes.count(f) for f in ('al mejor precio', 'oportunidad perfecta', 'espectacular'))}")
    print(f"Léxico prohibido restante  : {restos or 'ninguno'}")


if __name__ == "__main__":
    main()
