import fs from "node:fs";
import PanelCambios, { type Pendientes } from "@/components/admin/PanelCambios";
import BotonSincronizar from "@/components/admin/BotonSincronizar";

export const metadata = { title: "Sincronización" };
export const dynamic = "force-dynamic";

function leer(): Pendientes | null {
  try {
    return JSON.parse(fs.readFileSync("data/cambios-pendientes.json", "utf8"));
  } catch {
    return null;
  }
}

/**
 * Revisión de los cambios de la planilla antes de publicarlos.
 *
 * La planilla es del proveedor: sus errores llegarían al sitio en minutos si se
 * leyera en vivo. Acá se ve qué cambió, con foto y variación, y recién después
 * se aplica.
 */
export default function Sincronizar() {
  const p = leer();
  const local = process.env.VERCEL !== "1";

  return (
    <div className="contenedor max-w-[880px] py-8">
      <h1 className="text-[clamp(24px,5.5vw,32px)] font-semibold tracking-[-.035em]">
        Cambios de la planilla
      </h1>
      {p && (
        <p className="mt-1 font-data text-[11px] tracking-[.06em] text-mute-soft">
          ÚLTIMA LECTURA {p.fecha.replace("T", " · ")} — {p.filas} FILAS
        </p>
      )}

      <div className="mt-6">
        <BotonSincronizar local={local} />
      </div>

      {!p ? (
        <div className="mt-6 rounded-lg border border-line p-6">
          <p className="text-[14px] text-mute">
            Todavía no se leyó la planilla. Usá el botón de arriba.
          </p>
        </div>
      ) : (
        <PanelCambios p={p} />
      )}
    </div>
  );
}
