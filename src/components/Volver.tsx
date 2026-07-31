"use client";

import { useRouter } from "next/navigation";

/**
 * Volver con historial real: si el usuario llegó navegando, retrocede;
 * si entró directo desde un link de WhatsApp o Google, va al nivel superior.
 */
export default function Volver({ href, texto = "Volver" }: { href: string; texto?: string }) {
  const router = useRouter();

  function atras() {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push(href);
  }

  return (
    <button
      onClick={atras}
      className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] text-mute transition hover:text-ink"
    >
      <span aria-hidden="true">←</span> {texto}
    </button>
  );
}
