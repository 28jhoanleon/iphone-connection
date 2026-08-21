/**
 * Detector de incoherencias del proveedor.  src/lib/incoherencias.ts
 *
 * La planilla llega con errores: un Samsung S25 Ultra cargado en la categoría
 * iPhone, un Apple Watch entre los teléfonos, capacidades duplicadas. Revisarlos
 * a ojo entre 35 productos que entran es donde se cuela el que se te pasa.
 *
 * Esto NO corrige nada solo. Detecta y sugiere; aceptar es un acto humano.
 *
 * El motivo no es prudencia genérica: el sistema puede ver que "iPhone S25 Ultra"
 * está mal, pero no puede saber si el proveedor quiso decir un Samsung mal
 * categorizado o un iPhone mal nombrado. Elegir por su cuenta significa publicar
 * un teléfono con la marca equivocada sin que nadie se entere, que es peor que
 * dejarlo marcado.
 */

export interface Sospecha {
  campo: "marca" | "categoria" | "nombre";
  actual: string;
  sugerido: string;
  motivo: string;
}

/** Marcas reconocibles por cómo empieza el nombre del producto. */
const MARCAS: Array<[RegExp, string, string]> = [
  // [ patrón en el nombre, marca real, categoría que le corresponde ]
  [/^iphone\b/i, "Apple", "iPhone"],
  [/^ipad/i, "Apple", "Tablets"],
  [/^macbook|^imac|^mac\s+mini/i, "Apple", "Notebooks"],
  [/^apple\s+watch/i, "Apple", "Relojes"],
  [/^airpods/i, "Apple", "Audio"],
  [/^samsung|^galaxy/i, "Samsung", "Android"],
  [/^xiaomi|^redmi|^poco/i, "Xiaomi", "Android"],
  [/^motorola|^moto\s/i, "Motorola", "Android"],
  [/^jbl/i, "JBL", "Audio"],
  [/^ps5|^playstation|^xbox|^nintendo/i, "", "Consolas"],
];

/**
 * Nombres de modelo que pertenecen a otra marca aunque el nombre empiece con la
 * marca equivocada. Es el caso que disparó todo esto: "iPhone S25 Ultra".
 */
const AJENOS: Array<[RegExp, string, string]> = [
  [/\bs\d{2}\b|\bs\d{2}\s*(ultra|plus|\+)/i, "Samsung", "Android"],
  [/\bgalaxy\b/i, "Samsung", "Android"],
  [/\bredmi\b|\bpoco\b/i, "Xiaomi", "Android"],
];

export function detectar(p: {
  nombre?: string;
  categoria?: string;
  marca?: string;
}): Sospecha[] {
  const nombre = (p.nombre ?? "").trim();
  const categoria = (p.categoria ?? "").trim();
  const marca = (p.marca ?? "").trim();
  if (!nombre) return [];

  const fuera: Sospecha[] = [];

  // 1 · el nombre empieza con una marca y contiene un modelo de OTRA.
  //     "iPhone S25 Ultra": empieza como Apple, el modelo es Samsung.
  //     El patrón de marca es sólo la palabra (^iphone\b) y no "^iphone + número":
  //     exigir el número dejaba pasar justo este caso, que es el que importa.
  const empieza = MARCAS.find(([re]) => re.test(nombre));
  for (const [re, marcaReal, catReal] of AJENOS) {
    if (!re.test(nombre)) continue;
    if (empieza && empieza[1] && empieza[1] !== marcaReal) {
      fuera.push({
        campo: "categoria",
        actual: categoria,
        sugerido: catReal,
        motivo: `El nombre dice ${marcaReal} pero está en ${categoria || "sin categoría"}.`,
      });
      if (marca && marca !== marcaReal) {
        fuera.push({
          campo: "marca",
          actual: marca,
          sugerido: marcaReal,
          motivo: `Modelo de ${marcaReal} con marca ${marca}.`,
        });
      }
      return fuera;
    }
  }

  // 2 · la categoría no coincide con el tipo de producto que dice el nombre.
  //     "Apple Watch SE 2" en iPhone.
  if (empieza) {
    const [, marcaReal, catReal] = empieza;
    if (categoria && catReal && categoria !== catReal) {
      fuera.push({
        campo: "categoria",
        actual: categoria,
        sugerido: catReal,
        motivo: `"${nombre.split(" ").slice(0, 2).join(" ")}" no es un producto de ${categoria}.`,
      });
    }
    if (marcaReal && marca && marca !== marcaReal) {
      fuera.push({
        campo: "marca",
        actual: marca,
        sugerido: marcaReal,
        motivo: `Marca declarada ${marca}, el nombre dice ${marcaReal}.`,
      });
    }
  }

  // 3 · capacidad repetida: 'MacBook Neo 13" Citrus 256 GB 256 GB'
  const caps = nombre.match(/\b\d+\s?(GB|TB)\b/gi) ?? [];
  const primera = caps[0];
  const ultima = caps[caps.length - 1];
  if (caps.length > 1 && primera && ultima && primera.toLowerCase() === ultima.toLowerCase()) {
    fuera.push({
      campo: "nombre",
      actual: nombre,
      // se saca la ÚLTIMA repetición, no la primera: la primera suele venir
      // pegada al modelo y sacarla deja el nombre incompleto.
      sugerido: nombre.replace(/\s*\b\d+\s?(GB|TB)\b\s*$/i, "").trim(),
      motivo: "La capacidad aparece dos veces.",
    });
  }

  return fuera;
}
