import { todasLasUnidades, familiasVisibles } from "@/lib/catalogo";
import { rutaImagen, tipoImagen } from "@/lib/imagenes";
import { precio, precioARS } from "@/lib/formato";
import { tipoCambio } from "@/lib/dolar";
import GrillaAuditoria from "@/components/GrillaAuditoria";
import { capacidad } from "@/lib/formato";

export const metadata = { title: "Imágenes", robots: { index: false } };

/**
 * Revisión visual del catálogo. Existe porque la validación automática detecta
 * texto, color equivocado y tamaño, pero no que la foto de un iPhone 14 muestre
 * en realidad un 14 Plus. Eso sólo lo ve una persona mirando todo junto.
 */
export default async function Imagenes() {
  const tc = await tipoCambio();
  const unidades = todasLasUnidades();

  const items = unidades.map((u) => ({
    ref: u.ref,
    nombre: u.nombre,
    modelo: u.modelo,
    marca: u.marca,
    categoria: u.categoria,
    color: u.color ?? u.colores?.join(" / ") ?? "—",
    capacidad: capacidad(u.capacidadGb),
    estado: u.estadoEtiqueta,
    bateria: u.bateria,
    disponibilidad: u.disponibilidad,
    defecto: u.defecto,
    precio: precio(precioARS(u, tc.valor)),
    imagen: rutaImagen(u.ref),
    tipo: tipoImagen(u.ref),
    href: `/unidad/${u.ref}`,
  }));

  const reales = items.filter((i) => i.tipo === "real").length;

  return (
    <div className="contenedor py-8">
      <p className="etiqueta mb-2">Panel interno</p>
      <h1 className="text-[clamp(26px,6vw,36px)] font-semibold tracking-[-.035em]">Imágenes</h1>
      <p className="mt-2 text-[14.5px] text-mute">
        {items.length} productos · {reales} con fotografía · {items.length - reales} con imagen
        generada. Tocá una tarjeta para abrir la ficha.
      </p>

      <GrillaAuditoria items={items} categorias={familiasVisibles().map((f) => f.nombre)} />
    </div>
  );
}
