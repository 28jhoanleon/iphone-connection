import Link from "next/link";
import { empresa, tiene, hayEnvios, hayPagos } from "@/lib/empresa";
import { familiasVisibles } from "@/lib/catalogo";
import { tipoCambio, fechaLegible, MOSTRAR_COTIZACION } from "@/lib/dolar";
import { linkWhatsApp } from "@/lib/formato";
import MediosPago from "./MediosPago";

export default async function Footer() {
  const tc = await tipoCambio();
  const fams = familiasVisibles().slice(0, 6);

  return (
    <footer className="mt-12 border-t border-line pt-10 text-[13.5px] text-mute sm:mt-16 sm:pt-12">
      <div className="contenedor">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
          <div className="col-span-2 lg:col-span-1">
            <p className="mb-3 text-[17px] font-bold tracking-[-.03em] text-ink">
              iPhone<span className="font-medium text-mute">Connection</span>
            </p>
            <p className="max-w-[34ch] leading-relaxed">
              Tecnología revisada, documentada y con garantía escrita.
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-[13.5px] font-semibold text-ink">Catálogo</h2>
            <ul className="space-y-1">
              {fams.map((f) => (
                <li key={f.slug}>
                  <Link href={`/catalogo/${f.slug}`} className="inline-flex min-h-[44px] items-center transition-colors hover:text-ink">
                    {f.nombre}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-[13.5px] font-semibold text-ink">Empresa</h2>
            <ul className="space-y-1">
              <li><Link href="/nosotros" className="inline-flex min-h-[44px] items-center transition-colors hover:text-ink">Nosotros</Link></li>
              <li><Link href="/garantia" className="inline-flex min-h-[44px] items-center transition-colors hover:text-ink">Garantía</Link></li>
              <li><Link href="/faq" className="inline-flex min-h-[44px] items-center transition-colors hover:text-ink">Preguntas frecuentes</Link></li>
              <li><Link href="/privacidad" className="inline-flex min-h-[44px] items-center transition-colors hover:text-ink">Política de privacidad</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-[13.5px] font-semibold text-ink">Contacto</h2>
            <ul className="space-y-1">
              <li><Link href="/contacto" className="inline-flex min-h-[44px] items-center transition-colors hover:text-ink">Contacto</Link></li>
              {tiene("whatsapp") && (
                <li><a href={linkWhatsApp()} className="inline-flex min-h-[44px] items-center transition-colors hover:text-ink">WhatsApp</a></li>
              )}
              {tiene("instagram") && (
                <li>
                  <a
                    href={`https://instagram.com/${empresa.instagram.replace("@", "")}`}
                    className="inline-flex min-h-[44px] items-center transition-colors hover:text-ink"
                  >
                    {empresa.instagram}
                  </a>
                </li>
              )}
              {tiene("horarios") && <li>{empresa.horarios}</li>}
              {tiene("zona") && <li>{empresa.zona}</li>}
            </ul>
          </div>
        </div>

        {(hayPagos() || hayEnvios()) && (
          <div className="mt-10 grid gap-6 border-t border-line pt-8 sm:grid-cols-2">
            {hayPagos() && (
              <div>
                <h2 className="mb-2 text-[13.5px] font-semibold text-ink">Formas de pago</h2>
                <MediosPago compacto />
              </div>
            )}
            {hayEnvios() && (
              <div>
                <h2 className="mb-2 text-[13.5px] font-semibold text-ink">Envíos</h2>
                <p>{empresa.envios.alcance}</p>
                {empresa.envios.plazo && <p className="mt-1 text-[12.5px]">{empresa.envios.plazo}</p>}
              </div>
            )}
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line py-6 text-[12.5px]">
          <span>© {new Date().getFullYear()} iPhone Connection</span>
          <span className="font-data text-[11px] text-mute-soft">
            {tc.fuente === "api"
              ? `${tc.nombre} $${tc.valor} · ${fechaLegible(tc)}`
              : "Cotización de respaldo · precios sujetos a confirmación"}
          </span>
        </div>
      </div>
    </footer>
  );
}
