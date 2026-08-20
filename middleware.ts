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

export const config = { matcher: ["/admin/:path*", "/api/:path*"] };

// Rutas que solo abre la cuenta principal.
const SOLO_PRINCIPAL = ["/admin/sincronizar", "/api/sincronizar"];

export function middleware(req: NextRequest) {
  if (process.env.VERCEL !== "1") return NextResponse.next();

  const claveAdmin = process.env.ADMIN_CLAVE;
  if (!claveAdmin) {
    return new NextResponse("Panel deshabilitado: falta ADMIN_CLAVE.", { status: 503 });
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
    return new NextResponse("Acceso restringido", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="iPhone Connection"' },
    });
  }

  const ruta = req.nextUrl.pathname;
  if (quien !== "principal" && SOLO_PRINCIPAL.some((r) => ruta.startsWith(r))) {
    return new NextResponse("La sincronización del catálogo la hace la cuenta principal.", {
      status: 403,
    });
  }

  // El nombre viaja a las rutas de API para que quede en el mensaje del commit.
  // Sin esto, dentro de un mes no hay forma de saber quién cambió un precio.
  const headers = new Headers(req.headers);
  headers.set("x-panel-usuario", quien === "principal" ? "jhoan" : "bryan");
  return NextResponse.next({ request: { headers } });
}
