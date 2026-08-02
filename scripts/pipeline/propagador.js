import fs from 'fs/promises';
import path from 'path';

const CATALOGO_PATH = path.resolve('data/catalogo.json');

async function propagar() {
  console.log('🔄 Vinculando rutas de imágenes directamente en el catálogo...');

  const raw = await fs.readFile(CATALOGO_PATH, 'utf-8');
  const catalogo = JSON.parse(raw);

  const catalogoActualizado = catalogo.map(prod => {
    const slug = prod.modeloSlug || prod.modelo;
    const marca = (prod.marca || 'generico').toLowerCase();
    const cat = prod.arquetipo === 'reloj' ? 'smartwatch' : 'smartphone';

    const rutaImagen = slug ? `/imagenes/${marca}/${cat}/${slug}/default.webp` : null;

    // Ponemos 'imagen' primero para verificarlo fácil en el head
    return {
      ref: prod.ref,
      imagen: rutaImagen,
      ...prod
    };
  });

  await fs.writeFile(CATALOGO_PATH, JSON.stringify(catalogoActualizado, null, 2));
  console.log(`✅ ¡Éxito! Se actualizaron ${catalogoActualizado.length} productos con su campo 'imagen'.`);
}

propagar();
