/**
 * Datos de la empresa · fuente única.
 * Ningún dato de contacto vive dentro de un componente. Se cargan de data/empresa.json
 * y los campos vacíos se detectan con `npm run verificar` antes de desplegar.
 */
import datos from "@/data/empresa.json";

export interface Envios { hace: boolean; alcance: string; costo: string; plazo: string }
export interface Pagos { medios: string[]; nota: string }

export interface Empresa {
  nombre: string;
  whatsapp: string;
  instagram: string;
  email: string;
  zona: string;
  horarios: string;
  socios: string[];
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
 * Regla del proyecto: no hay textos "PENDIENTE" en el sitio público, pero tampoco
 * se inventan datos. Un bloque sin información real sencillamente no se renderiza.
 */
export const hayEnvios = () => empresa.envios.hace && Boolean(empresa.envios.alcance);
export const hayPagos = () => empresa.pagos.medios.length > 0;
