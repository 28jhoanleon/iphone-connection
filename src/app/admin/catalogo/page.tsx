import { todasLasUnidades, familiasVisibles } from "@/lib/catalogo";
import { precio, precioARS } from "@/lib/formato";
import { tipoCambio } from "@/lib/dolar";
import { tipoImagen } from "@/lib/imagenes";
import { Metrica } from "@/components/admin/Tarjeta";

export const metadata = { title: "Catálogo", robots: { index: false } };

/** Estado del catálogo por categoría: dónde falta foto y dónde falta stock. */
export default async function CatalogoAdmin() {
  const tc = await tipoCambio();
  const unidades = todasLasUnidades();

  const filas = familiasVisibles().map((f) => {
    const us = unidades.filter((u) => u.categoria === f.nombre);
    const precios = us.map((u) => precioARS(u, tc.valor));
    return {
      nombre: f.nombre,
      total: us.length,
      conFoto: us.filter((u) => tipoImagen(u.ref) === "real").length,
      enStock: us.filter((u) => u.disponibilidad === "disponible").length,
      min: Math.min(...precios),
      max: Math.max(...precios),
    };
  });

  return (
    <div className="contenedor py-8">
      <p className="etiqueta mb-2">Panel interno</p>
      <h1 className="text-[clamp(26px,6vw,36px)] font-semibold tracking-[-.035em]">Catálogo</h1>

      <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metrica valor={unidades.length} etiqueta="Equipos" />
        <Metrica valor={filas.length} etiqueta="Categorías" />
        <Metrica
          valor={unidades.filter((u) => tipoImagen(u.ref) === "real").length}
          etiqueta="Con foto real"
        />
        <Metrica
          valor={unidades.filter((u) => u.defecto).length}
          etiqueta="Con detalle declarado"
        />
      </div>

      <div className="mt-8 overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[620px] text-[14px]">
          <thead className="bg-surface font-data text-[10.5px] uppercase tracking-[.1em] text-mute">
            <tr>
              {["Categoría", "Equipos", "Con foto", "En stock", "Rango de precio"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.nombre} className="border-t border-line">
                <td className="px-4 py-3 font-medium">{f.nombre}</td>
                <td className="px-4 py-3">{f.total}</td>
                <td className="px-4 py-3">
                  <span className={f.conFoto < f.total ? "text-aviso-texto" : ""}>
                    {f.conFoto}/{f.total}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={f.enStock === 0 ? "text-aviso-texto" : ""}>{f.enStock}</span>
                </td>
                <td className="px-4 py-3 font-data text-[12px] text-mute">
                  {precio(f.min)} — {precio(f.max)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-[13px] text-mute">
        Para ver las imágenes producto por producto, entrá a{" "}
        <a href="/auditoria" className="underline underline-offset-4 hover:text-ink">
          la grilla de auditoría
        </a>.
      </p>
    </div>
  );
}
