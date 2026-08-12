import { todasLasUnidades } from "@/lib/catalogo";
import { rutaImagen } from "@/lib/imagenes";
import { precio, precioARS } from "@/lib/formato";
import { tipoCambio } from "@/lib/dolar";
import RevisarCatalogo from "@/components/admin/RevisarCatalogo";

export const metadata = { title: "Revisar", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Productos que no cumplen el patrón de publicación.
 *
 * El catálogo lo escribe el proveedor y su calidad es despareja. Acá se ve qué
 * le falta a cada uno y se corrige, en vez de arrastrar esa inconsistencia al
 * sitio sin darse cuenta.
 */
export default async function Revisar() {
  const tc = await tipoCambio();
  const unidades = todasLasUnidades();

  const items = unidades.map((u) => ({
    ref: u.ref,
    nombre: u.nombre,
    modelo: u.modelo,
    marca: u.marca,
    categoria: u.categoria,
    color: u.color ?? "",
    bateria: u.bateria,
    estado: u.estadoEtiqueta,
    calidad: (u as { calidad?: string }).calidad ?? "completo",
    faltantes: (u as { faltantes?: string[] }).faltantes ?? [],
    precio: precio(precioARS(u, tc.valor)),
    imagen: rutaImagen(u.ref),
  }));

  return (
    <div className="contenedor py-8">
      <p className="etiqueta mb-2">Panel interno</p>
      <h1 className="text-[clamp(26px,6vw,36px)] font-semibold tracking-[-.035em]">
        Revisar catálogo
      </h1>
      <p className="mt-2 max-w-[56ch] text-[14.5px] leading-relaxed text-mute">
        Productos a los que les falta algún dato del patrón de publicación. Escribí
        la corrección y se guarda en la hoja de correcciones: queda aplicada aunque
        el proveedor vuelva a mandarlo incompleto.
      </p>

      <RevisarCatalogo items={items} />
    </div>
  );
}
