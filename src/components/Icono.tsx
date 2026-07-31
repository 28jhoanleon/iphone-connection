/**
 * Íconos de línea, 1.5px, mismo peso visual que la tipografía.
 * Sin librería externa: cuatro trazos no justifican 40 KB de dependencia.
 */
const TRAZOS: Record<string, React.ReactNode> = {
  revision: (
    <>
      <path d="M12 3l7 3v5.5c0 4.2-2.9 8.1-7 9.5-4.1-1.4-7-5.3-7-9.5V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  garantia: (
    <>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M15 3v4h4" />
      <path d="M9.5 13.5l1.8 1.8 3.4-3.6" />
    </>
  ),
  asesoramiento: (
    <>
      <path d="M4 5h16v11H9l-5 4V5z" />
      <path d="M9 9.5h6M9 12.5h4" />
    </>
  ),
};

export default function Icono({ nombre, className = "" }: { nombre: keyof typeof TRAZOS | string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      className={`h-6 w-6 ${className}`}
    >
      {TRAZOS[nombre] ?? null}
    </svg>
  );
}
