import { empresa, tiene } from "@/lib/empresa";
import { linkWhatsApp } from "@/lib/formato";
import PendienteDato from "@/components/PendienteDato";

export const metadata = {
  title: "Contacto — iPhone Connection",
  description: "Escribinos por WhatsApp. Te asesoramos antes de comprar.",
};

export default function Contacto() {
  const filas: [string, string, boolean][] = [
    ["WhatsApp", empresa.whatsapp, tiene("whatsapp")],
    ["Instagram", empresa.instagram, tiene("instagram")],
    ["Zona", empresa.zona, tiene("zona")],
    ["Horarios", empresa.horarios, tiene("horarios")],
    ["Email", empresa.email, tiene("email")],
  ];

  return (
    <div className="contenedor max-w-[760px] py-10 sm:py-16">
      <p className="etiqueta mb-5">Contacto</p>
      <h1 className="text-balance text-[clamp(27px,7vw,50px)] font-semibold leading-[1.06] tracking-[-.03em] sm:leading-[1.02]">
        Escribinos antes de comprar.
      </h1>
      <p className="mt-6 max-w-[48ch] text-[17px] text-mute">
        No hace falta que sepas qué equipo querés. Contanos para qué lo vas a usar y cuánto
        pensabas gastar, y te decimos cuál te conviene. Aunque no sea el más caro que tenemos.
      </p>

      <div className="mt-8 rounded-lg border border-line p-5 sm:p-6">
        {filas.map(([k, v, ok]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-line py-3 text-sm last:border-0">
            <span className="text-mute">{k}</span>
            {ok ? (
              <b className="text-right font-data text-[12.5px] font-medium">{v}</b>
            ) : (
              <span className="font-data text-[11px] text-mute">PENDIENTE</span>
            )}
          </div>
        ))}
      </div>

      {tiene("whatsapp") ? (
        <a href={linkWhatsApp()} className="btn-solido mt-8 w-full text-center">
          Consultar por WhatsApp
        </a>
      ) : (
        <PendienteDato
          campo="whatsapp"
          nota="Número comercial propio. Hasta cargarlo, los botones de WhatsApp del sitio no enlazan a ningún lado"
        />
      )}

      <h2 className="mt-10 mb-3 text-2xl font-semibold tracking-[-.02em]">Qué te vamos a preguntar</h2>
      <ul className="space-y-2 text-mute">
        <li>· Para qué usás el equipo: fotos, trabajo, juegos, uso básico.</li>
        <li>· Si venís de Android o de iPhone.</li>
        <li>· Si querés entregar tu equipo actual en parte de pago.</li>
        <li>· Cuánto pensabas invertir.</li>
      </ul>
      <p className="mt-6 text-mute">
        Con eso alcanza para recomendarte bien. No hacemos seguimiento insistente ni llamadas:
        si necesitás tiempo para pensarlo, tomátelo.
      </p>
    </div>
  );
}
