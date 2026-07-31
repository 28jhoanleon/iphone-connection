/**
 * Datos de la empresa · fuente única.
 * Ningún dato de contacto vive dentro de un componente. Se cargan de data/empresa.json
 * y los campos vacíos se detectan con `npm run verificar` antes de desplegar.
 */
import datos from "@/data/empresa.json";

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
}

export const empresa = datos as Empresa;

/** Campos obligatorios para poder publicar. */
export const OBLIGATORIOS: (keyof Empresa)[] = [
  "whatsapp", "instagram", "zona", "horarios", "socios",
];

export function faltantes(): string[] {
  return OBLIGATORIOS.filter((k) => {
    const v = empresa[k];
    return Array.isArray(v) ? v.length === 0 : !v;
  });
}

export function tiene(campo: keyof Empresa): boolean {
  const v = empresa[campo];
  return Array.isArray(v) ? v.length > 0 : Boolean(v);
}
