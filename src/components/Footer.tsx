import Link from "next/link";
import { empresa, tiene } from "@/lib/empresa";
import { tipoCambio, fechaLegible } from "@/lib/dolar";
import { familiasVisibles } from "@/lib/catalogo";

export default async function Footer() {
  const tc = await tipoCambio();
  const fams = familiasVisibles().slice(0, 5);
  return (
    <footer className="mt-12 border-t border-line py-10 sm:mt-16 sm:py-12 text-sm text-mute">
      <div className="mx-auto max-w-site px-5">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <p className="mb-3 text-[17px] font-bold tracking-[-.03em] text-ink">
              iPhone<span className="font-medium text-mute">Connection</span>
            </p>
            <p className="max-w-[34ch]">Tecnología revisada, documentada y con garantía escrita.</p>
          </div>
          <div>
            <h5 className="mb-3 text-[13px] font-semibold text-ink">Catálogo</h5>
            <ul className="space-y-2">
              {fams.map((f) => (
                <li key={f.slug}>
                  <Link href={`/catalogo/${f.slug}`} className="hover:text-ink">{f.nombre}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="mb-3 text-[13px] font-semibold text-ink">Empresa</h5>
            <ul className="space-y-2">
              <li><Link href="/nosotros" className="hover:text-ink">Nosotros</Link></li>
              <li><Link href="/garantia" className="hover:text-ink">Garantía</Link></li>
              <li><Link href="/faq" className="hover:text-ink">Preguntas frecuentes</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="mb-3 text-[13px] font-semibold text-ink">Contacto</h5>
            <ul className="space-y-2">
              <li><Link href="/contacto" className="hover:text-ink">Contacto</Link></li>
              {tiene("instagram") && <li>{empresa.instagram}</li>}
              {tiene("horarios") && <li>{empresa.horarios}</li>}
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap justify-between gap-3 border-t border-line pt-5 text-xs">
          <span className="whitespace-nowrap">© 2026 iPhone Connection</span>
          <span className="font-data text-[11px]">
            {tc.fuente === "api"
              ? `${tc.nombre} $${tc.valor} · actualizado ${fechaLegible(tc)}`
              : "Cotización de respaldo · precios sujetos a confirmación"}
          </span>
        </div>
      </div>
    </footer>
  );
}
