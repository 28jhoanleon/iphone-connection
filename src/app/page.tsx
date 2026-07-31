import Link from "next/link";
import { familias, destacadas, fechaActualizacion, todasLasUnidades } from "@/lib/catalogo";
import { rutaImagen } from "@/lib/imagenes";
import { precio, precioARS, linkWhatsApp } from "@/lib/formato";
import { tipoCambio } from "@/lib/dolar";
import Readout from "@/components/Readout";

export default async function Home() {
  const tc = await tipoCambio();
  const fams = familias();
  const dest = destacadas(4);
  const total = todasLasUnidades().length;

  return (
    <>
      {/* HERO */}
      <section className="border-b border-line">
        <div className="contenedor py-20 md:py-24">
          <p className="etiqueta mb-7">
            {total} unidades · precios actualizados {fechaActualizacion()}
          </p>
          <h1 className="max-w-[15ch] text-[clamp(36px,7vw,78px)] font-semibold leading-[.96] tracking-tightest">
            Sabés exactamente qué estás comprando.
          </h1>
          <p className="mt-6 max-w-[44ch] text-[clamp(16px,2vw,20px)] text-mute">
            Cada equipo revisado, documentado y con garantía escrita. Estado real, salud de
            batería real, precio actualizado.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/catalogo/iphone" className="btn-solido">Ver catálogo</Link>
            <Link href="/garantia" className="btn-linea">Cómo funciona la garantía</Link>
          </div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section className="contenedor">
        <div className="grid border-b border-line md:grid-cols-3">
          {[
            ["Revisión técnica", "Cada equipo se prueba antes de publicarse. Lo que no pasa la revisión, no entra al catálogo."],
            ["Garantía escrita", "Condiciones claras, por escrito, desde el día de la compra. Sin letra chica ni interpretaciones."],
            ["Asesoramiento", "Te decimos qué equipo te conviene, incluso cuando no es el más caro que tenemos."],
          ].map(([t, d], i) => (
            <div key={t} className={`py-11 md:pr-8 ${i > 0 ? "md:border-l md:border-line md:pl-8" : ""} ${i < 2 ? "border-b border-line md:border-b-0" : ""}`}>
              <h3 className="mb-2.5 text-[17px] font-semibold">{t}</h3>
              <p className="text-[14.5px] text-mute">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORÍAS */}
      <section className="contenedor py-16">
        <h2 className="mb-7 text-[clamp(24px,3.4vw,34px)] font-semibold tracking-[-.035em]">Explorar por categoría</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {fams.map((f) => (
            <Link key={f.slug} href={`/catalogo/${f.slug}`} className="tarjeta flex items-center gap-4 p-5">
              {f.modelos[0] && (
                <img src={rutaImagen(f.modelos[0].unidades[0].ref)} alt="" width={76} height={76}
                     className="h-[76px] w-[76px] flex-none rounded-md bg-surface object-contain" />
              )}
              <div>
                <h3 className="text-lg font-semibold tracking-[-.02em]">{f.nombre}</h3>
                <p className="mt-0.5 font-data text-[12px] tracking-[.04em] text-mute">
                  {f.totalUnidades} UNIDADES · {f.modelos.length} MODELOS
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* DESTACADOS */}
      <section className="contenedor pb-16">
        <div className="mb-7 flex items-baseline justify-between gap-4">
          <h2 className="text-[clamp(24px,3.4vw,34px)] font-semibold tracking-[-.035em]">Destacados</h2>
          <Link href="/catalogo/iphone" className="border-b border-line pb-0.5 text-sm text-mute hover:border-ink hover:text-ink">
            Ver todo el catálogo
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {dest.map((u) => (
            <Link key={u.ref} href={`/unidad/${u.ref}`} className="group">
              <div className="mb-3.5 aspect-square overflow-hidden rounded-md bg-surface">
                <img src={rutaImagen(u.ref)} alt={u.nombre} className="h-full w-full object-contain transition group-hover:scale-[1.03]" />
              </div>
              <h4 className="text-[15px] font-semibold tracking-[-.01em]">{u.nombre}</h4>
              <p className="mb-2.5 text-[13px] text-mute">{u.estadoEtiqueta}</p>
              <p className="text-[19px] font-semibold tracking-[-.02em]">{precio(precioARS(u, tc.valor))}</p>
              <Readout u={u} />
            </Link>
          ))}
        </div>
      </section>

      {/* CÓMO TRABAJAMOS */}
      <section className="bg-ink text-paper">
        <div className="contenedor py-20">
          <p className="etiqueta mb-6 text-[#6E6E6E]">Cómo trabajamos</p>
          <h2 className="max-w-[20ch] text-[clamp(26px,4vw,44px)] font-semibold leading-[1.08] tracking-[-.04em]">
            No vendemos todo lo que se puede vender.
          </h2>
          <p className="mt-6 max-w-[52ch] text-[16.5px] text-[#9E9E9E]">
            Un equipo entra al catálogo solo si podemos asesorarte sobre él, respaldarlo con
            garantía y fotografiarlo nosotros mismos. Por eso vas a ver menos opciones que en
            otros lados, y por eso podemos responder por todas.
          </p>
          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {[
              ["01", "Seleccionamos", "Elegimos unidad por unidad. Si no la compraríamos nosotros, no entra."],
              ["02", "Revisamos", "Batería, pantalla, cámaras y funciones principales, una por una."],
              ["03", "Documentamos", "Publicamos el estado real, incluso cuando no nos conviene."],
              ["04", "Acompañamos", "Garantía escrita y alguien que responde después de la venta."],
            ].map(([n, t, d]) => (
              <div key={n}>
                <p className="mb-2 font-data text-[11px] tracking-[.14em] text-[#6E6E6E]">{n}</p>
                <h3 className="mb-1.5 text-[16px] font-semibold">{t}</h3>
                <p className="text-[14px] text-[#9E9E9E]">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GARANTÍA */}
      <section className="contenedor py-16">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <p className="etiqueta mb-5">Garantía</p>
            <h2 className="text-[clamp(24px,3.4vw,34px)] font-semibold tracking-[-.035em]">
              Por escrito, desde el día uno.
            </h2>
            <p className="mt-5 max-w-[46ch] text-mute">
              Todos los equipos seleccionados incluyen 6 meses de garantía. Los nuevos sellados,
              12 meses. Las condiciones se entregan por escrito con la compra, no se interpretan
              después.
            </p>
          </div>
          <div className="rounded-lg border border-line p-6">
            <h4 className="etiqueta mb-4">Qué cubre</h4>
            {[
              ["Fallas de funcionamiento", "SÍ"],
              ["Batería por debajo de lo declarado", "SÍ"],
              ["Daño por golpe o líquido", "NO"],
              ["Detalles declarados en la ficha", "NO"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-line py-2.5 text-sm last:border-0">
                <span className="text-mute">{k}</span>
                <b className="font-data text-[12.5px] font-medium">{v}</b>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OPINIONES */}
      <section className="contenedor pb-16">
        <p className="etiqueta mb-5">Opiniones</p>
        <div className="rounded-lg border border-dashed border-line p-8 text-center">
          <p className="text-mute">
            Todavía no publicamos opiniones. Cuando tengamos reseñas verificadas de clientes
            reales, van a estar acá — con nombre y fecha, no inventadas.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="contenedor pb-20">
        <div className="rounded-lg bg-surface px-8 py-14 text-center">
          <h2 className="mx-auto max-w-[18ch] text-[clamp(24px,3.4vw,36px)] font-semibold leading-[1.1] tracking-[-.035em]">
            ¿No sabés cuál te conviene?
          </h2>
          <p className="mx-auto mt-4 max-w-[44ch] text-mute">
            Contanos qué uso le vas a dar y te recomendamos el equipo correcto. Sin compromiso.
          </p>
          <a href={linkWhatsApp()} className="btn-solido mt-8">Consultar por WhatsApp</a>
        </div>
      </section>
    </>
  );
}
