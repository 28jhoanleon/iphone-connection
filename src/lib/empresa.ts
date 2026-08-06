/**
 * Datos de la empresa · fuente única.
 * Ningún dato de contacto vive dentro de un componente. Se cargan de data/empresa.json
 * y los campos vacíos se detectan con `npm run verificar` antes de desplegar.
 */
import datos from "@/data/empresa.json";

export interface Envios { hace: boolean; alcance: string; costo: string; plazo: string }
export interface Pagos { medios: string[]; nota: string }

export interface Vendedor { nombre: string; whatsapp: string }

export interface Empresa {
  nombre: string;
  whatsapp: string;
  instagram: string;
  email: string;
  zona: string;
  horarios: string;
  socios: string[];
  vendedores?: Vendedor[];
  anioFundacion: string;
  dominio: string;
  envios: Envios;
  pagos: Pagos;
  incluyeCaja: { nuevo_sellado: string[]; usado: string[] };
}

export const empresa = datos as Empresa;


export function tiene(campo: keyof Empresa): boolean {
  const v = empresa[campo];
  return Array.isArray(v) ? v.length > 0 : Boolean(v);
}

/**
 * Un bloque sin información real no se renderiza. No se inventan datos ni se
 * muestran marcadores en el sitio público.
 */
export const hayEnvios = () => empresa.envios.hace && Boolean(empresa.envios.alcance);
export const hayPagos = () => empresa.pagos.medios.length > 0;

/**
 * Reparto de consultas entre los vendedores.
 *
 * Se elige por la referencia del producto, no al azar: así el mismo equipo
 * siempre cae en el mismo vendedor y no pasa que dos personas contesten la
 * misma consulta. Sin referencia (contacto general) va al primero.
 */
export function whatsappPara(ref?: string): string {
  const vs = empresa.vendedores?.filter((v) => v.whatsapp) ?? [];
  if (vs.length === 0) return empresa.whatsapp;
  if (!ref) return vs[0].whatsapp;
  // Sumar los caracteres reparte mal: las referencias son casi iguales (A101,
  // A102…) y la suma queda siempre en el mismo resto. Se usa el número final,
  // que sí varía parejo entre unidades.
  const n = parseInt(ref.replace(/\D/g, ""), 10) || 0;
  return vs[n % vs.length].whatsapp;
}
