import faq from "@/data/faq.json";
import { linkWhatsApp } from "@/lib/formato";

export const metadata = {
  title: "Preguntas frecuentes — iPhone Connection",
  description: "Estado, batería, garantía, permutas y entregas. Las respuestas concretas.",
};

/** Schema.org: hace que las respuestas puedan aparecer directo en Google. */
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((f) => ({
    "@type": "Question",
    name: f.p,
    acceptedAnswer: { "@type": "Answer", text: f.r },
  })),
};

export default function FAQ() {
  return (
    <div className="contenedor max-w-[760px] py-10 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="etiqueta mb-5">Preguntas frecuentes</p>
      <h1 className="text-balance text-[clamp(27px,7vw,50px)] font-semibold leading-[1.06] tracking-[-.035em] sm:leading-[1.02]">
        Lo que conviene saber antes de comprar.
      </h1>

      <div className="mt-12 border-t border-line">
        {faq.map((f) => (
          <details key={f.p} className="group border-b border-line py-5">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-6">
              <h2 className="text-[17px] font-medium tracking-[-.015em]">{f.p}</h2>
              <span className="mt-1 shrink-0 text-mute transition group-open:rotate-45" aria-hidden="true">+</span>
            </summary>
            <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-mute">{f.r}</p>
          </details>
        ))}
      </div>

      <div className="mt-12 rounded-lg bg-surface p-8 text-center">
        <h2 className="text-xl font-semibold tracking-[-.02em]">¿Tenés otra pregunta?</h2>
        <p className="mx-auto mt-2 max-w-[40ch] text-mute">
          Escribinos y te respondemos. Si la pregunta se repite, la sumamos a esta lista.
        </p>
        <a href={linkWhatsApp()} className="btn-solido mt-6">Consultar por WhatsApp</a>
      </div>
    </div>
  );
}
