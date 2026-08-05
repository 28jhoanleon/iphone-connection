"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Aparición al entrar en pantalla.
 *
 * Sin librería de animación: IntersectionObserver es nativo y pesa 0 KB, contra
 * los ~60 KB de framer-motion. Para un fade + desplazamiento no hace falta más.
 *
 * El movimiento es corto (16px, 600ms) y con curva de desaceleración: se percibe
 * como que el contenido "se asienta", no como un efecto. Cada elemento se anima
 * una sola vez y respeta prefers-reduced-motion.
 */
export default function Revelar({
  children,
  retraso = 0,
  className = "",
}: {
  children: React.ReactNode;
  retraso?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisible(true);
      return;
    }

    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      // se dispara un poco antes de que el elemento toque el borde:
      // así el contenido ya está asentado cuando el ojo llega
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`${className} ${visible ? "revelado" : "por-revelar"}`}
      style={visible && retraso ? { transitionDelay: `${retraso}ms` } : undefined}
    >
      {children}
    </div>
  );
}
