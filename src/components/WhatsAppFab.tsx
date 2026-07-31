import { linkWhatsApp } from "@/lib/formato";

export default function WhatsAppFab() {
  return (
    <a
      href={linkWhatsApp()}
      className="fixed bottom-4 right-4 z-30 rounded-full bg-ink h-12 items-center px-5 text-sm inline-flex font-medium leading-none text-paper shadow-[0_6px_26px_rgba(0,0,0,.16)] transition hover:-translate-y-0.5 sm:bottom-5 sm:right-5"
    >
      WhatsApp
    </a>
  );
}
