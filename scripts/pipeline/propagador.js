import fs from 'fs/promises';
import path from 'path';

const CATALOGO_PATH = path.resolve('data/catalogo.json');
const REFERENCIAS_PATH = path.resolve('scripts/pipeline/data/referencias.json');
const MODELOS_PATH = path.resolve('scripts/pipeline/data/modelos.json');
const IMAGENES_DIR = path.resolve('public/imagenes');
const STATS_PATH = path.resolve('public/estadisticas.json');

async function propagar() {
  console.log('🔄 Propagando rutas de imágenes procesadas al catálogo...');

  let catalogo = [];
  try {
    const rawCat = await fs.readFile(CATALOGO_PATH, 'utf-8');
    catalogo = JSON.parse(rawCat);
  } catch (e) {
    console.error('❌ No se pudo leer data/catalogo.json:', e.message);
    return;
  }

  let referencias = {};
  try {
    const rawRef = await fs.readFile(REFERENCIAS_PATH, 'utf-8');
    referencias = JSON.parse(rawRef);
  } catch (e) {}

  let modelos = {};
  try {
    const rawMod = await fs.readFile(MODELOS_PATH, 'utf-8');
    modelos = JSON.parse(rawMod);
  } catch (e) {}

  let actualizados = 0;
  let faltantes = 0;

  for (let producto of catalogo) {
    // 1. Buscar coincidencia por ref (ej: "A101")
    const refKey = producto.ref || producto.id || producto.sku;
    const refInfo = referencias[refKey];

    // 2. Buscar coincidencia por modelo/modeloSlug
    const modKey = producto.modelo || producto.modeloSlug || producto.nombre;
    const modInfo = modelos[modKey];

    const info = refInfo || modInfo;

    let marca = (producto.marca || (info ? info.marca : 'apple')).toLowerCase();
    let categoria = 'smartphone'; // default
    let slug = producto.modeloSlug || (info ? info.slug : null);
    let color = 'black'; // default fallback

    if (info) {
      marca = info.marca || marca;
      categoria = info.categoria || categoria;
      slug = info.slug || slug;
      if (info.color) color = info.color;
    }

    // Mapeo dinámico directo si tiene modeloSlug
    if (slug) {
      // Determinar categoría por arquetipo o categoria del catálogo
      if (producto.arquetipo === 'telefono' || producto.categoria === 'iPhone') categoria = 'smartphone';
      if (producto.arquetipo === 'reloj' || producto.categoria === 'Apple Watch') categoria = 'smartwatch';

      // Intentar vincular primera imagen disponible para ese modelo/slug
      const targetDir = path.join(IMAGENES_DIR, marca, categoria, slug);
      let imagenEncontrada = null;

      try {
        const files = await fs.readdir(targetDir);
        const webpFiles = files.filter(f => f.endsWith('.webp'));
        if (webpFiles.length > 0) {
          // Si coincide el color o toma el primero disponible
          const matchColor = webpFiles.find(f => f.includes(color)) || webpFiles[0];
          imagenEncontrada = `/imagenes/${marca}/${categoria}/${slug}/${matchColor}`;
        }
      } catch (e) {}

      if (imagenEncontrada) {
        producto.imagen = imagenEncontrada;
        actualizados++;
      } else {
        faltantes++;
      }
    }
  }

  await fs.writeFile(CATALOGO_PATH, JSON.stringify(catalogo, null, 2));
  console.log(`✅ ¡Catálogo en data/catalogo.json actualizado! (${actualizados} productos vinculados).`);

  const stats = {
    total_productos_catalogo: catalogo.length,
    productos_vinculados: actualizados,
    imagenes_faltantes: faltantes,
    formato: "WebP (1000x1000, Q92)",
    ultima_actualizacion: new Date().toISOString()
  };

  await fs.writeFile(STATS_PATH, JSON.stringify(stats, null, 2));
  console.log(`📊 Archivo public/estadisticas.json actualizado correctamente.`);
}

propagar();
