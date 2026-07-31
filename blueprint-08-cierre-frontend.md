# Doc 08 · Cierre del frontend

**Proyecto:** iPhone Connection · **Versión:** 1.2 · **Fecha:** 31/07/2026
**Estado:** listo para producción con una condición bloqueante (ver §3)

---

## 1. Qué quedó terminado

**Congelado. No debería tocarse salvo error crítico o cambio de negocio.**

| Área | Estado |
|---|---|
| Sistema de diseño | Tokens únicos: 3 radios, 2 sombras, 3 pesos, 11 tamaños, 0 colores sueltos |
| Navegación | 3 niveles: Home → Familia → Modelo → Unidad, con URLs propias |
| Catálogo | 256 productos publicados, 8 categorías, 0 errores graves en auditoría |
| Imágenes | 256/256 con imagen; 122 con recorte real, el resto generadas |
| Buscador | 403 entradas, con miniatura, precio y disponibilidad, carga diferida |
| SEO | canonical, Open Graph, Twitter Card, JSON-LD Product, sitemap, robots |
| Accesibilidad | Contraste AA, foco visible, landmarks, alt en todas las imágenes |
| Rendimiento | Home 72 KB de HTML, imágenes con dimensiones, sin saltos de layout |
| Páginas | Home, catálogo, modelo, ficha, Nosotros, Garantía, FAQ, Contacto, Privacidad |

**Automatizaciones que quedan funcionando solas:**

- `npm run datos` reimporta la planilla, regenera imágenes y reconstruye el índice.
- `python3 scripts/auditar-catalogo.py` corta el deploy si hay anomalías graves.
- `npm run verificar` corta el deploy si faltan datos reales de la empresa.
- Dejar `A167.jpg` en `public/productos` reemplaza la imagen sin tocar código.
- El precio se recalcula solo con la cotización de DolarApi cada 6 horas.

---

## 2. Qué quedó pendiente

**Bloqueante para publicar:**

1. **Cinco datos de contacto**: WhatsApp propio, Instagram, zona, horarios y nombres
   de los socios. Sin el WhatsApp, el botón principal del sitio no lleva a ningún lado.

**No bloqueante, decisión de negocio:**

2. **Envíos**: el badge del hero, el bloque de la ficha y la columna del footer están
   construidos pero **no se renderizan** porque `envios.hace` está en `false`.
   No se publica una promesa de cobertura que no exista.
3. **Formas de pago**: mismo mecanismo. Cargar `pagos.medios` y aparecen solos.
4. **Qué incluye la caja**: hay un valor por defecto razonable en `data/empresa.json`.
   Conviene revisarlo contra lo que realmente entregan.
5. **134 modelos sin foto real**: conservan imagen generada. El listado priorizado
   está en `imagenes-faltantes-por-modelo.csv`.
6. **Opiniones**: la sección existe vacía y explica por qué. Se llena con reseñas
   verificadas, nunca inventadas.

---

## 3. Riesgos que quedan

| # | Riesgo | Gravedad | Nota |
|---|---|---|---|
| R-01 | Datos de contacto vacíos | **Alta** | El sitio ya es público. Hoy no se puede comprar. |
| R-02 | 256 productos "Por encargo" | **Alta** | Ninguno figura con stock inmediato. Un catálogo entero sin disponibilidad genera desconfianza. Definir qué hay físicamente. |
| R-03 | Catálogo atado a la lista del proveedor | Media | No controlamos stock ni revisión técnica, y eso choca con dos de los cuatro pilares del Doc 00. |
| R-04 | Fotografía propia inexistente | Media | Las imágenes actuales son temporales. El estándar cuadrado ya es una restricción técnica. |
| R-05 | Informalidad fiscal | Media | Sin factura no hay garantía creíble. Formalizar antes de escalar. |
| R-06 | 2 avisos altos de npm (postcss, sharp) | Baja | Vienen del bundle de Next, afectan build y no las páginas servidas. |

---

## 4. Qué ya no necesita tocarse nunca más

- **Tokens de diseño** (`tailwind.config.ts`). Cualquier color nuevo entra ahí, no en un componente.
- **Componentes base**: `TarjetaUnidad`, `EtiquetaEstado`, `Readout`, `Migas`, `Volver`,
  `BloqueFicha`, `FilaDato`. Se reutilizan, no se duplican.
- **Capa de datos** (`src/lib/catalogo.ts`). Ningún componente lee el JSON directo.
  Al migrar a Supabase se reemplaza este archivo y la interfaz no cambia.
- **Nomenclatura y grados** (Doc 00 §7 + ADR-001). Están aplicados en el importador,
  en la base y en la UI.
- **Pipeline de imágenes**: segmentar → asignar → generar. Las mejoras del segmentador
  (título arriba o abajo, marco de tarjeta, etiquetas de dos líneas) ya están incorporadas.

---

## 5. Conclusión

**El frontend está técnicamente listo.** Lo que falta no es código: son datos del negocio.

Recomendación como CTO: **congelar el frontend ahora** y no invertir más horas en él.
Cada hora adicional en la web pública rinde menos que la primera hora en el sistema
interno, porque la web ya cumple su función —transmitir seriedad y llevar a WhatsApp—
y el sistema interno todavía no existe.

**Condición para publicar y difundir:** cargar los cinco datos de contacto y definir
qué unidades hay físicamente. Hasta entonces el sitio funciona pero no vende.

**Siguiente etapa:** panel administrativo sobre Supabase. Inventario por unidad con
IMEI, registro de ventas con snapshot transaccional, clientes y garantías emitidas.
