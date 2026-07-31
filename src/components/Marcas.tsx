/**
 * Franja de marcas.
 *
 * Se usan los nombres tipográficos y no los logos oficiales: reproducir marcas
 * registradas sin acuerdo de distribución es una exposición legal innecesaria,
 * y una fila de logos ajenos con estilos distintos rompe la coherencia visual
 * que sostiene toda la identidad. El texto en monoespaciada es más sobrio y
 * comunica lo mismo: qué marcas trabajamos.
 */
export default function Marcas({ marcas }: { marcas: string[] }) {
  if (marcas.length === 0) return null;
  return (
    <section className="border-y border-line bg-surface/60">
      <div className="contenedor py-6 sm:py-7">
        <p className="mb-3.5 text-center font-data text-[10.5px] uppercase tracking-[.14em] text-mute-soft">
          Trabajamos con
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 sm:gap-x-9">
          {marcas.map((m) => (
            <li
              key={m}
              className="text-[14.5px] font-semibold tracking-[-.02em] text-mute transition-colors hover:text-ink"
            >
              {m}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
