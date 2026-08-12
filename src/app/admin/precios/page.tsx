import fs from "node:fs";
import { todasLasUnidades } from "@/lib/catalogo";
import EditarPrecios from "@/components/admin/EditarPrecios";

export const metadata = { title: "Precios", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function Precios() {
  const cfg = JSON.parse(fs.readFileSync("data/precios.json", "utf8"));
  const local = process.env.VERCEL !== "1";

  // un producto de referencia para ver el efecto antes de guardar
  const ejemplo =
    todasLasUnidades().find((u) => u.costoCentavos && u.categoria === "iPhone") ??
    todasLasUnidades().find((u) => u.costoCentavos);

  return (
    <div className="contenedor max-w-[720px] py-8">
      <p className="etiqueta mb-2">Panel interno</p>
      <h1 className="mb-6 text-[clamp(26px,6vw,36px)] font-semibold tracking-[-.035em]">
        Precios
      </h1>

      <EditarPrecios
        tcInicial={cfg.tcRespaldo}
        margenInicial={cfg.margen}
        redondeo={cfg.redondeoPesos}
        ejemploCosto={ejemplo?.costoCentavos ? ejemplo.costoCentavos / 100 : 100}
        ejemploNombre={ejemplo?.nombre ?? "—"}
        local={local}
      />

      <div className="mt-4 rounded-lg border border-line p-5">
        <h2 className="text-[15px] font-semibold">Después de cambiarlos</h2>
        <pre className="mt-3 overflow-x-auto rounded-md bg-surface p-4 font-data text-[12.5px] leading-relaxed">
python3 scripts/verificar-precios.py{"\n"}git add -A && git commit -m &quot;precios&quot; && git push
        </pre>
        <p className="mt-3 text-[13px] leading-relaxed text-mute">
          El verificador rehace la cuenta contra la planilla del proveedor y avisa
          si algún precio quedó fuera de rango.
        </p>
      </div>
    </div>
  );
}
