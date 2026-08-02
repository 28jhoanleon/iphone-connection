import fs from 'fs/promises';
import path from 'path';

const CATALOGO_PATH = path.resolve('data/catalogo.json');
const BASE_DIR = path.resolve('scripts/pipeline/base_images');
const PUBLIC_DIR = path.resolve('public/imagenes');

async function asegurarDirectorio(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (e) {}
}

async function procesar() {
  console.log('🚀 Iniciando procesamiento local de imágenes...\n');

  let catalogo = [];
  try {
    const raw = await fs.readFile(CATALOGO_PATH, 'utf-8');
    catalogo = JSON.parse(raw);
  } catch (e) {
    console.error('❌ No se encontró data/catalogo.json');
    return;
  }

  let procesadas = 0;

  for (const prod of catalogo) {
    const slug = prod.modeloSlug || prod.modelo;
    if (!slug) continue;

    const marca = (prod.marca || 'generico').toLowerCase();
    const cat = prod.arquetipo === 'reloj' ? 'smartwatch' : 'smartphone';

    const sourceFile = path.join(BASE_DIR, marca, `${slug}.png`);
    const targetDir = path.join(PUBLIC_DIR, marca, cat, slug);
    await asegurarDirectorio(targetDir);
    const targetFile = path.join(targetDir, 'default.webp');

    try {
      // Copiamos la imagen al directorio público como .webp o .png según disponibilidad
      const data = await fs.readFile(sourceFile);
      await fs.writeFile(targetFile, data);
      procesadas++;
    } catch (e) {}
  }

  console.log(`🎉 ¡Procesamiento completado con éxito! (${procesadas} imágenes en public/imagenes/)\n`);
}

procesar();
