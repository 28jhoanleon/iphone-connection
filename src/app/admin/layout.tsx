import Link from "next/link";

const SECCIONES = [
  ["/admin", "Resumen"],
  ["/admin/catalogo", "Catálogo"],
  ["/admin/sincronizar", "Sincronizar"],
  ["/admin/contenido", "Contenido"],
  ["/auditoria", "Imágenes"],
];

/**
 * Panel interno. Navegación propia, separada del sitio público: acá se
 * administra, no se vende.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav
        aria-label="Panel"
        className="sticky top-[92px] z-30 -mt-2 border-b border-line bg-paper/95 backdrop-blur"
      >
        <div className="contenedor flex gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
          {SECCIONES.map(([href, texto]) => (
            <Link
              key={href}
              href={href}
              className="inline-flex h-10 shrink-0 items-center rounded-full px-4 text-[13.5px] text-mute transition hover:bg-surface hover:text-ink"
            >
              {texto}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </div>
  );
}
