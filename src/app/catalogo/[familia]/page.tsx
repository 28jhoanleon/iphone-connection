import Link from "next/link";
import { notFound } from "next/navigation";
import { familias, familiaPorSlug } from "@/lib/catalogo";
import { rutaImagenUnidad } from "@/lib/imagenes";
import { precio, precioARS } from "@/lib/formato";
import { tipoCambio } from "@/lib/dolar";
import { SITIO } from "@/lib/seo";
import Migas from "@/components/Migas";
import ExplorarModelos from "@/components/ExplorarModelos";
import Revelar from "@/components/Revelar";
import Volver from "@/components/Volver";

export function generateStaticParams() {
  return familias().map((f) => ({ familia: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ familia: string }> }) {
  const { familia } = await params;
  const f = familiaPorSlug(familia);
  if (!f) return { title: "Catálogo — iPhone Connection" };
  const url = `${SITIO}/catalogo/${f.slug}`;
  const titulo = `${f.nombre} — iPhone Connection`;
  const desc = `${f.totalUnidades} equipos de ${f.nombre} con estado y batería declarados, precio actualizado y garantía escrita.`;
  return {
    title: titulo, description: desc,
    alternates: { canonical: url },
    openGraph: { title: titulo, description: desc, url, type: "website", locale: "es_AR" },
    twitter: { card: "summary_large_image", title: titulo, description: desc },
  };
}

export default async function Familia({ params }: { params: Promise<{ familia: string }> }) {
  const { familia } = await params;
  const f = familiaPorSlug(familia);
  if (!f) notFound();
  const tc = await tipoCambio();

  return (
    <div className="contenedor">
      <Migas items={[["INICIO", "/"], [f.nombre.toUpperCase(), null]]} />
      <Volver href="/" texto="Volver al inicio" />
      <div className="pb-6 pt-5 sm:pb-8 sm:pt-6">
        <h1 className="text-balance text-[clamp(28px,6.5vw,48px)] font-semibold leading-[1.06] tracking-[-.03em]">{f.nombre}</h1>
        <p className="mt-1.5 font-data text-xs tracking-[.06em] text-mute">
          {f.totalUnidades} {f.totalUnidades === 1 ? "UNIDAD" : "UNIDADES"} · {f.modelos.length} {f.modelos.length === 1 ? "MODELO" : "MODELOS"}
        </p>
      </div>
      <ExplorarModelos
        items={f.modelos.map((m) => {
          const precios = m.unidades.map((u) => precioARS(u, tc.valor));
          return {
            slug: m.slug,
            nombre: m.nombre,
            marca: m.marca,
            imagen: rutaImagenUnidad(m.unidades[0]),
            desde: Math.min(...precios),
            unidades: m.unidades.length,
            capacidades: m.capacidades,
            colores: [...new Set(m.unidades.flatMap((u) =>
              u.colores?.length ? u.colores : u.color ? [u.color] : []))],
            hayNuevo: m.unidades.some((u) => u.estado === "nuevo_sellado"),
            hayUsado: m.unidades.some((u) => u.estado !== "nuevo_sellado"),
            hayUnicas: m.unidades.some((u) => u.disponibilidad === "ultima_unidad"),
            bateriaMax: Math.max(0, ...m.unidades.map((u) => u.bateria ?? 0)) || null,
          };
        })}
        marcas={[...new Set(f.modelos.map((m) => m.marca))].sort()}
      />
    </div>
  );
}
