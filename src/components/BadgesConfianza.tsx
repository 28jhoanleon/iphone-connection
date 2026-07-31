import { IconoGarantia, IconoRevision, IconoEnvio } from "./Iconos";
import { hayEnvios, empresa } from "@/lib/empresa";

/**
 * Tres señales de confianza debajo del hero.
 * El badge de envíos sólo aparece si la empresa efectivamente hace envíos:
 * prometer cobertura nacional sin hacerla es exactamente lo que el Doc 00 prohíbe.
 */
export default function BadgesConfianza() {
  const items: [React.ReactNode, string, string][] = [
    [<IconoGarantia key="g" />, "Garantía escrita", "6 a 12 meses según el equipo"],
    [<IconoRevision key="r" />, "Equipos revisados", "Estado y batería declarados"],
  ];
  if (hayEnvios()) {
    items.push([<IconoEnvio key="e" />, "Envíos", empresa.envios.alcance]);
  }

  return (
    <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-3 sm:mt-9 sm:gap-x-9">
      {items.map(([icono, titulo, detalle]) => (
        <li key={titulo} className="flex items-center gap-2.5">
          <span className="shrink-0 text-ink" aria-hidden="true">{icono}</span>
          <span className="leading-tight">
            <span className="block text-[13.5px] font-semibold">{titulo}</span>
            <span className="block text-[12.5px] text-mute">{detalle}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
