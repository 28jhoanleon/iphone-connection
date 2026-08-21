/**
 * Puerta del panel.  middleware.ts  (en la raíz, al lado de next.config.ts)
 *
 * Dos cuentas con el mismo panel salvo una cosa: sincronizar el catálogo desde
 * el CSV del proveedor queda reservado.
 *
 * No es jerarquía. La sincronización es el único paso que reescribe las 295
 * unidades de una vez, y es donde entran los errores del proveedor —el aspirador
 * entre las tablets, los precios en pesos leídos como dólares, las columnas
 * corridas—. Ese filtro tiene que tener un solo responsable, no dos.
 *
 * Todo lo demás —precios, márgenes, fotos, descripciones, correcciones,
 * publicar— lo hacen los dos igual.
 *
 * Variables en Vercel:
 *   ADMIN_USUARIO / ADMIN_CLAVE      cuenta con sincronización
 *   PANEL_USUARIO / PANEL_CLAVE      cuenta sin sincronización
 *
 * Sin ADMIN_CLAVE cargada el panel queda cerrado del todo en producción: mejor
 * que Bryan avise que no entra a que quede abierto por un olvido.
 */
import { NextRequest, NextResponse } from "next/server";
import permisos from "../data/permisos.json";

export const config = { matcher: ["/admin/:path*", "/api/:path*"] };

/**
 * Sincronizar queda siempre reservado a la cuenta principal, aunque los permisos
 * digan otra cosa. Es el único paso que reescribe las 334 unidades de una vez y
 * donde entran los errores del proveedor: ese filtro tiene un solo responsable.
 */
const SIEMPRE_PRINCIPAL = [
  "/admin/sincronizar",
  "/api/sincronizar",
  // La pantalla de permisos también: sin esto la cuenta secundaria podía entrar
  // y ampliarse los permisos sola, y todo el mecanismo quedaba decorativo.
  "/admin/permisos",
  "/api/permisos",
];

/** Cada sección con las rutas que la componen. Se edita desde /admin/permisos. */
const SECCIONES: Record<string, string[]> = {
  precios: ["/admin/precios", "/api/precios"],
  fotos: ["/admin/fotos", "/api/foto", "/api/descarga"],
  productos: ["/admin/productos", "/admin/revisar", "/api/correccion"],
  contenido: ["/admin/contenido"],
  publicar: ["/api/publicar"],
};

/**
 * Intentos fallidos por IP. Vive en memoria del proceso, así que en Vercel se
 * reinicia con cada instancia fría y no es una defensa completa: es un freno.
 * Una defensa real necesita almacenamiento compartido, que hoy no justifica el
 * costo. Contra alguien probando claves a mano, esto alcanza.
 */
const fallos = new Map<string, { n: number; hasta: number }>();
const MAX_INTENTOS = 8;
const BLOQUEO = 10 * 60 * 1000;

export function middleware(req: NextRequest) {
  if (process.env.VERCEL !== "1") return NextResponse.next();

  const claveAdmin = process.env.ADMIN_CLAVE;
  if (!claveAdmin) {
    return new NextResponse("Panel deshabilitado: falta ADMIN_CLAVE.", { status: 503 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconocida";
  const castigo = fallos.get(ip);
  if (castigo && castigo.hasta > Date.now()) {
    const min = Math.ceil((castigo.hasta - Date.now()) / 60000);
    return new NextResponse(`Demasiados intentos. Probá de nuevo en ${min} minutos.`, {
      status: 429,
    });
  }

  const cabecera = req.headers.get("authorization") || "";
  let quien: "principal" | "panel" | null = null;

  if (cabecera.startsWith("Basic ")) {
    let usuario = "", pass = "";
    try {
      [usuario, pass] = atob(cabecera.slice(6)).split(":");
    } catch {
      usuario = "";
    }
    if (usuario === (process.env.ADMIN_USUARIO || "admin") && pass === claveAdmin) {
      quien = "principal";
    } else if (
      process.env.PANEL_CLAVE &&
      usuario === (process.env.PANEL_USUARIO || "panel") &&
      pass === process.env.PANEL_CLAVE
    ) {
      quien = "panel";
    }
  }

  if (!quien) {
    const previo = fallos.get(ip);
    const n = (previo && previo.hasta < Date.now() ? 0 : previo?.n ?? 0) + 1;
    fallos.set(ip, { n, hasta: n >= MAX_INTENTOS ? Date.now() + BLOQUEO : 0 });

    return new NextResponse("Acceso restringido", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="iPhone Connection"' },
    });
  }

  fallos.delete(ip);

  const ruta = req.nextUrl.pathname;

  if (quien !== "principal") {
    if (SIEMPRE_PRINCIPAL.some((r) => ruta.startsWith(r))) {
      return new NextResponse("Esta sección la maneja la cuenta principal.", {
        status: 403,
      });
    }
    const permitidas = permisos as Record<string, boolean>;
    for (const [seccion, rutas] of Object.entries(SECCIONES)) {
      if (rutas.some((r) => ruta.startsWith(r)) && permitidas[seccion] === false) {
        return new NextResponse("Esta sección no está habilitada para tu cuenta.", { status: 403 });
      }
    }
  }

  // El nombre viaja a las rutas de API para que quede en el mensaje del commit.
  // Sin esto, dentro de un mes no hay forma de saber quién cambió un precio.
  const headers = new Headers(req.headers);
  headers.set("x-panel-usuario", quien === "principal" ? "jhoan" : "bryan");
  return NextResponse.next({ request: { headers } });
}
