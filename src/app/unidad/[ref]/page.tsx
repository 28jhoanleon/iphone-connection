import Link from "next/link";
import { notFound } from "next/navigation";
import {
  todasLasUnidades, unidadPorRef, slugFamilia,
  mismasUnidades, relacionados, accesoriosCompatibles, esUltimasUnidades,
} from "@/lib/catalogo";
import { rutaImagenUnidad } from "@/lib/imagenes";
import {
  precio, precioARS, capacidad, garantia, linkWhatsApp, ETIQUETA_DISPONIBILIDAD,
} from "@/lib/formato";
import { tipoCambio, fechaLegible, MOSTRAR_COTIZACION } from "@/lib/dolar";
import { empresa, hayEnvios, hayPagos } from "@/lib/empresa";
import { SITIO } from "@/lib/seo";
import Migas from "@/components/Migas";
import Volver from "@/components/Volver";
import TarjetaUnidad from "@/components/TarjetaUnidad";
import EtiquetaEstado from "@/components/EtiquetaEstado";
import BloqueFicha from "@/components/BloqueFicha";
import FilaDato from "@/components/FilaDato";

export function generateStaticParams() {
  return todasLasUnidades().map((u) => ({ ref: u.ref }));
}

export async function generateMetadata({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const u = unidadPorRef(ref);
  if (!u) return { title: "Unidad no encontrada" };

  const titulo = `${u.nombre} ${u.estadoEtiqueta} — iPhone Connection`;
  const desc = `${u.nombreCompleto}. ${u.bateria ? `Salud de batería ${u.bateria}%. ` : ""}Garantía ${garantia(u)}. Estado declarado antes de comprar.`;
  const url = `${SITIO}/unidad/${u.ref}`;
  const img = `${SITIO}${rutaImagenUnidad(u)}`;

  return {
    title: titulo,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      title: titulo, description: desc, url, type: "website",
      locale: "es_AR", siteName: "iPhone Connection",
      images: [{ url: img, width: 1000, height: 1000, alt: u.nombre }],
    },
    twitter: { card: "summary_large_image", title: titulo, description: desc, images: [img] },
  };
}

