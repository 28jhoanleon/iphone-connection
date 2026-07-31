/**
 * Acceso a datos del catálogo · módulo `catalogo` (Doc 02 §5)
 * Regla de límites: ningún componente lee el JSON directo. Todo pasa por acá.
 * Cuando migremos a Supabase se reemplaza el import por una query y nada más cambia.
 */
import datos from "@/data/catalogo.json";
import type { Familia, Modelo, Unidad } from "./tipos";
import { precioARS } from "./formato";

/** Orden de las categorías. Apple primero: jerarquía de marca del Doc 00. */
const ORDEN = ["iPhone", "Android", "Notebooks", "Tablets", "Relojes",
               "Audio", "Consolas", "Accesorios", "Cámaras"];

/** Mínimo de productos para que una categoría se publique (Doc 00 §6). */
const MINIMO_PUBLICAR = 6;

export function slugFamilia(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function todasLasUnidades(): Unidad[] {
  return (datos as Unidad[]).filter((u) => u.publicado);
}

export function unidadPorRef(ref: string): Unidad | undefined {
  return todasLasUnidades().find((u) => u.ref === ref);
}

export function modelos(): Modelo[] {
  const mapa = new Map<string, Unidad[]>();
  for (const u of todasLasUnidades()) {
    const l = mapa.get(u.modeloSlug) ?? [];
    l.push(u);
    mapa.set(u.modeloSlug, l);
  }
  return [...mapa.entries()].map(([slug, unidades]) => ({
    slug,
    nombre: unidades[0].modelo,
    categoria: unidades[0].categoria,
    marca: unidades[0].marca,
    unidades: unidades.sort((a, b) => a.precioCentavos - b.precioCentavos),
    desdeCentavos: Math.min(...unidades.map((u) => u.precioCentavos)),
    capacidades: [...new Set(unidades.map((u) => u.capacidadGb).filter((c): c is number => !!c))].sort((a, b) => a - b),
    colores: [...new Set(unidades.flatMap((u) => u.colores ?? (u.color ? [u.color] : [])))],
  }));
}

export function modeloPorSlug(slug: string): Modelo | undefined {
  return modelos().find((m) => m.slug === slug);
}

/** Doc 00 §6: una categoría con menos de 6 productos comunica abandono. */
export const MINIMO_POR_CATEGORIA = 6;

/** Categorías que se muestran en navegación. Las flacas siguen accesibles por buscador y URL. */
export function familiasVisibles(): Familia[] {
  return familias().filter((f) => f.totalUnidades >= MINIMO_POR_CATEGORIA);
}

export function familias(): Familia[] {
  const mapa = new Map<string, Modelo[]>();
  for (const m of modelos()) {
    const l = mapa.get(m.categoria) ?? [];
    l.push(m);
    mapa.set(m.categoria, l);
  }
  return [...mapa.entries()]
    .map(([nombre, mods]) => ({
      nombre,
      slug: slugFamilia(nombre),
      modelos: mods.sort((a, b) => b.desdeCentavos - a.desdeCentavos),
      totalUnidades: mods.reduce((n, m) => n + m.unidades.length, 0),
    }))
    .filter((f) => f.totalUnidades >= MINIMO_PUBLICAR)
    .sort((a, b) => {
      const ia = ORDEN.indexOf(a.nombre), ib = ORDEN.indexOf(b.nombre);
      if (ia !== ib) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      return b.totalUnidades - a.totalUnidades;
    });
}

export function familiaPorSlug(slug: string): Familia | undefined {
  return familias().find((f) => f.slug === slug);
}

/** Destacados: uno por categoría, para que la Home muestre el ancho del catálogo. */
export function destacadas(n = 4): Unidad[] {
  const elegidas: Unidad[] = [];
  for (const f of familias()) {
    const mejor = f.modelos
      .flatMap((m) => m.unidades)
      .filter((u) => u.estado !== "seleccionado_c" && !u.defecto)
      .sort((a, b) => b.precioCentavos - a.precioCentavos)[0];
    if (mejor) elegidas.push(mejor);
    if (elegidas.length === n) break;
  }
  return elegidas;
}

export function fechaActualizacion(): string {
  const u = todasLasUnidades()[0];
  return u ? u.actualizado.split("-").reverse().join("/") : "";
}

/** Índice de búsqueda · se arma en build y viaja al cliente ya reducido. */
export interface ItemBusqueda {
  tipo: "modelo" | "unidad";
  titulo: string;
  detalle: string;
  href: string;
  precioCentavos: number;
  clave: string;
}

function normalizar(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function indiceBusqueda(tc: number): ItemBusqueda[] {
  const items: ItemBusqueda[] = [];

  for (const m of modelos()) {
    items.push({
      tipo: "modelo",
      titulo: m.nombre,
      detalle: `${m.unidades.length} unidad${m.unidades.length > 1 ? "es" : ""} · ${m.categoria}`,
      href: `/modelo/${m.slug}`,
      precioCentavos: Math.min(...m.unidades.map((u) => precioARS(u, tc))),
      clave: normalizar([m.nombre, m.categoria, m.marca].join(" ")),
    });
  }

  for (const u of todasLasUnidades()) {
    const colores = u.colores?.join(" ") ?? u.color ?? "";
    items.push({
      tipo: "unidad",
      titulo: u.nombre,
      detalle: `${u.estadoEtiqueta}${u.bateria ? ` · batería ${u.bateria}%` : ""} · #${u.ref}`,
      href: `/unidad/${u.ref}`,
      precioCentavos: precioARS(u, tc),
      clave: normalizar(
        [u.nombre, u.ref, u.estadoEtiqueta, colores, u.capacidadGb ? `${u.capacidadGb}gb` : ""].join(" "),
      ),
    });
  }

  return items;
}
