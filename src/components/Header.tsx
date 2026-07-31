import Link from "next/link";
import Buscador from "./Buscador";
import { indiceBusqueda } from "@/lib/catalogo";
import { linkWhatsApp } from "@/lib/formato";

export default function Header() {
  const indice = indiceBusqueda();

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-lg">
      <div className="mx-auto flex max-w-site flex-wrap items-center justify-between gap-3 px-5 py-3">
        <Link href="/" className="text-[17px] font-bold tracking-[-.03em]">
          iPhone<span className="font-medium text-mute">Connection</span>
        </Link>

        <div className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1 sm:px-6">
          <Buscador indice={indice} />
        </div>

        <a
          href={linkWhatsApp()}
          className="order-2 whitespace-nowrap rounded-full border border-ink px-4 py-2 text-[13px] transition hover:bg-ink hover:text-paper sm:order-3"
        >
          WhatsApp
        </a>
      </div>
    </header>
  );
}
