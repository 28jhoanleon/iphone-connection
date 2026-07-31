import Link from "next/link";
import Buscador from "./Buscador";
import { indiceBusqueda } from "@/lib/catalogo";
import { tipoCambio } from "@/lib/dolar";
import { linkWhatsApp } from "@/lib/formato";

export default async function Header() {
  const tc = await tipoCambio();
  const indice = indiceBusqueda(tc.valor);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-lg">
      <div className="mx-auto flex max-w-site flex-wrap items-center justify-between gap-2 px-4 sm:gap-3 sm:px-5 py-2.5 sm:py-3">
        <Link href="/" className="text-[17px] font-bold tracking-[-.03em]">
          iPhone<span className="font-medium text-mute">Connection</span>
        </Link>

        <div className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1 sm:px-6">
          <Buscador indice={indice} />
        </div>

        <nav className="order-2 hidden gap-5 text-[13.5px] text-mute lg:flex">
          <Link href="/nosotros" className="hover:text-ink">Nosotros</Link>
          <Link href="/garantia" className="hover:text-ink">Garantía</Link>
          <Link href="/faq" className="hover:text-ink">FAQ</Link>
          <Link href="/contacto" className="hover:text-ink">Contacto</Link>
        </nav>

        <a
          href={linkWhatsApp()}
          className="order-2 whitespace-nowrap rounded-full border border-ink px-4 py-2 text-[13px] transition hover:bg-ink hover:text-paper sm:order-4"
        >
          WhatsApp
        </a>
      </div>
    </header>
  );
}
