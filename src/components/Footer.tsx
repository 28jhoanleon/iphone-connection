import Link from "next/link";
import { empresa, tiene } from "@/lib/empresa";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-line py-12 text-sm text-mute">
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
              <li><Link href="/catalogo/iphone" className="hover:text-ink">iPhone</Link></li>
              <li><Link href="/catalogo/apple-watch" className="hover:text-ink">Apple Watch</Link></li>
              <li><Link href="/catalogo/accesorios" className="hover:text-ink">Accesorios</Link></li>
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
          <span>© 2026 iPhone Connection</span>
          <span>V1 · Next.js</span>
        </div>
      </div>
    </footer>
  );
}