export default async function UnidadPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const u = unidadPorRef(ref);
  if (!u) notFound();

  const tc = await tipoCambio();
  const p = precioARS(u, tc.valor);
  const otras = mismasUnidades(u);
  const similares = relacionados(u);
  const accesorios = accesoriosCompatibles(u);
  const sellado = u.estado === "nuevo_sellado";
  const caja = sellado ? empresa.incluyeCaja.nuevo_sellado : empresa.incluyeCaja.usado;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: u.nombreCompleto,
    sku: u.ref,
    brand: { "@type": "Brand", name: u.marca },
    category: u.categoria,
    image: [`${SITIO}${rutaImagenUnidad(u)}`],
    description: `${u.nombre}. ${u.estadoEtiqueta}.${u.bateria ? ` Salud de batería ${u.bateria}%.` : ""}`,
    itemCondition: sellado
      ? "https://schema.org/NewCondition"
      : "https://schema.org/UsedCondition",
    offers: {
      "@type": "Offer",
      url: `${SITIO}/unidad/${u.ref}`,
      priceCurrency: "ARS",
      price: (p / 100).toFixed(0),
      availability:
        u.disponibilidad === "disponible"
          ? "https://schema.org/InStock"
          : u.disponibilidad === "por_encargo"
            ? "https://schema.org/PreOrder"
            : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "iPhone Connection" },
    },
  };

  return (
    <div className="contenedor">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Migas
        items={[
          ["INICIO", "/"],
          [u.categoria.toUpperCase(), `/catalogo/${slugFamilia(u.categoria)}`],
          [u.modelo.toUpperCase(), `/modelo/${u.modeloSlug}`],
          [`#${u.ref}`, null],
        ]}
      />
      <Volver href={`/modelo/${u.modeloSlug}`} texto={`Volver a ${u.modelo}`} />

      <div className="grid gap-8 py-3 pb-14 sm:gap-10 sm:py-4 md:grid-cols-2 md:gap-14">
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-white">
            <img
              src={rutaImagenUnidad(u)} alt={u.nombre} width={1000} height={750}
              fetchPriority="high" decoding="async"
              className="h-full w-full object-contain"
            />
          </div>
          {[0, 1].map((i) => (
            <div key={i} className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-white">
              <img
                src={rutaImagenUnidad(u)} alt="" width={500} height={500}
                loading="lazy" decoding="async"
                className="h-full w-full object-contain"
              />
            </div>
          ))}
        </div>

        <div>
          <EtiquetaEstado unidad={u} ultimas={esUltimasUnidades(u)} />
          <h1 className="mb-1.5 mt-3 text-[clamp(26px,5.6vw,36px)] font-semibold leading-[1.08] tracking-[-.035em]">
            {u.nombre}
          </h1>
          <p className="mb-5 text-[15px] text-mute">
            {u.estadoEtiqueta} · {ETIQUETA_DISPONIBILIDAD[u.disponibilidad]}
          </p>

          {u.descripcion && (
            <p className="mb-7 max-w-[52ch] text-[15.5px] leading-[1.65] text-mute">
              {u.descripcion}
            </p>
          )}

          <p className="text-[clamp(28px,7.4vw,33px)] font-semibold leading-none tracking-[-.03em]">
            {precio(p)}
          </p>
          {MOSTRAR_COTIZACION && tc.fuente === "api" && (
            <p className="mt-2 font-data text-[11px] tracking-[.06em] text-mute-soft">
              {tc.nombre.toUpperCase()} ${tc.valor} · {fechaLegible(tc)}
            </p>
          )}

          {u.defecto && (
            <div className="my-5 rounded-lg border border-aviso-linea bg-aviso-fondo px-4 py-3.5 text-[14.5px]">
              <b className="mb-1 block font-data text-[10.5px] uppercase tracking-[.1em]">Detalle declarado</b>
              {u.defecto}. Está contemplado en el precio y lo revisás antes de comprar.
            </div>
          )}

          {u.bateriaPosibleReemplazo && (
            <div className="my-5 rounded-lg border border-line bg-surface px-4 py-3.5 text-[14.5px]">
              <b className="mb-1 block font-data text-[10.5px] uppercase tracking-[.1em]">Sobre la batería al 100%</b>
              En un equipo usado suele significar que fue reemplazada. Consultanos si es original
              o de recambio: te lo confirmamos por escrito.
            </div>
          )}

          <a href={linkWhatsApp(u)} className="btn-solido my-6 w-full">Consultar por WhatsApp</a>

          <div className="space-y-4">
            <BloqueFicha titulo="Estado de esta unidad">
              <FilaDato k="Salud de batería" v={u.bateria ? `${u.bateria} %` : "—"} />
              <FilaDato k="Grado" v={u.estadoEtiqueta.toUpperCase()} />
              <FilaDato k="Capacidad" v={capacidad(u.capacidadGb)} />
              <FilaDato k="Color" v={(u.color ?? u.colores?.join(" / ") ?? "—").toUpperCase()} />
              <FilaDato k="Garantía" v={garantia(u).toUpperCase()} />
              <FilaDato k="Referencia" v={`#${u.ref}`} />
            </BloqueFicha>

            <BloqueFicha titulo="Qué incluye">
              <ul className="space-y-1.5 text-[14.5px] text-mute">
                {caja.map((x) => (
                  <li key={x} className="flex gap-2">
                    <span className="text-ink" aria-hidden="true">·</span>{x}
                  </li>
                ))}
                <li className="flex gap-2">
                  <span className="text-ink" aria-hidden="true">·</span>
                  Comprobante de compra y garantía por escrito
                </li>
              </ul>
              {!sellado && (
                <p className="mt-3 text-[12.5px] text-mute-soft">
                  Los equipos seleccionados no incluyen la caja original salvo que se aclare.
                </p>
              )}
            </BloqueFicha>

            {hayPagos() && (
              <BloqueFicha titulo="Formas de pago">
                <p className="text-[14.5px] text-mute">{empresa.pagos.medios.join(" · ")}</p>
                {empresa.pagos.nota && (
                  <p className="mt-1.5 text-[12.5px] text-mute-soft">{empresa.pagos.nota}</p>
                )}
              </BloqueFicha>
            )}

            {hayEnvios() && (
              <BloqueFicha titulo="Envíos">
                <p className="text-[14.5px] text-mute">{empresa.envios.alcance}</p>
                {empresa.envios.plazo && <p className="mt-1.5 text-[12.5px] text-mute-soft">{empresa.envios.plazo}</p>}
                {empresa.envios.costo && <p className="mt-1 text-[12.5px] text-mute-soft">{empresa.envios.costo}</p>}
              </BloqueFicha>
            )}

            <BloqueFicha titulo="Preguntas sobre este equipo">
              <dl className="divide-y divide-line">
                {[
                  ["¿Puedo revisarlo antes de pagar?", "Sí. Coordinamos y lo probás con nosotros: batería, pantalla, cámaras y funciones principales. Si algo no coincide con lo publicado, no hay venta."],
                  [sellado ? "¿Viene sellado de fábrica?" : "¿Qué significa este grado?",
                   sellado ? "Sí, con la caja cerrada y la documentación original." : `${u.estadoEtiqueta} indica el estado estético y la salud de batería declarada arriba, verificada antes de publicar.`],
                  ["¿Cómo verifico el IMEI?", "Te lo mostramos en el momento de la compra y te acompañamos a verificarlo si no sabés cómo."],
                ].map(([q, a]) => (
                  <div key={q} className="py-3 first:pt-0 last:pb-0">
                    <dt className="text-[14.5px] font-medium">{q}</dt>
                    <dd className="mt-1 text-[14.5px] leading-relaxed text-mute">{a}</dd>
                  </div>
                ))}
              </dl>
              <Link href="/faq" className="btn-texto mt-3">Ver todas las preguntas →</Link>
            </BloqueFicha>
          </div>
        </div>
      </div>

      {otras.length > 0 && (
        <section className="border-t border-line py-10 sm:py-12">
          <h2 className="titulo-sec mb-6">Otras unidades del {u.modelo}</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {otras.map((x) => <TarjetaUnidad key={x.ref} u={x} tc={tc.valor} />)}
          </div>
        </section>
      )}

      {accesorios.length > 0 && (
        <section className="border-t border-line py-10 sm:py-12">
          <h2 className="titulo-sec mb-6">Accesorios compatibles</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {accesorios.map((x) => <TarjetaUnidad key={x.ref} u={x} tc={tc.valor} />)}
          </div>
        </section>
      )}

      {similares.length > 0 && (
        <section className="border-t border-line py-10 pb-14 sm:py-12 sm:pb-20">
          <h2 className="titulo-sec mb-6">También te puede interesar</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {similares.map((x) => <TarjetaUnidad key={x.ref} u={x} tc={tc.valor} />)}
          </div>
        </section>
      )}
    </div>
  );
}
