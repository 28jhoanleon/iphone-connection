import type { Unidad } from "./tipos";

/** Dinero: siempre centavos enteros en el dato, formateo solo en la vista (Doc 02 §7). */
export function precio(centavos: number): string {
  return "$ " + (centavos / 100).toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

export function capacidad(gb: number | null): string {
  if (!gb) return "—";
  return gb >= 1024 && gb % 1024 === 0 ? `${gb / 1024} TB` : `${gb} GB`;
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
  const base = "https://wa.me/5493401410734";
  if (!u) return `${base}?text=${encodeURIComponent("Hola, quería hacer una consulta.")}`;
  return `${base}?text=${encodeURIComponent(`Hola, me interesa el ${u.nombreCompleto} — ref. #${u.ref}`)}`;
}

/** Cascada de imagen: fotografía propia > generada. Doc: cambiar la foto es dejar caer un archivo. */
export function imagen(u: Unidad, base = ""): string {
  return `${base}/productos/${u.ref}.svg`;
}
