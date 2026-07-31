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
      <div className="py-6 pb-8">
        <h1 className="text-[clamp(30px,5vw,48px)] font-semibold tracking-[-.04em]">{f.nombre}</h1>
        <p className="mt-1.5 font-data text-xs tracking-[.06em] text-mute">
          {f.totalUnidades} {f.totalUnidades === 1 ? "UNIDAD" : "UNIDADES"} · {f.modelos.length} {f.modelos.length === 1 ? "MODELO" : "MODELOS"}
        </p>
      </div>
      <div className="grid gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-3">
        {f.modelos.map((m) => (
          <Link key={m.slug} href={`/modelo/${m.slug}`} className="tarjeta flex items-center gap-3.5 p-4">
            <img src={rutaImagen(m.unidades[0].ref)} alt="" className="h-20 w-16 flex-none object-contain" />
            <div className="min-w-0">
              <h3 className="mb-0.5 truncate text-base font-semibold tracking-[-.02em]">{m.nombre}</h3>
              <p className="text-[15px] font-semibold tracking-[-.01em]">desde {precio(Math.min(...m.unidades.map((u) => precioARS(u, tc.valor))))}</p>
              <p className="font-data text-[11px] tracking-[.05em] text-mute">
                {m.unidades.length} UNIDAD{m.unidades.length > 1 ? "ES" : ""}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
