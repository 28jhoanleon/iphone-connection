import fs from "node:fs";
import Link from "next/link";
import { todasLasUnidades } from "@/lib/catalogo";
import { fotografiasPropias } from "@/lib/imagenes";
import { empresa, tiene } from "@/lib/empresa";
import BotonSincronizar from "@/components/admin/BotonSincronizar";
import BotonPublicar from "@/components/admin/BotonPublicar";

export const metadata = { title: "Panel — iPhone Connection" };
export const dynamic = "force-dynamic";

function leer<T>(ruta: string, porDefecto: T): T {
  try {
    return JSON.parse(fs.readFileSync(ruta, "utf8"));
  } catch {
    return porDefecto;
  }
}

function Dato({
  valor, etiqueta, detalle, alerta,
}: { valor: string | number; etiqueta: string; detalle?: string; alerta?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${alerta ? "border-aviso-linea bg-aviso-fondo" : "border-line"}`}>
      <p className="text-[26px] font-semibold leading-none tracking-[-.03em]">{valor}</p>
      <p className="mt-1.5 text-[13px] leading-tight text-mute">{etiqueta}</p>
      {detalle && (
        <p className={`mt-1 font-data text-[10px] tracking-[.08em] ${alerta ? "text-aviso-texto" : "text-mute-soft"}`}>
          {detalle}
        </p>
      )}
    </div>
  );
}

/** Tarea pendiente. Lo que bloquea la venta va primero, no lo más fácil de hacer. */
function Tarea({
  titulo, porque, accion, href, urgente, hecho,
}: {
  titulo: string; porque: string; accion: string; href?: string;
  urgente?: boolean; hecho?: boolean;
}) {
  const cuerpo = (
    <div className="flex items-start gap-3">
      <span
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px] ${
          hecho ? "border-ink bg-ink text-paper"
            : urgente ? "border-aviso-texto text-aviso-texto" : "border-line text-mute-soft"
        }`}
        aria-hidden="true"
      >
        {hecho ? "✓" : ""}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[15px] font-semibold ${hecho ? "text-mute line-through" : ""}`}>
          {titulo}
        </span>
        <span className="mt-1 block text-[13.5px] leading-relaxed text-mute">{porque}</span>
        {!hecho && (
          <span className="mt-2 inline-block font-data text-[11px] uppercase tracking-[.08em] text-ink">
            {accion} →
          </span>
        )}
      </span>
    </div>
  );

  const clase = `block rounded-lg border p-5 transition ${
    hecho ? "border-line opacity-60"
      : urgente ? "border-aviso-linea bg-aviso-fondo hover:-translate-y-0.5"
      : "border-line hover:-translate-y-0.5 hover:border-ink"
  }`;

  return href && !hecho ? (
    <Link href={href} className={clase}>{cuerpo}</Link>
  ) : (
    <div className={clase}>{cuerpo}</div>
  );
}

/**
 * Resumen del negocio.
 *
 * Ordenado por lo que bloquea la venta, no por lo que es más fácil: sin datos de
 * contacto el sitio no puede cumplir su función, y eso pesa más que cualquier
 * foto faltante.
 */
export default function Admin() {
  const unidades = todasLasUnidades();
  const cfg = leer("data/precios.json", {
    tcRespaldo: 0,
    margenPorCategoria: {} as Record<string, number>,
  });
  const correcciones = leer<Record<string, unknown>>("data/correcciones.json", {});

  const conFoto = fotografiasPropias();
  const sinFoto = unidades.length - conFoto;
  const aRevisar = unidades.filter((u) => (u as { calidad?: string }).calidad === "revisar").length;
  const enStock = unidades.filter((u) => u.disponibilidad === "disponible").length;
  const unicas = unidades.filter((u) => u.disponibilidad === "ultima_unidad").length;
  const conDesc = unidades.filter((u) => (u as { descripcion?: string }).descripcion).length;

  const datosFaltan = (["whatsapp", "instagram", "zona", "horarios"] as const).filter((k) => !tiene(k));
  const margenes = Object.values(cfg.margenPorCategoria ?? {});
  const margenMedio = margenes.length
    ? Math.round(margenes.reduce((a, b) => a + b, 0) / margenes.length)
    : 0;

  return (
    <div className="contenedor max-w-[880px] py-8">
      <h1 className="text-[clamp(24px,5.5vw,32px)] font-semibold tracking-[-.035em]">
        {empresa.nombre}
      </h1>
      <p className="mt-1 text-[14px] text-mute">{unidades.length} productos publicados</p>

      <div className="mt-6">
        <BotonSincronizar local={process.env.VERCEL !== "1"} />
      </div>

      {process.env.VERCEL !== "1" && (
        <div className="mt-3">
          <BotonPublicar />
        </div>
      )}

      <h2 className="etiqueta mb-3 mt-9">Qué falta</h2>
      <div className="space-y-3">
        <Tarea
          titulo="Cargar los datos de contacto"
          porque={
            datosFaltan.length
              ? `Faltan ${datosFaltan.join(", ")}. Sin el WhatsApp los botones llevan a una página vacía: hoy el catálogo no puede terminar en una venta.`
              : "Los datos están cargados y los botones funcionan."
          }
          accion="Editar data/empresa.json"
          urgente
          hecho={datosFaltan.length === 0}
        />
        <Tarea
          titulo="Marcar qué tenés físicamente"
          porque={
            enStock
              ? `${enStock} con stock inmediato y ${unicas} unidades únicas.`
              : `Ningún producto figura con stock propio. ${unicas} usados ya se muestran como última unidad, pero un catálogo sin nada disponible al instante resta credibilidad.`
          }
          accion="Marcar en Productos"
          href="/admin/productos"
          urgente={enStock === 0}
          hecho={enStock > 0}
        />
        <Tarea
          titulo="Completar fotografías"
          porque={
            sinFoto
              ? `${sinFoto} productos usan imagen generada. Son los que menos confianza transmiten.`
              : "Todo el catálogo tiene fotografía."
          }
          accion="Cargar fotos"
          href="/admin/fotos"
          hecho={sinFoto === 0}
        />
        <Tarea
          titulo="Corregir datos faltantes"
          porque={
            aRevisar
              ? `${aRevisar} productos sin color, marca o algún dato que se ve en la ficha.`
              : "Ningún producto tiene datos faltantes."
          }
          accion="Revisar catálogo"
          href="/admin/revisar"
          hecho={aRevisar === 0}
        />
      </div>

      <h2 className="etiqueta mb-3 mt-9">Estado</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Dato valor={conFoto} etiqueta="Con fotografía" detalle={`${sinFoto} SIN FOTO`} alerta={sinFoto > 0} />
        <Dato valor={conDesc} etiqueta="Con descripción" />
        <Dato valor={unicas} etiqueta="Última unidad" detalle="USADOS · UNO DE CADA UNO" />
        <Dato valor={enStock} etiqueta="Stock inmediato" alerta={enStock === 0} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Dato valor={`$${cfg.tcRespaldo}`} etiqueta="Tipo de cambio" detalle="INTERNO" />
        <Dato valor={`+US$${margenMedio}`} etiqueta="Margen medio" detalle="MONTO FIJO" />
        <Dato valor={Object.keys(correcciones).length} etiqueta="Correcciones" />
        <Dato valor={unidades.length - enStock - unicas} etiqueta="Por encargo" />
      </div>
    </div>
  );
}
