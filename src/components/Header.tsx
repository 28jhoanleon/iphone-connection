import Link from "next/link";
import Buscador from "./Buscador";
import { linkWhatsApp } from "@/lib/formato";

export default function Header() {

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-lg">
      <div className="mx-auto max-w-site px-4 sm:px-5">
        {/* fila 1: marca, navegación y contacto, todo centrado verticalmente */}
        <div className="flex h-14 items-center justify-between gap-2 sm:h-16 sm:gap-4">
          <Link
            href="/"
            aria-label="iPhone Connection · ir al inicio"
            className="min-w-0 shrink text-[15.5px] font-bold leading-none tracking-[-.03em] xs:text-[17px]"
          >
            iPhone<span className="font-medium text-mute">Connection</span>
          </Link>

          <nav aria-label="Principal" className="hidden items-center gap-6 text-[13.5px] leading-none text-mute lg:flex">
            <Link href="/nosotros" className="hover:text-ink">Nosotros</Link>
            <Link href="/garantia" className="hover:text-ink">Garantía</Link>
            <Link href="/faq" className="hover:text-ink">FAQ</Link>
            <Link href="/contacto" className="hover:text-ink">Contacto</Link>
          </nav>

          {/* en escritorio el buscador vive en esta fila */}
          <div className="hidden flex-1 justify-end sm:flex sm:max-w-[300px]">
            <Buscador />
          </div>

          <a
            href={linkWhatsApp()}
            className="shrink-0 whitespace-nowrap rounded-full border border-ink px-4 py-2.5 text-[13.5px] font-medium leading-none transition hover:bg-ink hover:text-paper"
          >
            WhatsApp
          </a>
        </div>

        {/* fila 2: en móvil el buscador ocupa el ancho completo */}
        <div className="pb-3 sm:hidden">
          <Buscador />
        </div>
      </div>
    </header>
  );
}
