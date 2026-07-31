import { notFound } from "next/navigation";
import { todasLasUnidades, unidadPorRef, slugFamilia } from "@/lib/catalogo";
import { rutaImagen } from "@/lib/imagenes";
import { precio, precioARS, capacidad, garantia, linkWhatsApp, ETIQUETA_DISPONIBILIDAD } from "@/lib/formato";
import Migas from "@/components/Migas";
import Volver from "@/components/Volver";
import { tipoCambio, fechaLegible } from "@/lib/dolar";

export function generateStaticParams() {
  return todasLasUnidades().map((u) => ({ ref: u.ref }));
}

export async function generateMetadata({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const u = unidadPorRef(ref);
  return {
    title: u ? `${u.nombre} ${u.estadoEtiqueta} — iPhone Connection` : "Unidad",
    description: u ? `${u.nombreCompleto}. Batería ${u.bateria ?? 100}%. Garantía ${garantia(u)}.` : undefined,
  };
}

export default async function UnidadPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const u = unidadPorRef(ref);
  if (!u) notFound();
  const tc = await tipoCambio();

  const filas: [string, string][] = [
    ["Salud de batería", u.bateria ? `${u.bateria} %` : "—"],
    ["Grado", u.estadoEtiqueta.toUpperCase()],
    ["Capacidad", capacidad(u.capacidadGb)],
    ["Color", (u.color ?? u.colores?.join(" / ") ?? "—").toUpperCase()],
    ["Garantía", garantia(u).toUpperCase()],
    ["Referencia", `#${u.ref}`],
  ];

  return (
    <div className="contenedor">
      <Migas
        items={[
          ["INICIO", "/"],
          [u.categoria.toUpperCase(), `/catalogo/${slugFamilia(u.categoria)}`],
          [u.modelo.toUpperCase(), `/modelo/${u.modeloSlug}`],
          [`#${u.ref}`, null],
        ]}
      />
      <Volver href={`/modelo/${u.modeloSlug}`} texto={`Volver a ${u.modelo}`} />
      <div className="grid gap-10 py-4 pb-20 md:grid-cols-2 md:gap-14">
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-surface">
            <img src={rutaImagen(u.ref)} alt={u.nombre} className="h-full w-full object-contain" />
          </div>
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-surface">
            <img src={rutaImagen(u.ref)} alt="" className="h-full w-full object-contain" />
          </div>
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-surface">
            <img src={rutaImagen(u.ref)} alt="" className="h-full w-full object-contain" />
          </div>
        </div>

        <div>
          <h1 className="mb-1.5 text-[clamp(26px,3.6vw,36px)] font-semibold leading-[1.08] tracking-[-.035em]">
            {u.nombre}
          </h1>
          <p className="mb-6 text-[15px] text-mute">
            {u.estadoEtiqueta} · {ETIQUETA_DISPONIBILIDAD[u.disponibilidad]}
          </p>

          <p className="text-[33px] font-semibold tracking-[-.03em]">{precio(precioARS(u, tc.valor))}</p>
          <p className="mt-1.5 font-data text-[11px] tracking-[.06em] text-mute">
            {tc.fuente === "api"
              ? `${tc.nombre.toUpperCase()} $${tc.valor} · ${fechaLegible(tc)}`
              : "COTIZACIÓN DE RESPALDO · CONSULTAR ANTES DE COMPRAR"}
          </p>

          {u.bateriaPosibleReemplazo && (
        <div className="my-5 rounded-md border border-line bg-surface px-4 py-3.5 text-[13.5px]">
          <b className="mb-1 block text-[11px] uppercase tracking-[.1em]">Sobre la batería al 100%</b>
          Una batería al 100% en un equipo usado normalmente significa que fue reemplazada.
          Consultanos si es original o de recambio antes de comprar: te lo confirmamos por escrito.
        </div>
      )}

      {u.defecto && (
            <div className="my-5 rounded-md border border-[#E6D8B0] bg-[#FBF6E8] px-4 py-3.5 text-[13.5px]">
              <b className="mb-1 block text-[11px] uppercase tracking-[.1em]">Detalle declarado</b>
              {u.defecto}. Está contemplado en el precio y lo revisás antes de comprar.
            </div>
          )}

          <div className="my-6 rounded-md border border-line p-5">
            <h4 className="etiqueta mb-3.5">Estado de esta unidad</h4>
            {filas.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-line py-2.5 text-sm last:border-0">
                <span className="text-mute">{k}</span>
                <b className="text-right font-data text-[12.5px] font-medium">{v}</b>
              </div>
            ))}
          </div>

          <a href={linkWhatsApp(u)} className="btn-solido w-full text-center">Consultar por WhatsApp</a>
          <p className="mt-3 text-center text-[12.5px] text-mute">El mensaje se envía con la referencia incluida</p>
        </div>
      </div>
    </div>
  );
}
