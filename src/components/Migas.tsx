import Link from "next/link";
import { SITIO } from "@/lib/seo";

export default function Migas({ items }: { items: [string, string | null][] }) {
  // BreadcrumbList: Google muestra la ruta navegable en vez de la URL cruda.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([nombre, href], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: nombre,
      ...(href ? { item: `${SITIO}${href}` } : {}),
    })),
  };

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <nav aria-label="Ruta de navegación" className="flex flex-wrap gap-1.5 pt-5 font-data text-[10.5px] tracking-[.1em] text-mute">
      {items.map(([texto, href], i) => (
        <span key={texto} className="flex gap-1.5">
          {i > 0 && <span>/</span>}
          {href ? <Link href={href} className="hover:text-ink hover:underline">{texto}</Link> : <span>{texto}</span>}
        </span>
      ))}
    </nav>
    </>
  );
}
