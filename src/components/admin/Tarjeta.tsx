import Link from "next/link";

/**
 * Bloques del panel interno.
 *
 * Métrica: un número que se lee de un vistazo. Con `alerta` se pinta en ámbar,
 * para separar lo que requiere atención de lo que es sólo información.
 *
 * Acción: una tarjeta que lleva a otra pantalla o muestra el comando a correr.
 */

export function Metrica({
  valor,
  etiqueta,
  detalle,
  alerta,
}: {
  valor: string | number;
  etiqueta: string;
  detalle?: string;
  alerta?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        alerta ? "border-aviso-linea bg-aviso-fondo" : "border-line"
      }`}
    >
      <p className="text-[28px] font-semibold leading-none tracking-[-.03em]">{valor}</p>
      <p className="mt-1.5 text-[13.5px] text-mute">{etiqueta}</p>
      {detalle && (
        <p
          className={`mt-1 font-data text-[10px] tracking-[.08em] ${
            alerta ? "text-aviso-texto" : "text-mute-soft"
          }`}
        >
          {detalle}
        </p>
      )}
    </div>
  );
}

export function Accion({
  titulo,
  descripcion,
  href,
  comando,
  alerta,
}: {
  titulo: string;
  descripcion: string;
  href?: string;
  comando?: string;
  alerta?: boolean;
}) {
  const borde = alerta ? "border-aviso-linea bg-aviso-fondo" : "border-line";

  const contenido = (
    <>
      <h3 className="text-[15px] font-semibold tracking-[-.01em]">{titulo}</h3>
      <p className="mt-1 text-[13.5px] leading-relaxed text-mute">{descripcion}</p>
      {comando && (
        <pre className="mt-3 overflow-x-auto rounded-md bg-surface p-3 font-data text-[12px] leading-relaxed">
          {comando}
        </pre>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`block rounded-lg border p-5 transition hover:-translate-y-0.5 hover:border-ink ${borde}`}
      >
        {contenido}
      </Link>
    );
  }

  return <div className={`rounded-lg border p-5 ${borde}`}>{contenido}</div>;
}
