import Link from "next/link";
import "../globals.css";

export const metadata = { robots: { index: false, follow: false } };

const SECCIONES = [
  ["/admin", "Resumen"],
  ["/admin/revisar", "Revisar"],
  ["/admin/fotos", "Fotos"],
  ["/admin/precios", "Precios"],
  ["/admin/productos", "Productos"],
  ["/admin/contenido", "Contenido"],
] as const;

/**
 * Marco del panel.
 *
 * Barra de secciones siempre visible: sin ella hay que volver al índice para
 * cambiar de herramienta, que era la fricción más grande del panel anterior.
 * En móvil desplaza horizontalmente en vez de colapsar en un menú.
 */
export default function LayoutAdmin({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
        <div className="contenedor flex h-14 items-center justify-between gap-4">
          <Link href="/admin" className="shrink-0 text-[15px] font-bold tracking-[-.03em]">
            Panel
          </Link>
          <Link
            href="/"
            className="shrink-0 text-[13px] text-mute transition hover:text-ink"
          >
            Ver el sitio →
          </Link>
        </div>
        <nav
          aria-label="Secciones del panel"
          className="contenedor -mb-px flex gap-1 overflow-x-auto pb-0 [scrollbar-width:none]"
        >
          {SECCIONES.map(([href, txt]) => (
            <Link
              key={href}
              href={href}
              className="shrink-0 border-b-2 border-transparent px-3 pb-2.5 pt-1 text-[13.5px] text-mute transition hover:border-line hover:text-ink"
            >
              {txt}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
