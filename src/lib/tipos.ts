/** Contrato de datos del catálogo. Fuente única: data/catalogo.json */

export type Estado = "nuevo_sellado" | "seleccionado_a" | "seleccionado_b" | "seleccionado_c";
export type Disponibilidad = "disponible" | "por_encargo" | "sin_stock";
export type Origen = "propio" | "proveedor";

export interface Unidad {
  ref: string;
  modelo: string;
  modeloSlug: string;
  config: string | null;
  nombre: string;
  nombreCompleto: string;
  marca: string;
  categoria: string;
  arquetipo: string;
  capacidadGb: number | null;
  color: string | null;
  colores: string[] | null;
  estado: Estado;
  estadoEtiqueta: string;
  bateria: number | null;
  bateriaPosibleReemplazo: boolean;
  defecto: string | null;
  costoCentavos: number | null;
  precioCentavos: number;
  origen: Origen;
  disponibilidad: Disponibilidad;
  publicado: boolean;
  actualizado: string;
}

export interface Modelo {
  slug: string;
  nombre: string;
  categoria: string;
  marca: string;
  unidades: Unidad[];
  desdeCentavos: number;
  capacidades: number[];
  colores: string[];
}

export interface Familia {
  nombre: string;
  slug: string;
  modelos: Modelo[];
  totalUnidades: number;
}
