import { empresa, hayPagos } from "@/lib/empresa";
import { IconoEfectivo, IconoTransferencia, IconoCripto, IconoDolar } from "./Iconos";

const ICONO: Record<string, React.ReactNode> = {
  Efectivo: <IconoEfectivo />,
  Dólares: <IconoDolar />,
  Transferencia: <IconoTransferencia />,
  Criptomonedas: <IconoCripto />,
};

/**
 * Medios de pago aceptados.
 *
 * Se muestran como fila de íconos con su nombre en vez de una lista de texto:
 * el cliente los reconoce sin leer, y la ausencia de este dato es una de las
 * fricciones más caras en una compra de este monto.
 */
export default function MediosPago({ compacto = false }: { compacto?: boolean }) {
  if (!hayPagos()) return null;
  const medios = empresa.pagos.medios;

  if (compacto) {
    return (
      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {medios.map((m) => (
          <li key={m} className="flex items-center gap-1.5 text-[13.5px] text-mute">
            <span className="shrink-0 text-ink" aria-hidden="true">{ICONO[m]}</span>
            {m}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {medios.map((m) => (
          <li
            key={m}
            className="flex flex-col items-center gap-2 rounded-lg border border-line px-3 py-4 text-center"
          >
            <span className="text-ink" aria-hidden="true">{ICONO[m]}</span>
            <span className="text-[13px] font-medium leading-tight">{m}</span>
          </li>
        ))}
      </ul>
      {empresa.pagos.nota && (
        <p className="mt-3 text-[13px] text-mute">{empresa.pagos.nota}</p>
      )}
    </div>
  );
}
