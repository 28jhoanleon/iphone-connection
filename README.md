# iPhone Connection · V1

Plataforma de catálogo. Next.js 15 (App Router) · TypeScript · Tailwind · export estático.

## Estructura

```
src/app/         rutas (Home, catálogo, modelo, unidad, garantía, admin)
src/components/  componentes reutilizables
src/lib/         acceso a datos y formato · ÚNICA puerta al catálogo
data/            catalogo.json — fuente única de datos
public/productos/ imágenes por referencia (.svg generada, .jpg propia)
db/schema/       esquema real de Postgres
scripts/         importador de planilla y generador de imágenes
```

## Reglas del proyecto

- Ningún producto escrito dentro del código. Todo sale de `data/catalogo.json`.
- Ningún componente lee el JSON directo: todo pasa por `src/lib/catalogo.ts`.
  Al migrar a Supabase se cambia ese archivo y nada más.
- Dinero siempre en centavos enteros.
- Costos y márgenes nunca salen al bundle público.

## Imágenes

`/public/productos/{REF}.svg` es la imagen generada.
Dejar `{REF}.jpg` en la misma carpeta la reemplaza automáticamente. Sin tocar código.

## Comandos

```
npm run dev      desarrollo
npm run build    build + export estático a /out
npm run datos    reimportar planilla y regenerar imágenes
```

## Deploy

`npm run build` genera `/out`. Ese contenido se publica en GitHub Pages.
Al migrar el panel a Supabase se quita `output: "export"` de `next.config.ts`
y el mismo repo se despliega en Vercel sin cambiar la app.
