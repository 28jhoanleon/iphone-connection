export default function BloqueFicha({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-line p-5">
      <h2 className="etiqueta mb-3.5">{titulo}</h2>
      {children}
    </section>
  );
}
