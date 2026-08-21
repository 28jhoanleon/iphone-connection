/**
 * Permisos.  src/app/admin/permisos/page.tsx
 *
 * Sólo tiene sentido para la cuenta principal: el middleware ya bloquea a la
 * secundaria antes de llegar acá, así que no hace falta comprobarlo de nuevo.
 */
import EditarPermisos from "@/components/admin/EditarPermisos";
import permisos from "../../../../data/permisos.json";

export const dynamic = "force-dynamic";

export default function Permisos() {
  return (
    <div className="contenedor max-w-[720px] py-8">
      <p className="etiqueta mb-2">Panel interno</p>
      <h1 className="mb-3 text-[clamp(26px,6vw,36px)] font-semibold tracking-[-.035em]">
        Permisos
      </h1>
      <p className="max-w-[52ch] text-[15px] leading-[1.55] text-mute">
        Definí a qué secciones entra la segunda cuenta. Esto reduce la superficie de
        error, no reemplaza la confirmación de las acciones masivas ni el historial.
      </p>

      <EditarPermisos
        inicial={permisos as Record<string, boolean>}
        usuario={process.env.PANEL_USUARIO || "la segunda cuenta"}
      />
    </div>
  );
}
