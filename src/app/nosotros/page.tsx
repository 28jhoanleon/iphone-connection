import { empresa, tiene } from "@/lib/empresa";
import { todasLasUnidades } from "@/lib/catalogo";
import PendienteDato from "@/components/PendienteDato";

export const metadata = {
  title: "Nosotros — iPhone Connection",
  description: "Quiénes somos y por qué existe iPhone Connection.",
};

export default function Nosotros() {
  const total = todasLasUnidades().length;

  return (
    <div className="contenedor max-w-[760px] py-10 sm:py-16">
      <p className="etiqueta mb-5">Nosotros</p>
      <h1 className="text-balance text-[clamp(27px,7vw,50px)] font-semibold leading-[1.06] tracking-[-.035em] sm:leading-[1.02]">
        Dos hermanos vendiendo tecnología con confianza.
      </h1>

      <p className="mt-6 text-[16.5px] leading-relaxed text-mute">
        iPhone Connection nació vendiendo iPhone y ese sigue siendo su corazón. Hoy es una
        empresa de tecnología que aplica el mismo estándar a todo lo que vende. El nombre no
        describe el catálogo: describe el nivel de exigencia con el que empezamos.
      </p>

      <h2 className="mt-10 mb-4 text-2xl font-semibold tracking-[-.025em]">Por qué existimos</h2>
      <p className="text-mute">
        Comprar un usado en Argentina suele ser una apuesta. No sabés de dónde viene el equipo,
        nadie te dice cuánta batería le queda, no hay comprobante y, cuando aparece un problema,
        no hay a quién escribirle. Esa es la compra a ciegas, y es exactamente lo que no queremos
        que le pase a nuestros clientes.
      </p>
      <p className="mt-4 text-mute">
        Por eso publicamos el estado real de cada equipo, incluso cuando no nos conviene. Si una
        unidad tiene un detalle en la tapa o la batería al 78%, está escrito en la ficha antes de
        que preguntes.
      </p>

      <h2 className="mt-10 mb-4 text-2xl font-semibold tracking-[-.025em]">Cómo elegimos qué vender</h2>
      <p className="text-mute">
        Un equipo entra al catálogo solo si se cumplen cinco condiciones: que sepamos asesorarte
        sobre él, que podamos respaldarlo con garantía escrita, que podamos fotografiarlo
        nosotros mismos, que tenga sentido comercial y que no contradiga lo que prometemos. Nada
        entra solo por ser barato.
      </p>

      <h2 className="mt-10 mb-4 text-2xl font-semibold tracking-[-.025em]">Nuestra misión</h2>
      <p className="text-mute">
        Vender tecnología con confianza. Y nuestra meta a largo plazo es que iPhone Connection sea
        una de las marcas de referencia en Argentina para comprar productos Apple.
      </p>

      <div className="mt-14 grid gap-4 sm:grid-cols-3">
        {[
          [String(total), "unidades en catálogo"],
          ["100%", "con estado declarado"],
          ["6 a 12", "meses de garantía escrita"],
        ].map(([n, d]) => (
          <div key={d} className="rounded-lg border border-line p-5">
            <p className="text-3xl font-semibold tracking-[-.03em]">{n}</p>
            <p className="mt-1 text-[13.5px] text-mute">{d}</p>
          </div>
        ))}
      </div>

      {tiene("socios") ? (
        <p className="mt-12 text-mute">
          Detrás de la marca estamos {empresa.socios.join(" y ")}
          {tiene("zona") ? `, en ${empresa.zona}` : ""}.
        </p>
      ) : (
        <PendienteDato campo="socios" nota="Nombres de los dos socios y zona de operación" />
      )}
    </div>
  );
}
