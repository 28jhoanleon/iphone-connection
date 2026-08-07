import Link from "next/link";

export function Metrica({
  valor, etiqueta, detalle,
}: { valor: string | number; etiqueta: string; detalle?: string }) {
  return (
    <div className="rounded-lg border border-line p-4">
      <p className="text-[28px] font-semibold leading-none tracking-[-.03em]">{valor}</p>
      <p className="mt-1.5 text-[13.5px] text-mute">{etiqueta}</p>
      {detalle && (
        <p className="mt-1 font-data text-[10px] tracking-[.08em] text-mute-soft">{detalle}</p>
      )}
    </div>
  );
}

export function Accion({
  titulo, descripcion, href, comando,
}: { titulo: string; descripcion: string; href?: string; comando?: string }) {
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
        className="block rounded-lg border border-line p-5 transition hover:-translate-y-0.5 hover:border-ink"
      >
        {contenido}
      </Link>
    );
  }
  return <div className="rounded-lg border border-line p-5">{contenido}</div>;
}
