/**
 * Acceso a datos del catálogo · módulo `catalogo` (Doc 02 §5)
 * Regla de límites: ningún componente lee el JSON directo. Todo pasa por acá.
 * Cuando migremos a Supabase se reemplaza el import por una query y nada más cambia.
 */
import datos from "@/data/catalogo.json";
import type { Familia, Modelo, Unidad } from "./tipos";

const SLUG_FAMILIA: Record<string, string> = {
  iPhone: "iphone",
  "Apple Watch": "apple-watch",
  Accesorios: "accesorios",
  Mac: "mac",
  iPad: "ipad",
  AirPods: "airpods",
  Android: "android",
  Audio: "audio",
  Consolas: "consolas",
};

export function slugFamilia(nombre: string): string {
  return SLUG_FAMILIA[nombre] ?? nombre.toLowerCase().replace(/\s+/g, "-");
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
    .sort((a, b) => b.totalUnidades - a.totalUnidades);
}

export function familiaPorSlug(slug: string): Familia | undefined {
  return familias().find((f) => f.slug === slug);
}

export function destacadas(n = 4): Unidad[] {
  return todasLasUnidades()
    .filter((u) => u.estado !== "seleccionado_c" && !u.defecto)
    .sort((a, b) => (b.bateria ?? 0) - (a.bateria ?? 0))
    .slice(0, n);
}

export function fechaActualizacion(): string {
  const u = todasLasUnidades()[0];
  return u ? u.actualizado.split("-").reverse().join("/") : "";
}
