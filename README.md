# iPhone Connection · v2.0

Catálogo y sitio público. Next.js 15 (App Router) · TypeScript · Tailwind.
Funciona en **Android/Termux, Linux, macOS y Windows**.

## Empezar

```bash
npm run doctor     # dice qué falta instalar en tu sistema
npm i
npm run dev        # http://localhost:3000
```

## Comandos

| Comando | Qué hace | Necesita |
|---|---|---|
| `npm run dev` | Servidor de desarrollo | Node |
| `npm run build` | Compila (valida imágenes antes) | Node |
| `npm run doctor` | Diagnostica el entorno | Node |
| `npm run limpiar` | Borra imágenes obsoletas del repo | Node |
| `npm run auditar` | Revisa catálogo e imágenes | Python |
| `npm run datos` | Reprocesa la planilla completa | Python |

## Auditoría visual

Abrí **`/auditoria`** en cualquier navegador. Muestra las 256 imágenes con referencia,
marca, color, capacidad, estado, batería, disponibilidad y precio. Filtros por
categoría, por tipo de imagen y por texto, más vista densa.

No requiere Playwright ni Chromium: funciona desde el celular.

## Estructura

```
src/app/          rutas
src/components/   componentes reutilizables
src/lib/          acceso a datos · ÚNICA puerta al catálogo
data/             catalogo.json, empresa.json, precios.json, faq.json
public/productos/ imágenes por referencia
db/schema/        esquema Postgres para la etapa de Supabase
scripts/          importador, generador de imágenes y auditorías
docs/             guías y documentos de cierre
```

## Reglas del proyecto

- Ningún producto escrito dentro del código: todo sale de `data/catalogo.json`.
- Ningún componente lee el JSON directo: todo pasa por `src/lib/catalogo.ts`.
- Dinero siempre en centavos enteros.
- Costos y márgenes nunca salen al bundle público.
- Ninguna imagen se publica sin pasar el validador.
- Ningún dato de la empresa se inventa: si falta, el bloque no se renderiza.

## Cambiar una imagen

Dejá `A167.jpg` en `public/productos/`. Reemplaza a la generada automáticamente.
Formato: cuadrado, fondo blanco, mínimo 1000px.

## Documentación

- `docs/cierre-frontend-v2.md` — estado final, limitaciones y qué no tocar
- `docs/GUIA-TERMUX.md` — trabajar desde el celular
- `docs/GUIA-GITHUB-VERCEL.md` — publicar
