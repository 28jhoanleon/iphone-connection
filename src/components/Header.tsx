import Link from "next/link";
import Buscador from "./Buscador";
import { indiceBusqueda } from "@/lib/catalogo";
import { tipoCambio } from "@/lib/dolar";
import { linkWhatsApp } from "@/lib/formato";

export default async function Header() {
  const tc = await tipoCambio();
  const indice = indiceBusqueda(tc.valor).slice(0, 40); // muestra inicial

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-lg">
      <div className="mx-auto max-w-site px-4 sm:px-5">
        {/* fila 1: marca, navegación y contacto, todo centrado verticalmente */}
        <div className="flex h-14 items-center justify-between gap-4 sm:h-16">
          <Link href="/" aria-label="iPhone Connection · ir al inicio" className="shrink-0 text-[17px] font-bold leading-none tracking-[-.03em]">
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
            <Buscador indice={indice} />
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
          <Buscador indice={indice} />
        </div>
      </div>
    </header>
  );
}
