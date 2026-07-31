import PanelProductos from "@/components/admin/PanelProductos";
import { todasLasUnidades } from "@/lib/catalogo";
import { fotografiasPropias } from "@/lib/imagenes";

export const metadata = { title: "Panel — iPhone Connection", robots: { index: false } };

export default function Admin() {
  const unidades = todasLasUnidades();
  return (
    <div className="contenedor py-10">
      <p className="etiqueta mb-3">Panel interno</p>
      <h1 className="mb-1 text-3xl font-semibold tracking-[-.035em]">Productos</h1>
      <p className="mb-8 text-sm text-mute">
        {unidades.length} unidades publicadas · {fotografiasPropias()} con fotografía propia
      </p>
      <PanelProductos inicial={unidades} />
    </div>
  );
}
