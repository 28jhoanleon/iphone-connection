/**
 * Cotización del dólar · DolarApi.com
 * GET https://dolarapi.com/v1/dolares/{tipo} -> { compra, venta, casa, nombre, fechaActualizacion }
 *
 * Se usa el valor de VENTA: es el que se paga para comprar dólares, que es el costo
 * real de reponer mercadería importada.
 *
 * En Vercel se revalida cada 6 horas. Si la API falla, se usa el tipo de cambio de
 * respaldo de data/precios.json y el sitio lo declara: un precio viejo sin avisar es
 * peor que un precio viejo avisado.
 */
import cfg from "@/data/precios.json";

export interface Cotizacion {
  valor: number;
  nombre: string;
  fecha: string | null;
  fuente: "api" | "respaldo";
}

const TIPOS = ["oficial", "blue", "bolsa", "contadoconliqui", "tarjeta", "mayorista", "cripto"] as const;

export async function tipoCambio(): Promise<Cotizacion> {
  const tipo = (TIPOS as readonly string[]).includes(cfg.tipoDolar) ? cfg.tipoDolar : "blue";
  try {
    const r = await fetch(`https://dolarapi.com/v1/dolares/${tipo}`, {
      next: { revalidate: cfg.revalidarSegundos },
    });
    if (!r.ok) throw new Error(String(r.status));
    const d = (await r.json()) as { venta?: number; nombre?: string; fechaActualizacion?: string };
    if (!d.venta || d.venta <= 0) throw new Error("sin valor de venta");
    return {
      valor: d.venta,
      nombre: d.nombre ?? `Dólar ${tipo}`,
      fecha: d.fechaActualizacion ?? null,
      fuente: "api",
    };
  } catch {
    return {
      valor: cfg.tcRespaldo,
      nombre: `Dólar ${tipo}`,
      fecha: null,
      fuente: "respaldo",
    };
  }
}

export function fechaLegible(c: Cotizacion): string {
  if (!c.fecha) return "cotización de respaldo";
  const d = new Date(c.fecha);
  return d.toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}
