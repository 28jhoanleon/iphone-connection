import json
import requests

API_KEY = "sk-MvBzcHp5eU3DE0L8cKF7DogcbrFBV9d4NAY4PRpnZRrbM81O"
BASE_URL = "https://api.tokenrouter.com/v1"
MODEL = "moonshot-v1-8k"

# Cargar el catálogo
try:
    with open("data/catalogo.json", "r", encoding="utf-8") as f:
        catalogo = json.load(f)
except FileNotFoundError:
    print("❌ Error: No se encontró el archivo data/catalogo.json. Asegúrate de estar en la raíz del proyecto.")
    exit()

# Tomamos solo los primeros 3 productos para la prueba
productos_ejemplo = catalogo[:3]

print(f"🔍 Generando descripciones para {len(productos_ejemplo)} productos de prueba...\n")

# Función para llamar a Kimi
def generar_descripcion(producto):
    prompt = f"""
    Eres un redactor experto en ventas de tecnología. Escribe una descripción atractiva y persuasiva para este producto en español. 
    La descripción debe ser corta (máximo 2 oraciones), profesional y destacar sus puntos fuertes.
    
    Marca: {producto.get('marca', 'Desconocida')}
    Modelo: {producto.get('modelo', 'Desconocido')}
    Color: {producto.get('color', 'Varios')}
    Capacidad: {producto.get('capacidadGb', 'N/A')} GB
    Estado: {producto.get('estadoEtiqueta', 'Nuevo')}
    
    Escribe solo la descripción, sin añadir precios ni otros datos técnicos que no te he dado.
    """

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    data = {
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}]
    }

    try:
        # CAMBIO IMPORTANTE: Aumentamos el timeout de 15 a 60 segundos
        response = requests.post(f"{BASE_URL}/chat/completions", json=data, headers=headers, timeout=60)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        return f"Error al generar: {str(e)}"

# Procesar los productos
for p in productos_ejemplo:
    nombre = p.get('nombre', 'Producto')
    print(f"📱 Procesando: {nombre}...")
    descripcion = generar_descripcion(p)
    print(f"   ✅ Kimi dice: \"{descripcion}\"\n")

print("✨ Prueba completada. Si te gusta el estilo, podemos escalarlo a los 256 productos.")
