export const metadata = { title: "Garantía — iPhone Connection" };

export default function Garantia() {
  return (
    <div className="contenedor max-w-[720px] py-10 sm:py-16">
      <p className="etiqueta mb-5">Garantía</p>
      <h1 className="text-balance text-[clamp(27px,7vw,46px)] font-semibold leading-[1.06] tracking-[-.03em]">
        Por escrito, desde el día uno.
      </h1>
      <p className="mt-6 text-mute">
        La garantía se entrega por escrito junto con la compra. Estas son las condiciones vigentes.
      </p>

      <h2 className="mt-9 mb-3 text-xl font-semibold tracking-[-.02em]">Plazos</h2>
      <ul className="space-y-2 text-mute">
        <li>· Equipos nuevos sellados: 12 meses.</li>
        <li>· Equipos seleccionados (A, B y C): 6 meses.</li>
        <li>· Accesorios: 3 meses.</li>
      </ul>

      <h2 className="mt-10 mb-3 text-[19px] sm:text-xl font-semibold tracking-[-.02em]">Qué cubre</h2>
      <ul className="space-y-2 text-mute">
        <li>· Fallas de funcionamiento no provocadas por el uso.</li>
        <li>· Batería con salud inferior a la declarada en la ficha al momento de la compra.</li>
        <li>· Fallas de pantalla, cámaras, altavoces, carga y conectividad.</li>
      </ul>

      <h2 className="mt-10 mb-3 text-[19px] sm:text-xl font-semibold tracking-[-.02em]">Qué no cubre</h2>
      <ul className="space-y-2 text-mute">
        <li>· Daño por golpe, caída o contacto con líquidos.</li>
        <li>· Detalles estéticos o funcionales declarados en la ficha del producto.</li>
        <li>· Intervenciones realizadas por terceros.</li>
      </ul>

      <p className="mt-12 rounded-md border border-line p-5 text-sm text-mute">
        Documento pendiente de revisión legal antes de producción. Las condiciones aplicables a
        una compra son las vigentes en la fecha de esa compra: cada venta guarda su propia versión.
      </p>
    </div>
  );
}
