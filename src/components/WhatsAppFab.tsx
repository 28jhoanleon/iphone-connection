import { linkWhatsApp } from "@/lib/formato";

export default function WhatsAppFab() {
  return (
    <a
      href={linkWhatsApp()}
      aria-label="Abrir conversación de WhatsApp con iPhone Connection"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 rounded-full bg-ink h-12 items-center px-5 text-sm inline-flex font-medium leading-none text-paper shadow-[0_6px_26px_rgba(0,0,0,.16)] transition hover:-translate-y-0.5 sm:bottom-5 sm:right-5"
    >
      WhatsApp
    </a>
  );
}
