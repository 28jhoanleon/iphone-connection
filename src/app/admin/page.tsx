import fs from "node:fs";
import Link from "next/link";
import { todasLasUnidades } from "@/lib/catalogo";
import { fotografiasPropias } from "@/lib/imagenes";
import { empresa, tiene } from "@/lib/empresa";

export const metadata = { title: "Panel — iPhone Connection", robots: { index: false } };
export const dynamic = "force-dynamic";

function leer<T>(ruta: string, porDefecto: T): T {
  try {
    return JSON.parse(fs.readFileSync(ruta, "utf8"));
  } catch {
    return porDefecto;
  }
}

function Metrica({
  valor, etiqueta, detalle, alerta,
}: { valor: string | number; etiqueta: string; detalle?: string; alerta?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${alerta ? "border-aviso-linea bg-aviso-fondo" : "border-line"}`}>
      <p className="text-[28px] font-semibold leading-none tracking-[-.03em]">{valor}</p>
      <p className="mt-1.5 text-[13.5px] text-mute">{etiqueta}</p>
      {detalle && (
        <p className={`mt-1 font-data text-[10px] tracking-[.08em] ${alerta ? "text-aviso-texto" : "text-mute-soft"}`}>
          {detalle}
        </p>
      )}
    </div>
  );
}

function Seccion({
  titulo, descripcion, href, insignia,
}: { titulo: string; descripcion: string; href: string; insignia?: string }) {
  return (
    <Link
      href={href}
      className="flex items-start justify-between gap-4 rounded-lg border border-line p-5 transition hover:-translate-y-0.5 hover:border-ink"
    >
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold tracking-[-.01em]">{titulo}</span>
        <span className="mt-1 block text-[13.5px] leading-relaxed text-mute">{descripcion}</span>
      </span>
      {insignia && (
        <span className="shrink-0 rounded-full border border-aviso-linea bg-aviso-fondo px-2.5 py-1 font-data text-[10.5px] text-aviso-texto">
          {insignia}
        </span>
      )}
    </Link>
  );
}

/**
 * Índice del panel. Da el estado del negocio de un vistazo y lleva a cada
 * herramienta: lo que necesita atención aparece marcado en ámbar.
 */
export default function Admin() {
  const unidades = todasLasUnidades();
  const cfg = leer("data/precios.json", { tcRespaldo: 0, margen: 0 });
  const correcciones = leer<Record<string, unknown>>("data/correcciones.json", {});
  const pendientes = leer<{ totales?: Record<string, number> }>("data/cambios-pendientes.json", {});

  const conFoto = fotografiasPropias();
  const sinFoto = unidades.length - conFoto;
  const aRevisar = unidades.filter(
    (u) => (u as { calidad?: string }).calidad === "revisar",
  ).length;
  const enStock = unidades.filter((u) => u.disponibilidad === "disponible").length;
  const faltanDatos = (["whatsapp", "instagram", "zona", "horarios"] as const)
    .filter((k) => !tiene(k)).length;

  return (
    <div className="contenedor max-w-[900px] py-10">
      <p className="etiqueta mb-3">Panel interno</p>
      <h1 className="text-[clamp(28px,6vw,38px)] font-semibold tracking-[-.035em]">
        {empresa.nombre}
      </h1>
      <p className="mt-2 text-[14.5px] text-mute">
        {unidades.length} productos publicados
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metrica valor={conFoto} etiqueta="Con fotografía" detalle={`${sinFoto} SIN FOTO`} alerta={sinFoto > 0} />
        <Metrica valor={aRevisar} etiqueta="Para revisar" alerta={aRevisar > 0} />
        <Metrica valor={`$${cfg.tcRespaldo}`} etiqueta="Tipo de cambio" detalle="INTERNO · NO SE PUBLICA" />
        <Metrica valor={`${Math.round(cfg.margen * 100)}%`} etiqueta="Margen sobre costo" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metrica valor={enStock} etiqueta="Con stock inmediato" detalle={`${unidades.length - enStock} POR ENCARGO`} alerta={enStock === 0} />
        <Metrica valor={Object.keys(correcciones).length} etiqueta="Correcciones guardadas" />
        <Metrica valor={pendientes.totales?.precios ?? 0} etiqueta="Precios por sincronizar" />
        <Metrica valor={faltanDatos} etiqueta="Datos de contacto sin cargar" alerta={faltanDatos > 0} />
      </div>

      <h2 className="etiqueta mb-3 mt-10">Herramientas</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Seccion
          titulo="Sincronizar"
          descripcion="Traer los cambios de la planilla del proveedor y revisarlos antes de publicar."
          href="/admin/sincronizar"
          insignia={pendientes.totales?.precios ? "pendiente" : undefined}
        />
        <Seccion
          titulo="Revisar catálogo"
          descripcion="Productos con datos faltantes. Se corrigen una vez y la corrección queda."
          href="/admin/revisar"
          insignia={aRevisar ? String(aRevisar) : undefined}
        />
        <Seccion
          titulo="Cargar fotos"
          descripcion="Subir o reemplazar fotografías. Se normalizan solas al formato del catálogo."
          href="/admin/fotos"
          insignia={sinFoto ? String(sinFoto) : undefined}
        />
        <Seccion
          titulo="Precios"
          descripcion="Tipo de cambio y margen. Definen el precio de todos los productos."
          href="/admin/precios"
        />
        <Seccion
          titulo="Productos"
          descripcion="Editar precio y disponibilidad de una unidad puntual."
          href="/admin/productos"
        />
        <Seccion
          titulo="Contenido"
          descripcion="Placas y textos listos para publicar en Instagram."
          href="/admin/contenido"
        />
      </div>

      {faltanDatos > 0 && (
        <div className="mt-8 rounded-lg border border-aviso-linea bg-aviso-fondo p-5">
          <h2 className="text-[15px] font-semibold">Faltan datos de contacto</h2>
          <p className="mt-1 text-[13.5px] leading-relaxed text-mute">
            Sin ellos el sitio no puede cumplir su función. Se cargan en{" "}
            <code className="font-data">data/empresa.json</code>.
          </p>
        </div>
      )}
    </div>
  );
}
