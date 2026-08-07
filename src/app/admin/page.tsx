import fs from "node:fs";
import { todasLasUnidades, familiasVisibles } from "@/lib/catalogo";
import { precio, precioARS } from "@/lib/formato";
import { tipoCambio } from "@/lib/dolar";
import { empresa, tiene } from "@/lib/empresa";
import { tipoImagen } from "@/lib/imagenes";
import { Metrica, Accion } from "@/components/admin/Tarjeta";

export const metadata = { title: "Panel", robots: { index: false } };

function leerJSON<T>(ruta: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(ruta, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Resumen del negocio. Responde de un vistazo: cuánto hay publicado, qué está
 * pendiente y qué conviene hacer ahora.
 */
export default async function Panel() {
  const tc = await tipoCambio();
  const unidades = todasLasUnidades();
  const cfg = leerJSON<{ tcRespaldo: number; margen: number }>("data/precios.json");
  const sync = leerJSON<{ fecha: string; totales: Record<string, number> }>("data/cambios-pendientes.json");

  const conFoto = unidades.filter((u) => tipoImagen(u.ref) === "real").length;
  const enStock = unidades.filter((u) => u.disponibilidad === "disponible").length;
  const precios = unidades.map((u) => precioARS(u, tc.valor));
  const valorCatalogo = precios.reduce((a, b) => a + b, 0);

  const faltanDatos = ["whatsapp", "instagram", "zona", "horarios"]
    .filter((c) => !tiene(c as never));

  const cambios = sync ? Object.values(sync.totales).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="contenedor py-8">
      <p className="etiqueta mb-2">Panel interno</p>
      <h1 className="text-[clamp(26px,6vw,36px)] font-semibold tracking-[-.035em]">
        {empresa.nombre}
      </h1>
      <p className="mt-2 text-[14.5px] text-mute">
        {unidades.length} equipos publicados · {familiasVisibles().length} categorías
      </p>

      <section className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metrica valor={unidades.length} etiqueta="Equipos publicados" />
        <Metrica
          valor={enStock}
          etiqueta="Con stock inmediato"
          detalle={`${unidades.length - enStock} por encargo`}
          alerta={enStock === 0}
        />
        <Metrica
          valor={`${Math.round((conFoto / unidades.length) * 100)}%`}
          etiqueta="Con foto real"
          detalle={`${unidades.length - conFoto} generadas`}
        />
        <Metrica
          valor={precio(valorCatalogo).replace(/\.\d+$/, "")}
          etiqueta="Valor del catálogo"
        />
      </section>

      {(faltanDatos.length > 0 || enStock === 0) && (
        <section className="mt-8">
          <h2 className="etiqueta mb-3">Requiere atención</h2>
          <div className="space-y-3">
            {faltanDatos.length > 0 && (
              <div className="rounded-lg border border-aviso-linea bg-aviso-fondo p-5">
                <p className="text-[15px] font-semibold">Faltan datos de contacto</p>
                <p className="mt-1 text-[13.5px] text-mute">
                  Sin {faltanDatos.join(", ")}, esos bloques no se muestran en el sitio.
                  Se cargan en <code className="font-data text-[12px]">data/empresa.json</code>.
                </p>
              </div>
            )}
            {enStock === 0 && (
              <div className="rounded-lg border border-aviso-linea bg-aviso-fondo p-5">
                <p className="text-[15px] font-semibold">Ningún equipo figura con stock inmediato</p>
                <p className="mt-1 text-[13.5px] text-mute">
                  Los {unidades.length} aparecen como &quot;Por encargo&quot;. Un catálogo entero sin
                  disponibilidad resta credibilidad. Marcá los que tengas físicamente.
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="etiqueta mb-3">Precios</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Metrica valor={`$${cfg?.tcRespaldo ?? "—"}`} etiqueta="Tipo de cambio" detalle="INTERNO · NO SE PUBLICA" />
          <Metrica valor={`${Math.round((cfg?.margen ?? 0) * 100)}%`} etiqueta="Margen sobre costo" />
          <Metrica
            valor={precio(Math.min(...precios))}
            etiqueta="Producto más barato"
            detalle={`MÁS CARO ${precio(Math.max(...precios))}`}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="etiqueta mb-3">Tareas</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Accion
            titulo={cambios > 0 ? `${cambios} cambios sin aplicar` : "Sincronizar con la planilla"}
            descripcion={
              sync
                ? `Última lectura ${sync.fecha.replace("T", " · ")}. Revisá qué cambió antes de publicarlo.`
                : "Lee la planilla del proveedor y muestra los cambios para aprobar."
            }
            href="/admin/sincronizar"
          />
          <Accion
            titulo="Generar contenido"
            descripcion="Placas de Instagram y textos, listos para publicar."
            href="/admin/contenido"
          />
          <Accion
            titulo="Revisar imágenes"
            descripcion="Las 285 con su referencia, color y estado, en una grilla."
            href="/admin/imagenes"
          />
          <Accion
            titulo="Verificar precios"
            descripcion="Rehace la cuenta contra la planilla y busca desvíos."
            comando="python3 scripts/verificar-precios.py"
          />
        </div>
      </section>
    </div>
  );
}
