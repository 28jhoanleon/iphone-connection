import Link from "next/link";
import { linkWhatsApp } from "@/lib/formato";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-lg">
      <div className="mx-auto flex h-[60px] max-w-site items-center justify-between px-5">
        <Link href="/" className="text-[17px] font-bold tracking-[-.03em]">
          iPhone<span className="font-medium text-mute">Connection</span>
        </Link>
        <a
          href={linkWhatsApp()}
          className="whitespace-nowrap rounded-full border border-ink px-4 py-2 text-[13px] transition hover:bg-ink hover:text-paper"
        >
          Consultar por WhatsApp
        </a>
      </div>
    </header>
  );
}
