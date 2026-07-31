import type { Unidad } from "./tipos";
import { empresa } from "./empresa";
import cfg from "@/data/precios.json";

/**
 * Precio en pesos a partir del costo en dólares.
 *   ARS = costo USD x tipo de cambio x (1 + margen), redondeado.
 * El redondeo es intencional: $ 926.000 se lee como precio, $ 926.440 como resultado
 * de una cuenta. Si una unidad no tiene costo cargado se usa su precio almacenado.
 */
export function precioARS(u: { costoCentavos: number | null; precioCentavos: number }, tc: number): number {
  if (!u.costoCentavos) return u.precioCentavos;
  const bruto = u.costoCentavos * tc * (1 + cfg.margen);
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

/**
 * Financiación. Los coeficientes salen de data/precios.json.
 * Se devuelve SIEMPRE el total y el recargo, no solo el valor de la cuota:
 * mostrar "6 cuotas de $X" sin el total es la forma más común de ocultar el costo real.
 */
export interface Plan {
  cuotas: number;
  valorCuota: number;
  total: number;
  recargo: number;
}

export function planes(precioContadoCentavos: number): Plan[] {
  return Object.entries(cfg.cuotas as Record<string, number>)
    .map(([n, coef]) => {
      const cuotas = Number(n);
      const total = Math.round(precioContadoCentavos * coef);
      return { cuotas, valorCuota: Math.round(total / cuotas), total, recargo: coef - 1 };
    })
    .sort((a, b) => a.cuotas - b.cuotas);
}

export const ETIQUETA_DISPONIBILIDAD: Record<string, string> = {
  disponible: "Disponible",
  por_encargo: "Por encargo · 7 a 10 días",
  sin_stock: "Avisame cuando llegue",
};

export function garantia(u: Unidad): string {
  return u.estado === "nuevo_sellado" ? "12 meses" : "6 meses";
}

/** Mensaje precargado de WhatsApp · Doc 00 §9 */
export function linkWhatsApp(u?: Unidad): string {
  // El número vive en data/empresa.json. Si falta, el enlace no se arma:
  // preferible un botón inerte antes que mandar un cliente a un número equivocado.
  if (!empresa.whatsapp) return "#";
  const base = `https://wa.me/${empresa.whatsapp.replace(/\D/g, "")}`;
  if (!u) return `${base}?text=${encodeURIComponent("Hola, quería hacer una consulta.")}`;
  return `${base}?text=${encodeURIComponent(`Hola, me interesa el ${u.nombreCompleto} — ref. #${u.ref}`)}`;
}

/** Cascada de imagen: fotografía propia > generada. Doc: cambiar la foto es dejar caer un archivo. */
export function imagen(u: Unidad, base = ""): string {
  return `${base}/productos/${u.ref}.svg`;
}
