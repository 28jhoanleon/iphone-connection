import type { Unidad } from "@/lib/tipos";
import { garantia } from "@/lib/formato";

/**
 * Elemento de firma de la marca (Doc 00).
 * Traduce visualmente "sabés exactamente qué estás comprando".
 */
export default function Readout({ u }: { u: Unidad }) {
  const celdas: [string, string][] = [
    ["BATERÍA", u.bateria ? `${u.bateria}%` : "—"],
    ["GRADO", u.estado === "nuevo_sellado" ? "NUEVO" : u.estado.slice(-1).toUpperCase()],
    ["GARANTÍA", garantia(u).replace(" meses", "M")],
    ["REF", `#${u.ref}`],
  ];
  return (
    <dl className="mt-3 flex border-t border-line font-data text-[11px] tracking-[.04em]">
      {celdas.map(([k, v], i) => (
        <div key={k} className={`flex-1 min-w-0 pt-2.5 pr-1.5 ${i < 3 ? "border-r border-line" : ""}`}>
          <dt className="text-[10.5px] text-mute mb-0.5">{k}</dt>
          <dd className="font-medium truncate">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
