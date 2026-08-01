import { notFound } from "next/navigation";
import { modelos, modeloPorSlug, slugFamilia } from "@/lib/catalogo";
import { rutaImagen } from "@/lib/imagenes";
import { SITIO } from "@/lib/seo";
import Migas from "@/components/Migas";
import SelectorUnidades from "@/components/SelectorUnidades";
import Volver from "@/components/Volver";
import { precio } from "@/lib/formato";
import { tipoCambio } from "@/lib/dolar";

export function generateStaticParams() {
  return modelos().map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = modeloPorSlug(slug);
  if (!m) return { title: "Modelo — iPhone Connection" };
  const url = `${SITIO}/modelo/${m.slug}`;
  const titulo = `${m.nombre} — iPhone Connection`;
  const desc = `${m.nombre} desde ${precio(m.desdeCentavos)}. ${m.unidades.length} unidades con estado y batería declarados.`;
  return {
    title: titulo, description: desc,
    alternates: { canonical: url },
    openGraph: { title: titulo, description: desc, url, type: "website", locale: "es_AR" },
    twitter: { card: "summary_large_image", title: titulo, description: desc },
  };
}

export default async function ModeloPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = modeloPorSlug(slug);
  if (!m) notFound();
  const tc = await tipoCambio();

  return (
    <div className="contenedor">
      <Migas
        items={[
          ["INICIO", "/"],
          [m.categoria.toUpperCase(), `/catalogo/${slugFamilia(m.categoria)}`],
          [m.nombre.toUpperCase(), null],
        ]}
      />
      <Volver href={`/catalogo/${slugFamilia(m.categoria)}`} texto={`Volver a ${m.categoria}`} />
      <div className="grid gap-10 py-4 pb-16 md:grid-cols-2 md:pb-20 md:gap-14">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-white">
          <img src={rutaImagen(m.unidades[0].ref)} alt={m.nombre} className="h-full w-full object-contain" />
        </div>
        <SelectorUnidades modelo={m} tc={tc.valor} />
      </div>
    </div>
  );
}
