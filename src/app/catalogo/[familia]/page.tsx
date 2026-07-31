import Link from "next/link";
import { notFound } from "next/navigation";
import { familias, familiaPorSlug } from "@/lib/catalogo";
import { rutaImagen } from "@/lib/imagenes";
import { precio, precioARS } from "@/lib/formato";
import { tipoCambio } from "@/lib/dolar";
import Migas from "@/components/Migas";
import Volver from "@/components/Volver";

export function generateStaticParams() {
  return familias().map((f) => ({ familia: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ familia: string }> }) {
  const { familia } = await params;
  const f = familiaPorSlug(familia);
  return {
    title: f ? `${f.nombre} — iPhone Connection` : "Catálogo",
    description: f ? `${f.totalUnidades} unidades de ${f.nombre} con estado declarado y garantía escrita.` : undefined,
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
      <div className="grid gap-3.5 pb-16 sm:gap-4 sm:pb-20 sm:grid-cols-2 lg:grid-cols-3">
        {f.modelos.map((m) => (
          <Link
            key={m.slug}
            href={`/modelo/${m.slug}`}
            className="group flex h-full flex-col rounded-lg border border-line bg-paper p-3 transition duration-200 hover:-translate-y-0.5 hover:border-ink sm:p-4"
          >
            <div className="mb-3 aspect-square overflow-hidden rounded-md bg-white">
              <img
                src={rutaImagen(m.unidades[0].ref)}
                alt={m.nombre}
                width={600}
                height={600}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.04]"
              />
            </div>
            <p className="font-data text-[10.5px] uppercase tracking-[.1em] text-mute-soft">
              {m.marca}
            </p>
            <h3 className="mt-1 line-clamp-2 min-h-[2.6em] text-[14.5px] font-medium leading-[1.3] tracking-[-.01em]">
              {m.nombre}
            </h3>
            <p className="mt-auto pt-3 text-[21px] font-semibold leading-none tracking-[-.02em] sm:text-[22px]">
              {precio(Math.min(...m.unidades.map((u) => precioARS(u, tc.valor))))}
            </p>
            <p className="mt-1.5 text-[12.5px] text-mute">
              desde · {m.unidades.length} unidad{m.unidades.length > 1 ? "es" : ""}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
