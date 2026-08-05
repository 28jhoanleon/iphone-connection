import json
import requests
import time
import sys

API_KEY = "sk-MvBzcHp5eU3DE0L8cKF7DogcbrFBV9d4NAY4PRpnZRrbM81O"
BASE_URL = "https://api.tokenrouter.com/v1"
MODEL = "moonshotai/kimi-k3-free"

ARCHIVO_ORIGEN = "data/catalogo.json"
ARCHIVO_DESTINO = "data/catalogo_con_descripciones.json"

try:
    with open(ARCHIVO_ORIGEN, "r", encoding="utf-8") as f:
        catalogo = json.load(f)
except FileNotFoundError:
    print(f"❌ Error: No se encontró {ARCHIVO_ORIGEN}.")
    sys.exit()

total = len(catalogo)
print(f"📦 Procesando {total} productos con Kimi K3...\n")

def generar_descripcion(producto, intento=1):
    prompt = f"""
    Eres un redactor experto en ventas de tecnología. Escribe una descripción atractiva, persuasiva y profesional de máximo 2 oraciones en español para este producto.
    Marca: {producto.get('marca', 'Desconocida')}
    Modelo: {producto.get('modelo', 'Desconocido')}
    Color: {producto.get('color', 'Varios')}
    Capacidad: {producto.get('capacidadGb', 'N/A')} GB
    Estado: {producto.get('estadoEtiqueta', 'Nuevo')}
    Escribe solo la descripción.
    """
    headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
    data = {"model": MODEL, "messages": [{"role": "user", "content": prompt}]}
    try:
        response = requests.post(f"{BASE_URL}/chat/completions", json=data, headers=headers, timeout=90)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        if intento < 4:
            print(f"   ⚠️ Fallo en intento {intento}, reintentando...")
            time.sleep(5)
            return generar_descripcion(producto, intento + 1)
        else:
            return ""

# Procesar el catálogo y añadir las descripciones
catalogo_con_descripciones = []
for i, p in enumerate(catalogo):
    nombre = p.get('nombre', 'Producto')
    print(f"({i+1}/{total}) 📱 Procesando: {nombre}...")
    descripcion = generar_descripcion(p)
    if descripcion:
        print(f"   ✅ Descripción obtenida.")
        p['descripcion'] = descripcion
    else:
        print(f"   ❌ No se pudo obtener descripción tras varios intentos.")
        p['descripcion'] = None
    catalogo_con_descripciones.append(p)
    time.sleep(1) # Pequeña pausa para no saturar la API

# Guardar el archivo nuevo
with open(ARCHIVO_DESTINO, "w", encoding="utf-8") as f:
    json.dump(catalogo_con_descripciones, f, ensure_ascii=False, indent=2)

print(f"\n✨ ¡Proceso completado!")
print(f"✅ Nuevo archivo guardado en: {ARCHIVO_DESTINO}")
