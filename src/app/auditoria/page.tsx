import { todasLasUnidades, familiasVisibles } from "@/lib/catalogo";
import { rutaImagen, tipoImagen } from "@/lib/imagenes";
import { precio, precioARS, capacidad } from "@/lib/formato";
import { tipoCambio } from "@/lib/dolar";
import GrillaAuditoria from "@/components/GrillaAuditoria";

export const metadata = {
  title: "Auditoría de catálogo",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Auditoría visual integrada · reemplaza el script de Playwright.
 *
 * Playwright no corre en Android ("Unsupported platform: android") y este proyecto
 * se desarrolla íntegramente desde el celular. Una página propia resuelve lo mismo
 * sin navegador headless, sin dependencias y sin depender de una PC: se abre desde
 * cualquier dispositivo y muestra las 256 imágenes con sus datos al lado.
 *
 * No se indexa (robots noindex) y está excluida del sitemap.
 */
export default async function Auditoria() {
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
  const familias = familiasVisibles().map((f) => f.nombre);

  return (
    <div className="contenedor py-8">
      <p className="etiqueta mb-2">Uso interno · no indexada</p>
      <h1 className="text-[clamp(24px,6vw,34px)] font-semibold tracking-[-.035em]">
        Auditoría de catálogo
      </h1>
      <p className="mt-2 text-[14.5px] text-mute">
        {items.length} productos · {reales} con imagen real · {items.length - reales} generadas.
        Tocá una tarjeta para abrir la ficha.
      </p>

      <GrillaAuditoria items={items} categorias={familias} />
    </div>
  );
}
