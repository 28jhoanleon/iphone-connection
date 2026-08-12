import PanelProductos from "@/components/admin/PanelProductos";
import { todasLasUnidades } from "@/lib/catalogo";

export const metadata = { title: "Productos", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function Productos() {
  const unidades = todasLasUnidades();
  return (
    <div className="contenedor py-10">
      <p className="etiqueta mb-3">Panel interno</p>
      <h1 className="mb-1 text-3xl font-semibold tracking-[-.03em]">Productos</h1>
      <p className="mb-8 text-sm text-mute">{unidades.length} unidades publicadas</p>
      <PanelProductos inicial={unidades} />
    </div>
  );
}
