/**
 * Marcador visible de dato faltante.
 * No inventamos datos de ejemplo: si falta información real, se ve que falta.
 * `npm run verificar` corta el deploy si queda alguno.
 */
export default function PendienteDato({ campo, nota }: { campo: string; nota: string }) {
  return (
    <p className="mt-8 rounded-md border border-dashed border-line px-4 py-3 font-data text-[11.5px] tracking-[.06em] text-mute">
      DATO PENDIENTE · {campo.toUpperCase()} — {nota}
    </p>
  );
}
