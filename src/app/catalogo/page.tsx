import { todasLasUnidades, familiasVisibles, marcasPrincipales, esUltimasUnidades } from "@/lib/catalogo";
import { precioARS } from "@/lib/formato";
import { rutaImagen } from "@/lib/imagenes";
import { tipoCambio } from "@/lib/dolar";
import { SITIO } from "@/lib/seo";
import ExplorarCatalogo from "@/components/ExplorarCatalogo";

export const metadata = {
  title: "Catálogo completo — iPhone Connection",
  description:
    "Todos los equipos disponibles con estado, salud de batería y precio actualizado. Filtrá por marca, categoría, estado y precio.",
  alternates: { canonical: `${SITIO}/catalogo` },
};

/**
 * Vista de catálogo completo con filtros combinables.
 *
 * Convive con la navegación por familia, no la reemplaza: son dos formas de
 * llegar al mismo lugar. El que ya sabe qué busca filtra; el que explora navega
 * por categoría y modelo. Quitar una de las dos deja afuera a la mitad.
 */
export default async function Catalogo() {
  const tc = await tipoCambio();

  const items = todasLasUnidades().map((u) => ({
    ref: u.ref,
    nombre: u.nombre,
    modelo: u.modelo,
    marca: u.marca,
    categoria: u.categoria,
    estado: u.estado,
    estadoEtiqueta: u.estadoEtiqueta,
    bateria: u.bateria,
    disponibilidad: u.disponibilidad,
    defecto: u.defecto,
    precio: precioARS(u, tc.valor),
    imagen: rutaImagen(u.ref),
    ultimas: esUltimasUnidades(u),
    capacidadGb: u.capacidadGb,
  }));

  return (
    <div className="contenedor">
      <div className="py-8 sm:py-10">
        <p className="etiqueta mb-3">Catálogo completo</p>
        <h1 className="text-[clamp(28px,6.6vw,44px)] font-semibold leading-[1.06] tracking-[-.04em]">
          Todos los equipos
        </h1>
        <p className="mt-3 max-w-[46ch] text-[15.5px] text-mute">
          Filtrá por marca, categoría, estado o precio. Cada equipo con su estado y su
          salud de batería declarados. Precios de referencia, sujetos a confirmación
          al momento de la compra.
        </p>
      </div>

      <ExplorarCatalogo
        items={items}
        categorias={familiasVisibles().map((f) => f.nombre)}
        marcas={marcasPrincipales(2)}
      />
    </div>
  );
}
