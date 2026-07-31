import { linkWhatsApp } from "@/lib/formato";

export default function WhatsAppFab() {
  return (
    <a
      href={linkWhatsApp()}
      className="fixed bottom-5 right-5 z-50 rounded-full bg-ink px-5 py-3.5 text-sm font-medium text-paper shadow-[0_6px_26px_rgba(0,0,0,.16)] transition hover:-translate-y-0.5"
    >
      WhatsApp
    </a>
  );
}
