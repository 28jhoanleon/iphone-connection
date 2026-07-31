import type { Unidad } from "@/lib/tipos";

/**
 * Etiqueta de disponibilidad. Misma línea gráfica para los cuatro estados:
 * mismo alto, misma tipografía, mismo tracking. Cambia el peso visual, no la forma.
 *
 * - Stock inmediato : sólido negro. Es el estado que más queremos que se elija.
 * - Últimas unidades: contorno con punto. Urgencia real, nunca inventada:
 *   sólo aparece cuando quedan 1 o 2 unidades de ese modelo.
 * - Por encargo     : contorno suave.
 * - Avisame         : contorno punteado.
 */
export default function EtiquetaEstado({
  unidad,
  ultimas = false,
}: {
  unidad: Unidad;
  ultimas?: boolean;
}) {
  const base =
    "inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 font-data text-[10.5px] uppercase leading-none tracking-[.1em]";

  if (unidad.disponibilidad === "disponible") {
    return <span className={`${base} bg-ink text-paper`}>Stock inmediato</span>;
  }
  if (unidad.disponibilidad === "sin_stock") {
    return (
      <span className={`${base} border border-dashed border-line text-mute`}>
        Avisame
      </span>
    );
  }
  if (ultimas) {
    return (
      <span className={`${base} border border-ink bg-paper text-ink`}>
        <span className="h-1.5 w-1.5 rounded-full bg-ink" aria-hidden="true" />
        Últimas unidades
      </span>
    );
  }
  return (
    <span className={`${base} border border-line bg-paper text-mute`}>
      Por encargo
    </span>
  );
}
