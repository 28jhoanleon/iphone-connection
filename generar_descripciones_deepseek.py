import json
import requests

# --- CONFIGURACIÓN DE DEEPSEEK ---
API_KEY = "sk-MvBzcHp5eU3DE0L8cKF7DogcbrFBV9d4NAY4PRpnZRrbM81O" # Usamos la misma clave, pero apuntando a DeepSeek (sirve si tienes saldo en DeepSeek)
# Si tienes tu clave real de DeepSeek en el .bashrc, cámbiala aquí:
# API_KEY = "sk-tu_clave_real_de_deepseek"
BASE_URL = "https://api.deepseek.com/v1"
MODEL = "deepseek-chat"

# Cargar el catálogo
try:
    with open("data/catalogo.json", "r", encoding="utf-8") as f:
        catalogo = json.load(f)
except FileNotFoundError:
    print("❌ Error: No se encontró el archivo data/catalogo.json.")
    exit()

# Tomamos solo los primeros 3 productos para la prueba
productos_ejemplo = catalogo[:3]

print(f"🔍 Generando descripciones con DEEPSEEK para {len(productos_ejemplo)} productos...\n")

def generar_descripcion(producto):
    prompt = f"""
    Eres un redactor experto en ventas de tecnología. Escribe una descripción atractiva y persuasiva para este producto en español. 
    Máximo 2 oraciones, profesional y destacando sus puntos fuertes.
    
    Marca: {producto.get('marca', 'Desconocida')}
    Modelo: {producto.get('modelo', 'Desconocido')}
    Color: {producto.get('color', 'Varios')}
    Capacidad: {producto.get('capacidadGb', 'N/A')} GB
    Estado: {producto.get('estadoEtiqueta', 'Nuevo')}
    
    Escribe solo la descripción.
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
        response = requests.post(f"{BASE_URL}/chat/completions", json=data, headers=headers, timeout=30)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()
    except Exception as e:
        return f"Error al generar: {str(e)}"

for p in productos_ejemplo:
    nombre = p.get('nombre', 'Producto')
    print(f"📱 Procesando: {nombre}...")
    descripcion = generar_descripcion(p)
    print(f"   ✅ DeepSeek dice: \"{descripcion}\"\n")

print("✨ Prueba completada con DeepSeek.")
