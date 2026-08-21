/**
 * Normalización de fotos en el navegador.  src/lib/normalizar-canvas.ts
 *
 * Hace exactamente lo mismo que hacía sharp en el servidor —recorte del fondo,
 * escala por media geométrica a 0.62, centrado en 1000×1000 blanco, webp— pero
 * en el navegador del que sube la foto.
 *
 * Por qué se movió acá: sharp es un módulo nativo. En Termux no hay binario para
 * android-arm64 y en Vercel el bundler nunca terminó de resolverlo. El resultado
 * era que subir fotos solo funcionaba levantando el servidor local, que es
 * justamente lo que el panel venía a evitar.
 *
 * El canvas no necesita nada instalado. Corre igual en el teléfono de Jhoan y en
 * el de Bryan, desde el sitio publicado, sin Termux.
 *
 * Las constantes son las mismas que usaban sharp y normalizar-una.py. Si alguna
 * cambia, tiene que cambiar en los tres lados o el catálogo se despareja.
 */

const LADO = 1000;
const OBJETIVO = 0.62; // media geométrica del producto sobre el lienzo
const TOPE = 0.86; // ningún producto supera esto de alto o de ancho
const UMBRAL_FONDO = 244; // arriba de esto es fondo; deja fuera la sombra suave
const CENTRO_Y = 0.46; // centrar matemático se ve bajo cuando hay sombra
const CALIDAD = 0.92;

/** Caja del producto: primer y último píxel que no son fondo. */
function caja(datos: Uint8ClampedArray, ancho: number, alto: number) {
  let x0 = ancho, y0 = alto, x1 = -1, y1 = -1;

  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const i = (y * ancho + x) * 4;
      // Transparente cuenta como fondo: los PNG recortados vienen así y sin esto
      // la caja abarcaría el lienzo entero y no se recortaría nada.
      if (datos[i + 3] < 16) continue;
      // Luma en vez del promedio: se corresponde con el greyscale que usaba
      // sharp, así que el mismo píxel da el mismo resultado que antes.
      const gris = 0.299 * datos[i] + 0.587 * datos[i + 1] + 0.114 * datos[i + 2];
      if (gris < UMBRAL_FONDO) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }

  if (x1 < 0) return null;
  return { x0, y0, ancho: x1 - x0 + 1, alto: y1 - y0 + 1 };
}

async function cargar(archivo: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((ok, falla) => {
      img.onload = () => ok();
      img.onerror = () => falla(new Error("No se pudo leer la imagen."));
      img.src = url;
    });
    return img;
  } finally {
    // Se libera siempre: sin esto, cada foto subida deja memoria retenida y
    // después de varias en el mismo rato el navegador del teléfono se queda sin.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/**
 * Devuelve la foto ya normalizada, lista para guardar tal cual.
 * @throws si la imagen está en blanco o el navegador no puede generar webp.
 */
export async function normalizarEnCanvas(archivo: File): Promise<Blob> {
  const img = await cargar(archivo);
  const anchoOrig = img.naturalWidth;
  const altoOrig = img.naturalHeight;

  if (!anchoOrig || !altoOrig) throw new Error("La imagen no tiene tamaño.");

  // Para buscar la caja no hace falta la resolución completa: con el lado largo
  // en 1000 alcanza y en un teléfono es varias veces más rápido. El recorte
  // final se hace sobre el original, así que no se pierde calidad.
  const escaneo = Math.min(1, LADO / Math.max(anchoOrig, altoOrig));
  const anchoEsc = Math.max(1, Math.round(anchoOrig * escaneo));
  const altoEsc = Math.max(1, Math.round(altoOrig * escaneo));

  const lienzoEsc = document.createElement("canvas");
  lienzoEsc.width = anchoEsc;
  lienzoEsc.height = altoEsc;
  const ctxEsc = lienzoEsc.getContext("2d", { willReadFrequently: true });
  if (!ctxEsc) throw new Error("El navegador no permitió procesar la imagen.");
  ctxEsc.drawImage(img, 0, 0, anchoEsc, altoEsc);

  const c = caja(ctxEsc.getImageData(0, 0, anchoEsc, altoEsc).data, anchoEsc, altoEsc);
  if (!c) throw new Error("La imagen parece estar en blanco.");

  // La caja se midió sobre la versión reducida: se vuelve a las coordenadas del
  // original antes de recortar.
  const x0 = c.x0 / escaneo;
  const y0 = c.y0 / escaneo;
  const ancho = c.ancho / escaneo;
  const alto = c.alto / escaneo;

  let escala = (OBJETIVO * LADO) / Math.sqrt(ancho * alto);
  escala = Math.min(escala, (TOPE * LADO) / ancho, (TOPE * LADO) / alto);
  const nw = Math.max(1, Math.round(ancho * escala));
  const nh = Math.max(1, Math.round(alto * escala));

  const lienzo = document.createElement("canvas");
  lienzo.width = LADO;
  lienzo.height = LADO;
  const ctx = lienzo.getContext("2d");
  if (!ctx) throw new Error("El navegador no permitió procesar la imagen.");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, LADO, LADO);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    img,
    x0, y0, ancho, alto,
    Math.round((LADO - nw) / 2), Math.round((LADO - nh) * CENTRO_Y), nw, nh,
  );

  const blob = await new Promise<Blob | null>((ok) =>
    lienzo.toBlob(ok, "image/webp", CALIDAD),
  );

  // Safari viejo devuelve null para webp. Es preferible cortar acá con un
  // mensaje claro que subir un png disfrazado de webp y despatarrar el catálogo.
  if (!blob || blob.type !== "image/webp") {
    throw new Error("Este navegador no puede generar webp. Probá con Chrome.");
  }

  return blob;
}

/**
 * Firma de la imagen, igual que scripts/auditar-imagenes.py: sha1 del archivo
 * truncado a 16. Va a data/imagenes-validadas.json, que es lo que marca a una
 * foto como publicable. Dos fotos idénticas dan la misma firma, y así se siguen
 * detectando las repetidas entre referencias distintas.
 */
export async function firmar(blob: Blob): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-1", await blob.arrayBuffer());
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}
