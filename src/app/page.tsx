import Link from "next/link";
import { familiasVisibles, destacadas, fechaActualizacion, todasLasUnidades, esUltimasUnidades } from "@/lib/catalogo";
import { rutaImagen } from "@/lib/imagenes";
import { precio, precioARS, linkWhatsApp } from "@/lib/formato";
import { tipoCambio } from "@/lib/dolar";
import TarjetaUnidad from "@/components/TarjetaUnidad";
import { IconoRevision, IconoGarantia, IconoAsesoramiento } from "@/components/Iconos";
import Icono from "@/components/Icono";

export default async function Home() {
  const tc = await tipoCambio();
  const fams = familiasVisibles();
  const dest = destacadas(4);
  const total = todasLasUnidades().length;

  return (
    <>
      {/* HERO */}
      <section className="border-b border-line">
        <div className="contenedor pb-12 pt-8 sm:pb-20 sm:pt-16">
          <p className="etiqueta mb-4 sm:mb-6">
            {total} equipos · precios actualizados {fechaActualizacion()}
          </p>
          <h1 className="max-w-[16ch] text-balance text-[clamp(31px,8.6vw,74px)] font-semibold leading-[1.03] tracking-[-.04em]">
            Sabés exactamente qué estás comprando.
          </h1>
          <p className="mt-4 max-w-[46ch] text-[16.5px] leading-relaxed text-mute sm:mt-6 sm:text-[19px]">
            iPhone, Samsung, Xiaomi y más. Cada equipo revisado, con su estado y su
            salud de batería declarados antes de que preguntes.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 sm:mt-9">
            <Link href="/catalogo/iphone" className="btn-solido w-full sm:w-auto">
              Ver catálogo
            </Link>
            <Link href="/garantia" className="btn-texto">
              Cómo funciona la garantía <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section className="contenedor">
        <div className="grid border-b border-line sm:grid-cols-3">
          {[
            [<IconoRevision key="r" />, "Revisión técnica", "Cada equipo se prueba antes de publicarse. Lo que no pasa la revisión, no entra."],
            [<IconoGarantia key="g" />, "Garantía escrita", "Condiciones claras, por escrito, desde el día de la compra. Sin letra chica."],
            [<IconoAsesoramiento key="a" />, "Asesoramiento", "Te decimos qué equipo te conviene, incluso cuando no es el más caro."],
          ].map(([icono, t, d], i) => (
            <div
              key={t as string}
              className={`flex gap-3.5 py-6 sm:block sm:py-9 ${i > 0 ? "border-t border-line sm:border-l sm:border-t-0 sm:pl-7" : ""} ${i < 2 ? "sm:pr-7" : ""}`}
            >
              <span className="mt-0.5 shrink-0 text-ink sm:mb-3 sm:block">{icono}</span>
              <div>
                <h3 className="mb-1 text-[16.5px] font-semibold leading-tight sm:mb-1.5 sm:text-[17px]">{t as string}</h3>
                <p className="text-[14.5px] leading-relaxed text-mute sm:text-[14.5px]">{d as string}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORÍAS · con imagen representativa */}
      <section className="contenedor seccion">
        <h2 className="titulo-sec mb-6">Explorar por categoría</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {fams.map((f) => (
            <Link
              key={f.slug}
              href={`/catalogo/${f.slug}`}
              className="group flex flex-col rounded-lg border border-line bg-paper p-3 transition duration-200 hover:-translate-y-0.5 hover:border-ink sm:p-4"
            >
              <div className="mb-3 aspect-[4/3] overflow-hidden rounded-md bg-surface">
                <img
                  src={rutaImagen(f.modelos[0].unidades[0].ref)}
                  alt=""
                  width={600}
                  height={450}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.05]"
                />
              </div>
              <h3 className="text-[15px] font-semibold leading-tight tracking-[-.02em]">{f.nombre}</h3>
              <p className="mt-1 font-data text-[10.5px] tracking-[.06em] text-mute-soft">
                {f.totalUnidades} EQUIPOS
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* DESTACADOS · primero, para que el primer scroll ya muestre equipos */}
      <section className="contenedor pb-12 pt-10 sm:pb-16 sm:pt-14">
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <h2 className="titulo-sec">Destacados</h2>
          <Link href="/catalogo/iphone" className="btn-texto shrink-0">
            Ver todo <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {dest.map((u, i) => (
            <TarjetaUnidad key={u.ref} u={u} tc={tc.valor} ultimas={esUltimasUnidades(u)} prioridad={i < 2} />
          ))}
        </div>
      </section>

      {/* CÓMO TRABAJAMOS */}
      <section className="bg-ink text-paper">
        <div className="contenedor py-14 sm:py-20">
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
                <h3 className="mb-1.5 text-[16.5px] font-semibold">{t}</h3>
                <p className="text-[14.5px] text-[#9E9E9E]">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GARANTÍA */}
      <section className="contenedor py-12 sm:py-16">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <p className="etiqueta mb-5">Garantía</p>
            <h2 className="text-[clamp(22px,3.4vw,34px)] font-semibold tracking-[-.035em]">
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
      <section className="contenedor pb-12 sm:pb-16">
        <p className="etiqueta mb-5">Opiniones</p>
        <div className="rounded-lg border border-dashed border-line p-8 text-center">
          <p className="text-mute">
            Todavía no publicamos opiniones. Cuando tengamos reseñas verificadas de clientes
            reales, van a estar acá — con nombre y fecha, no inventadas.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="contenedor pb-16 sm:pb-20">
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
