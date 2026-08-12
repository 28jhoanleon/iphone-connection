import { todasLasUnidades, familiasVisibles } from "@/lib/catalogo";
import { rutaImagen, tipoImagen } from "@/lib/imagenes";
import { precio, precioARS } from "@/lib/formato";
import { tipoCambio } from "@/lib/dolar";
import CargarFotos from "@/components/admin/CargarFotos";

export const metadata = { title: "Fotos", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Carga de fotografías del catálogo.
 *
 * Escribe en public/productos, así que sólo funciona con el servidor local:
 * el sistema de archivos de Vercel es de sólo lectura. El componente lo detecta
 * y explica cómo levantarlo en vez de fallar en silencio.
 */
export default async function Fotos() {
  const tc = await tipoCambio();
  const local = process.env.VERCEL !== "1" && process.env.NODE_ENV !== "production";

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
