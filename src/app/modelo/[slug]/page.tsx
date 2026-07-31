import { notFound } from "next/navigation";
import { modelos, modeloPorSlug, slugFamilia } from "@/lib/catalogo";
import { rutaImagen } from "@/lib/imagenes";
import Migas from "@/components/Migas";
import SelectorUnidades from "@/components/SelectorUnidades";
import { precio } from "@/lib/formato";

export function generateStaticParams() {
  return modelos().map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = modeloPorSlug(slug);
  return {
    title: m ? `${m.nombre} — iPhone Connection` : "Modelo",
    description: m ? `${m.nombre} desde ${precio(m.desdeCentavos)}. Estado y batería declarados unidad por unidad.` : undefined,
  };
}

export default async function ModeloPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = modeloPorSlug(slug);
  if (!m) notFound();

  return (
    <div className="contenedor">
      <Migas
        items={[
          ["INICIO", "/"],
          [m.categoria.toUpperCase(), `/catalogo/${slugFamilia(m.categoria)}`],
          [m.nombre.toUpperCase(), null],
        ]}
      />
      <div className="grid gap-10 py-4 pb-20 md:grid-cols-2 md:gap-14">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-surface">
          <img src={rutaImagen(m.unidades[0].ref)} alt={m.nombre} className="h-full w-full object-contain" />
        </div>
        <SelectorUnidades modelo={m} />
      </div>
    </div>
  );
}
