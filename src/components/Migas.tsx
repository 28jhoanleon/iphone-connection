import Link from "next/link";

export default function Migas({ items }: { items: [string, string | null][] }) {
  return (
    <nav className="flex flex-wrap gap-1.5 pt-5 font-data text-[10.5px] tracking-[.09em] text-mute">
      {items.map(([texto, href], i) => (
        <span key={texto} className="flex gap-1.5">
          {i > 0 && <span>/</span>}
          {href ? <Link href={href} className="hover:text-ink hover:underline">{texto}</Link> : <span>{texto}</span>}
        </span>
      ))}
    </nav>
  );
}
