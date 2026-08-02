import fs from 'fs/promises';
import path from 'path';

const CATALOGO_PATH = path.resolve('data/catalogo.json');
const IMAGENES_DIR = path.resolve('public/imagenes');

async function auditar() {
  console.log('🔍 Auditando catálogo e imágenes de la web...\n');

  let catalogo = [];
  try {
    const raw = await fs.readFile(CATALOGO_PATH, 'utf-8');
    catalogo = JSON.parse(raw);
  } catch (e) {
    console.error('❌ No se encontró data/catalogo.json');
    return;
  }

  const faltantes = [];
  const listos = [];

  for (const prod of catalogo) {
    const slug = prod.modeloSlug || prod.modelo;
    const marca = (prod.marca || 'apple').toLowerCase();
    const cat = prod.arquetipo === 'reloj' ? 'smartwatch' : 'smartphone';

    if (!slug) {
      faltantes.push({ ref: prod.ref, nombre: prod.nombre, razon: 'Sin modeloSlug' });
      continue;
    }

    const targetDir = path.join(IMAGENES_DIR, marca, cat, slug);
    let tieneImagen = false;

    try {
      const files = await fs.readdir(targetDir);
      if (files.some(f => f.endsWith('.webp'))) {
        tieneImagen = true;
      }
    } catch (e) {}

    if (tieneImagen) {
      listos.push(prod);
    } else {
      faltantes.push({ ref: prod.ref, modeloSlug: slug, nombre: prod.nombre, marca });
    }
  }

  const total = catalogo.length;
  const porcentaje = ((listos.length / total) * 100).toFixed(1);

  console.log('--------------------------------------------------');
  console.log(`📊 COBERURA ACTUAL: ${listos.length} / ${total} productos (${porcentaje}%)`);
  console.log('--------------------------------------------------');

  if (faltantes.length > 0) {
    console.log(`\n⚠️  Faltan imágenes para los siguientes ${faltantes.length} productos:\n`);
    console.table(faltantes);
  } else {
    console.log('\n🎉 ¡FELICITACIONES! El 100% de los productos de la web tienen su imagen procesada.');
  }
}

auditar();
