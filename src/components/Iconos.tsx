/**
 * Iconografía propia · trazo de 1.5, esquinas redondeadas, sin relleno.
 * Sin librería externa: 3 iconos no justifican 300 KB de dependencia.
 */
const base = {
  width: 22, height: 22, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 1.5,
  strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
};

export function IconoRevision() {
  return (
    <svg {...base} aria-hidden="true">
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M9.5 12.5l1.8 1.8 3.4-3.6" />
    </svg>
  );
}

export function IconoGarantia() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M12 2.8l7 2.6v5.4c0 4.3-2.9 8-7 9.4-4.1-1.4-7-5.1-7-9.4V5.4z" />
      <path d="M9 11.8l2 2 4-4.2" />
    </svg>
  );
}

export function IconoAsesoramiento() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M20.5 12.4c0 3.9-3.8 7-8.5 7-1 0-2-.14-2.9-.4L4 20.5l1.6-3.7c-1-1.2-1.6-2.7-1.6-4.4 0-3.9 3.8-7 8.5-7s8 3.1 8 7z" />
      <path d="M9.7 10.2c.2-1 1.1-1.7 2.2-1.7 1.2 0 2.2.8 2.2 1.9 0 1.6-2.2 1.6-2.2 3" />
      <path d="M11.9 15.6h.01" />
    </svg>
  );
}

export function IconoEnvio() {
  return (
    <svg {...base} aria-hidden="true">
      <path d="M2.8 7.5h9.4v9H2.8z" />
      <path d="M12.2 10.2h4l3 3v3.3h-7z" />
      <circle cx="6.4" cy="18.4" r="1.9" />
      <circle cx="16.6" cy="18.4" r="1.9" />
    </svg>
  );
}
