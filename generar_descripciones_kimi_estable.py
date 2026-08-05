import json
import requests
import time

API_KEY = "sk-MvBzcHp5eU3DE0L8cKF7DogcbrFBV9d4NAY4PRpnZRrbM81O"
BASE_URL = "https://api.tokenrouter.com/v1"
MODEL = "moonshotai/kimi-k3-free"

try:
    with open("data/catalogo.json", "r", encoding="utf-8") as f:
        catalogo = json.load(f)
except FileNotFoundError:
    print("❌ Error: No se encontró el archivo data/catalogo.json.")
    exit()

productos_ejemplo = catalogo[:3]
print(f"🔍 Generando descripciones con Kimi K3 para {len(productos_ejemplo)} productos...\n")

def generar_descripcion(producto, intento=1):
    prompt = f"""
    Eres un redactor experto en ventas de tecnología. Escribe una descripción atractiva y persuasiva para este producto en español, máximo 2 oraciones.
    Marca: {producto.get('marca', 'Desconocida')}
    Modelo: {producto.get('modelo', 'Desconocido')}
    Color: {producto.get('color', 'Varios')}
    Capacidad: {producto.get('capacidadGb', 'N/A')} GB
    Estado: {producto.get('estadoEtiqueta', 'Nuevo')}
    """

    headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
    data = {"model": MODEL, "messages": [{"role": "user", "content": prompt}]}

    try:
        response = requests.post(f"{BASE_URL}/chat/completions", json=data, headers=headers, timeout=90)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        if intento < 5:
            print(f"   ⚠️ Intento {intento} fallido. Reintentando en 5 segundos...")
            time.sleep(5)
            return generar_descripcion(producto, intento + 1)
        else:
            return f"Error: {str(e)}"

for p in productos_ejemplo:
    nombre = p.get('nombre', 'Producto')
    print(f"📱 Procesando: {nombre}...")
    descripcion = generar_descripcion(p)
    print(f"   ✅ Kimi dice: \"{descripcion}\"\n")

print("✨ Prueba completada exitosamente con reintentos.")
