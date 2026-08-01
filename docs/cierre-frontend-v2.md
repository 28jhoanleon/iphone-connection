# Cierre del frontend · v2.0

**Fecha:** 01/08/2026 · **Estado:** CONGELADO

---

## 1. Qué corregí en esta pasada

**Auditoría visual · reemplazo de Playwright**
Playwright no corre en Android (`Unsupported platform: android`) y este proyecto se
desarrolla íntegramente desde el celular. Lo eliminé del proyecto y lo reemplacé por
**`/auditoria`**, una página propia que muestra las 256 imágenes con su referencia,
marca, color, capacidad, estado, batería, disponibilidad, defecto y precio.

Filtros por categoría, por tipo de imagen (real o generada) y por texto, más una
vista densa de 12 columnas para barrer todo el catálogo de un vistazo. Se abre desde
cualquier navegador, sin instalar nada. Lleva `noindex` y está excluida del sitemap.

**Compatibilidad multiplataforma**
Todos los scripts se posicionan en la raíz del proyecto desde su propia ubicación, así
que funcionan invocados desde cualquier directorio. Las rutas temporales usan la
carpeta del sistema en lugar de `/tmp` fijo, y los separadores de ruta se arman con
`os.path.join`. Agregué **`npm run doctor`**, que detecta si el entorno es Termux,
Linux, macOS o Windows y dice exactamente qué falta instalar en cada uno.

**Build**
Dos causas distintas rompieron el deploy y quedaron resueltas: el `prebuild` llamaba
Python, que Vercel no tiene (ahora la validación pesada corre local y firma su
resultado; el build sólo verifica hashes en Node), y las imágenes descartadas
sobrevivían en git porque `unzip -o` no borra (ahora `limpiar-imagenes.mjs` corre
antes de cada build).

**Rendimiento**
El HTML de la Home bajó de 98 a 89 KB: el buscador enviaba una muestra de 40 entradas
del índice en cada página que nunca se usaba, porque el índice completo la reemplazaba
al primer foco. El índice bajó de 85 a 68 KB con claves compactas.

**Responsive**
Red de seguridad para 320px: `overflow-x: hidden` en html y body, `max-width: 100%` en
imágenes y `overflow-wrap: anywhere` en textos. La tabla del panel pasa a scroll
horizontal contenido en móvil.

**Accesibilidad**
Etiquetas accesibles en todos los campos del panel. Cero imágenes sin `alt`, un solo
`h1` por página, landmarks etiquetados, foco visible con `scroll-margin` para que no
quede debajo del header.

**SEO**
`BreadcrumbList` en JSON-LD en todas las páginas con migas: Google muestra la ruta
navegable en lugar de la URL cruda. Canonical, Open Graph y Twitter Card completos en
catálogo y modelo, que sólo tenían título y descripción.

**Deuda técnica**
Eliminado: `jsonLdProducto` sin uso, dos imports muertos en la Home, los dos scripts
duplicados de Playwright y la dependencia. Documentación movida a `docs/`, reportes
generados a `reportes/` (ignorada por git). Cero TODO, cero `console.log`, cero
dependencias sin usar.

---

## 2. Qué quedó terminado

| | |
|---|---|
| Catálogo | 256 productos, 8 categorías, **0 errores graves** en auditoría |
| Imágenes | 256/256 con imagen · 81 reales verificadas · **0 incorrectas** |
| Navegación | Home → Familia → Modelo → Unidad, URLs propias e indexables |
| Precios | Se recalculan solos con DolarApi cada 6 h; si falla, lo declara |
| SEO | canonical, OG, Twitter, Product, BreadcrumbList, sitemap, robots |
| Accesibilidad | Contraste AA, foco visible, landmarks, alt, labels |
| Rendimiento | HTML 89 KB · CSS 24 KB · 424 páginas estáticas |
| Build | Falla solo si hay imágenes inválidas o datos faltantes |

**Automatizaciones que quedan corriendo solas:**

- `npm run datos` reprocesa la planilla completa de punta a punta.
- `npm run auditar` revisa catálogo e imágenes.
- `npm run doctor` diagnostica el entorno.
- Dejar `A167.jpg` en `public/productos` reemplaza esa imagen sin tocar código.
- El pipeline descarta solo cualquier recorte con texto o con el color equivocado.

---

## 3. Limitaciones que dependen del negocio, no del código

Ninguna de estas se resuelve programando.

1. **Los cinco datos de contacto.** Sin el WhatsApp, el botón principal del sitio no
   lleva a ningún lado. Es lo único que bloquea el uso comercial.
2. **Qué unidades hay físicamente.** Las 256 figuran "Por encargo". Un catálogo entero
   sin stock inmediato genera desconfianza.
3. **Fotografía propia.** 175 productos usan imagen generada. El estándar es cuadrado,
   fondo blanco, mínimo 1000px.
4. **Envíos y formas de pago.** El código está construido y oculto: cargá los datos en
   `data/empresa.json` y aparecen solos en hero, ficha y footer.
5. **Opiniones.** La sección existe vacía y explica por qué. Se llena con reseñas
   verificadas, nunca inventadas.
6. **Formalización fiscal.** Sin factura no hay garantía creíble.

---

## 4. Qué no tocaría nunca más

- **Tokens de diseño.** Cualquier color nuevo entra en `tailwind.config.ts`.
- **Componentes base.** `TarjetaUnidad`, `EtiquetaEstado`, `Readout`, `Migas`,
  `Volver`, `BloqueFicha`, `FilaDato`, `Iconos`.
- **Capa de datos.** `src/lib/catalogo.ts` es la única puerta al catálogo. Al migrar a
  Supabase se reemplaza ese archivo y la interfaz no cambia.
- **Pipeline de imágenes.** Segmentar → validar → asignar → auditar. Las cuatro
  correcciones incorporadas (título arriba o abajo, marco de tarjeta, etiquetas de dos
  líneas, detección de texto por física del trazo) cubren los casos conocidos.
- **Nomenclatura y grados.** Doc 00 §7 + ADR-001, aplicados en importador, base y UI.

---

## 5. Conclusión

**El frontend está terminado. No vale la pena seguir invirtiendo tiempo acá.**

Lo digo explícitamente porque lo pediste: cada hora adicional en la web pública rinde
menos que la primera hora en el sistema interno. La web ya cumple su función —transmitir
seriedad y llevar a WhatsApp— y el sistema interno todavía no existe.

Lo que falta no es código. Son datos del negocio, y están enumerados arriba.

**Siguiente etapa:** Supabase y panel interno. El esquema ya está escrito en
`db/schema/schema.sql`: tres capas, specs dinámicas, outbox de eventos, garantías
versionadas y RLS. El orden correcto es inventario por unidad con IMEI, después ventas
con snapshot transaccional, después clientes y garantías emitidas.
