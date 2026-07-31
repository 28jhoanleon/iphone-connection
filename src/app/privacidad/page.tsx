export const metadata = {
  title: "Política de privacidad — iPhone Connection",
  description: "Qué datos recibimos, para qué los usamos y qué no hacemos con ellos.",
};

export default function Privacidad() {
  return (
    <div className="contenedor max-w-[720px] py-10 sm:py-16">
      <p className="etiqueta mb-5">Legales</p>
      <h1 className="text-balance text-[clamp(28px,7.6vw,46px)] font-semibold leading-[1.04] tracking-[-.04em]">
        Política de privacidad
      </h1>

      <h2 className="mb-3 mt-10 text-[19px] font-semibold sm:text-xl">Qué datos recibimos</h2>
      <p className="leading-relaxed text-mute">
        Este sitio no tiene registro de usuarios, carrito ni pasarela de pago. No pedimos datos
        personales para navegar el catálogo. Los únicos datos que recibimos son los que nos
        escribís voluntariamente por WhatsApp o Instagram para hacer una consulta.
      </p>

      <h2 className="mb-3 mt-10 text-[19px] font-semibold sm:text-xl">Para qué los usamos</h2>
      <p className="leading-relaxed text-mute">
        Únicamente para responder tu consulta, coordinar una compra y dar soporte posventa sobre
        el equipo que te vendimos.
      </p>

      <h2 className="mb-3 mt-10 text-[19px] font-semibold sm:text-xl">Qué no hacemos</h2>
      <ul className="space-y-2 text-mute">
        <li>· No vendemos ni cedemos tus datos a terceros.</li>
        <li>· No te agregamos a listas de difusión sin que lo pidas.</li>
        <li>· No hacemos seguimiento insistente ni llamadas comerciales.</li>
      </ul>

      <h2 className="mb-3 mt-10 text-[19px] font-semibold sm:text-xl">Cookies y medición</h2>
      <p className="leading-relaxed text-mute">
        El sitio no usa cookies de publicidad ni de seguimiento entre sitios. Si en el futuro
        incorporamos medición de tráfico, va a ser anónima y se va a informar acá.
      </p>

      <h2 className="mb-3 mt-10 text-[19px] font-semibold sm:text-xl">Tus derechos</h2>
      <p className="leading-relaxed text-mute">
        Podés pedirnos que borremos tu conversación y cualquier dato asociado escribiéndonos por
        el mismo canal por el que nos contactaste. Ley 25.326 de Protección de Datos Personales.
      </p>

      <p className="mt-12 rounded-md border border-line p-5 text-[13.5px] text-mute">
        Documento pendiente de revisión legal. Si incorporamos envíos, pagos electrónicos o
        medición de tráfico, esta política se actualiza antes de activarlos.
      </p>
    </div>
  );
}
