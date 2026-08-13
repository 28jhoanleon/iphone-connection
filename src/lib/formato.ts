import type { Unidad } from "./tipos";
import { empresa, whatsappPara } from "./empresa";
import cfg from "@/data/precios.json";

/**
 * Precio en pesos a partir del costo en dólares.
 *   ARS = (costo USD + margen de la categoría) x tipo de cambio, redondeado.
 *
 * El margen es un monto fijo en dólares, no un porcentaje: el trabajo por venta
 * —revisión, garantía, asesoramiento— no depende del precio del equipo. Un 15%
 * deja 2 dólares en un cargador y 375 en una notebook.
 * El redondeo es intencional: $ 926.000 se lee como precio, $ 926.440 como resultado
 * de una cuenta. Si una unidad no tiene costo cargado se usa su precio almacenado.
 */
/** Margen en centavos de dólar para esa unidad. El modelo pisa a la categoría. */
type ConMargen = { modelo: string; categoria: string };

export function margenCentavos(u: ConMargen): number {
  const porModelo = (cfg.margenPorModelo ?? {}) as Record<string, number>;
  for (const [clave, usd] of Object.entries(porModelo)) {
    if (u.modelo.toLowerCase().includes(clave.toLowerCase())) return usd * 100;
  }
  const porCat = (cfg.margenPorCategoria ?? {}) as Record<string, number>;
  const usd = porCat[u.categoria] ?? cfg.margenPorDefecto ?? 50;
  return usd * 100;
}

export function precioARS(
  u: { costoCentavos: number | null; precioCentavos: number; modelo?: string; categoria?: string },
  tc: number,
): number {
  if (!u.costoCentavos) return u.precioCentavos;
  const bruto =
    (u.costoCentavos +
      margenCentavos({ modelo: u.modelo ?? "", categoria: u.categoria ?? "" })) * tc;
  const paso = cfg.redondeoPesos * 100;
  return Math.round(bruto / paso) * paso;
}

/** Dinero: siempre centavos enteros en el dato, formateo solo en la vista (Doc 02 §7). */
export function precio(centavos: number): string {
  return "$ " + (centavos / 100).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

export function capacidad(gb: number | null): string {
  if (!gb) return "—";
  return gb >= 1024 && gb % 1024 === 0 ? `${gb / 1024} TB` : `${gb} GB`;
}

export const ETIQUETA_DISPONIBILIDAD: Record<string, string> = {
  disponible: "Stock inmediato",
  ultima_unidad: "Última unidad disponible",
  por_encargo: "Por encargo · 7 a 10 días",
  sin_stock: "Avisame cuando llegue",
};

export function garantia(u: Unidad): string {
  return u.estado === "nuevo_sellado" ? "12 meses" : "6 meses";
}

/** Mensaje precargado de WhatsApp · Doc 00 §9 */
export function linkWhatsApp(u?: Unidad): string {
  // Las consultas se reparten entre los vendedores según la referencia del
  // producto: el mismo equipo cae siempre en el mismo, así no se pisan.
  const numero = whatsappPara(u?.ref);
  if (!numero) return "/contacto";
  const base = `https://wa.me/${numero.replace(/\D/g, "")}`;
  if (!u) return `${base}?text=${encodeURIComponent("Hola, quería hacer una consulta.")}`;
  return `${base}?text=${encodeURIComponent(`Hola, me interesa el ${u.nombreCompleto} — ref. #${u.ref}`)}`;
}

/** Cascada de imagen: fotografía propia > generada. Doc: cambiar la foto es dejar caer un archivo. */
export function imagen(u: Unidad, base = ""): string {
  return `${base}/productos/${u.ref}.svg`;
}
