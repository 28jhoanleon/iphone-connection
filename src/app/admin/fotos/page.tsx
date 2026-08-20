import { todasLasUnidades, familiasVisibles } from "@/lib/catalogo";
import { rutaImagen, tipoImagen } from "@/lib/imagenes";
import { precio, precioARS } from "@/lib/formato";
import { tipoCambio } from "@/lib/dolar";
import CargarFotos from "@/components/admin/CargarFotos";
import { puedeEscribir } from "@/lib/escribir";

export const metadata = { title: "Fotos", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Carga de fotografías del catálogo.
 *
 * Escribe en public/productos. En local va al disco; en Vercel, donde el sistema
 * de archivos es de sólo lectura, va por commit a GitHub.
 *
 * Si puede escribir o no lo decide puedeEscribir(), no una comprobación propia.
 * La versión anterior miraba VERCEL y NODE_ENV a mano y daba siempre false en
 * producción, aunque el token estuviera cargado: la página quedaba pidiendo
 * levantar el servidor local incluso cuando podía guardar perfectamente.
 */
export default async function Fotos() {
  const tc = await tipoCambio();
  const local = puedeEscribir();

  const items = todasLasUnidades().map((u) => ({
    ref: u.ref,
    nombre: u.nombre,
    modelo: u.modelo,
    marca: u.marca,
    categoria: u.categoria,
    color: u.color ?? u.colores?.join(" / ") ?? "sin color",
    imagen: rutaImagen(u.ref),
    tipo: tipoImagen(u.ref),
    precio: precio(precioARS(u, tc.valor)),
  }));

  return (
    <div className="contenedor py-8">
      <p className="etiqueta mb-2">Panel interno</p>
      <h1 className="text-[clamp(26px,6vw,36px)] font-semibold tracking-[-.035em]">Fotos</h1>
      <p className="mt-2 max-w-[54ch] text-[14.5px] leading-relaxed text-mute">
        Tocá o arrastrá una imagen sobre el producto. Se recorta, se centra en
        1000×1000 con fondo blanco y se le aplica la misma sombra que al resto del
        catálogo. No hace falta prepararla antes.
      </p>

      <CargarFotos
        items={items}
        categorias={familiasVisibles().map((f) => f.nombre)}
        local={local}
      />
    </div>
  );
}
