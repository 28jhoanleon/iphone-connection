# Imágenes maestras

Una imagen por **modelo**. Se propaga sola a todas sus referencias.

## Cómo agregar una

1. Buscá el nombre de archivo en `reportes/modelos-sin-foto.txt`.
   Ejemplo: `apple-watch-se-3-44mm.jpg`
2. Guardá la imagen en esta carpeta con ese nombre exacto.
3. Corré:

```bash
npm run imagenes
```

Listo. Todas las referencias de ese modelo pasan a usar esa foto.

## Qué imagen sirve

- Producto sobre fondo blanco o transparente.
- Sin texto, sin logos superpuestos, sin marcas de agua, sin mockups.
- Cualquier tamaño y proporción: el pipeline recorta, centra y exporta
  a 1000x1000 WebP con el mismo margen que el resto del catálogo.
- Formatos aceptados: jpg, jpeg, png, webp.

El validador rechaza automáticamente las imágenes con texto, vacías o
demasiado chicas, e informa el motivo. Una imagen rechazada no llega al sitio.

## Por qué por modelo y no por referencia

El catálogo tiene 256 referencias pero sólo 185 modelos, y varias unidades del
mismo modelo comparten color. Una sola imagen puede cubrir cinco referencias.

## Descarga automática desde fuentes oficiales

`data/fuentes-imagenes.json` tiene las URL oficiales por modelo. Para traerlas:

```bash
npm run descargar     # descarga, recorta, centra y valida
npm run imagenes      # propaga a todas las referencias
```

El descargador tiene que correr en una máquina con salida a internet (tu
celular sirve). Cubre 41 modelos y unas 109 referencias.

Para agregar un modelo, sumá una entrada en `data/fuentes-imagenes.json`:

```json
"xiaomi-17t": { "url": "https://…", "modelo": "Xiaomi 17T" }
```

Si la foto es de otro modelo de la misma línea porque el original todavía no
tiene imagen oficial, agregá `"equivalente": "Xiaomi 15T"`. Queda registrado.
