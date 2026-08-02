import fs from 'fs/promises';
import path from 'path';

const CATALOGO_PATH = path.resolve('data/catalogo.json');
const BIBLIOTECA_PATH = path.resolve('scripts/pipeline/data/biblioteca.json');
const BASE_DIR = path.resolve('scripts/pipeline/base_images');

async function asegurarDirectorio(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (e) {}
}

async function importar() {
  console.log('📥 Verificando e importando imágenes base...');

  let catalogo = [];
  try {
    const rawCat = await fs.readFile(CATALOGO_PATH, 'utf-8');
    catalogo = JSON.parse(rawCat);
  } catch (e) {
    console.error('❌ No se pudo leer data/catalogo.json');
    return;
  }

  let biblioteca = {};
  try {
    const rawBib = await fs.readFile(BIBLIOTECA_PATH, 'utf-8');
    biblioteca = JSON.parse(rawBib);
  } catch (e) {}

  let existentes = 0;
  let nuevas = 0;

  // SVG base neutro con estética limpia para generar WebP de alta calidad si no hay URL remota
  const SVG_BASE = (nombre, marca) => `
    <svg width="1000" height="1000" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#FFFFFF"/>
      <rect x="200" y="200" width="600" height="600" rx="40" fill="#F4F4F5"/>
      <text x="500" y="480" font-family="sans-serif" font-size="42" font-weight="bold" fill="#18181B" text-anchor="middle">${marca.toUpperCase()}</text>
      <text x="500" y="540" font-family="sans-serif" font-size="24" fill="#71717A" text-anchor="middle">${nombre.length > 30 ? nombre.substring(0, 30) + '...' : nombre}</text>
    </svg>
  `;

  for (const prod of catalogo) {
    const slug = prod.modeloSlug || prod.modelo;
    if (!slug) continue;

    const marca = (prod.marca || 'generico').toLowerCase();
    const cat = prod.arquetipo === 'reloj' ? 'smartwatch' : 'smartphone';
    
    const targetDir = path.join(BASE_DIR, marca);
    await asegurarDirectorio(targetDir);
    const targetFile = path.join(targetDir, `${slug}.png`);

    try {
      await fs.access(targetFile);
      existentes++;
    } catch {
      // Buscar si existe en biblioteca
      let urlRemota = null;
      if (biblioteca[marca]) {
        const itemBib = biblioteca[marca].find(m => m.slug === slug);
        if (itemBib && itemBib.fuentes) {
          urlRemota = Object.values(itemBib.fuentes)[0];
        }
      }

      if (urlRemota) {
        try {
          console.log(`⬇️ Descargando imagen oficial: ${slug}...`);
          const res = await fetch(urlRemota);
          const buffer = await res.arrayBuffer();
          await fs.writeFile(targetFile, Buffer.from(buffer));
          nuevas++;
        } catch (err) {
          // Fallback a SVG
          await fs.writeFile(targetFile, Buffer.from(SVG_BASE(prod.nombre, marca)));
          nuevas++;
        }
      } else {
        // Crear imagen base limpia en SVG para ser procesada a WebP
        await fs.writeFile(targetFile, Buffer.from(SVG_BASE(prod.nombre, marca)));
        nuevas++;
      }
    }
  }

  console.log(`\n📊 Resumen de Importación:`);
  console.log(`  - Imágenes ya existentes: ${existentes}`);
  console.log(`  - Imágenes nuevas generadas/descargadas: ${nuevas}\n`);
}

importar();
