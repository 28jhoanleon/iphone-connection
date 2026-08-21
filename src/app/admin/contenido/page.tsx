import fs from "node:fs";
import path from "node:path";
import { Accion } from "@/components/admin/Tarjeta";

export const metadata = { title: "Contenido", robots: { index: false } };

const DIR = "contenido";

function hayImagen(archivo: string): boolean {
  try {
    return fs.existsSync(path.join("public/contenido", archivo));
  } catch {
    return false;
  }
}

function listar(): { archivo: string; texto: string }[] {
  try {
    const textos = fs.readFileSync(path.join(DIR, "textos.txt"), "utf8");
    const bloques = textos.split("=".repeat(60)).map((b) => b.trim()).filter(Boolean);
    const salida: { archivo: string; texto: string }[] = [];
    for (let i = 0; i < bloques.length - 1; i += 2) {
      salida.push({ archivo: bloques[i], texto: bloques[i + 1] });
    }
    return salida;
  } catch {
    return [];
  }
}

/**
 * Contenido listo para publicar. Las placas se generan desde el catálogo:
 * los datos que sostienen la marca ya están ahí.
 */
export default function Contenido() {
  const piezas = listar();
  const DIAS = ["Lunes", "Miércoles", "Viernes"];

  return (
    <div className="contenedor py-8">
      <p className="etiqueta mb-2">Panel interno</p>
      <h1 className="text-[clamp(26px,6vw,36px)] font-semibold tracking-[-.035em]">Contenido</h1>
      <p className="mt-2 max-w-[52ch] text-[14.5px] text-mute">
        Placas de Instagram generadas desde el catálogo. Tres por semana es lo que se
        sostiene: la constancia rinde más que la cantidad.
      </p>

      {piezas.length === 0 ? (
        <div className="mt-7">
          <Accion
            titulo="Todavía no generaste contenido"
            descripcion="Produce 8 placas en 1080x1350 con sus textos, eligiendo productos de distintas categorías."
            comando={"python3 scripts/generar-placas.py\ncp -r contenido ~/storage/shared/Pictures/instagram"}
          />
        </div>
      ) : (
        <>
          <div className="mt-7 rounded-lg border border-line p-5">
            <h2 className="etiqueta mb-3">Plan de publicación</h2>
            <div className="space-y-2">
              {piezas.slice(0, 6).map((p, i) => (
                <div key={p.archivo} className="flex items-center gap-3 border-b border-line py-2 text-[14px] last:border-0">
                  <span className="w-24 shrink-0 font-data text-[11px] text-mute-soft">
                    SEM {Math.floor(i / 3) + 1} · {DIAS[i % 3].slice(0, 3).toUpperCase()}
                  </span>
                  <span className="truncate">{p.archivo}</span>
                </div>
              ))}
            </div>
          </div>

          <h2 className="etiqueta mb-3 mt-8">Placas</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {piezas.filter((p) => hayImagen(p.archivo)).map((p) => (
              <a key={p.archivo} href={`/contenido/${p.archivo}`} target="_blank" rel="noreferrer"
                 className="block overflow-hidden rounded-lg border border-line transition hover:border-ink">
                <img src={`/contenido/${p.archivo}`} alt={p.archivo}
                     width={1080} height={1350} loading="lazy" decoding="async"
                     className="w-full" />
              </a>
            ))}
          </div>

          <h2 className="etiqueta mb-3 mt-8">Textos</h2>
          <div className="space-y-3">
            {piezas.map((p) => (
              <details key={p.archivo} className="group rounded-lg border border-line p-5">
                <summary className="flex cursor-pointer list-none items-center gap-3">
                  {hayImagen(p.archivo) && (
                    <img src={`/contenido/${p.archivo}`} alt="" width={44} height={55}
                         loading="lazy" className="h-14 w-11 shrink-0 rounded border border-line object-cover" />
                  )}
                  <span className="flex-1 truncate text-[14.5px] font-medium">{p.archivo}</span>
                  <span className="shrink-0 text-mute transition group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-md bg-surface p-4 text-[13.5px] leading-relaxed">
                  {p.texto}
                </pre>
              </details>
            ))}
          </div>

          <div className="mt-8">
            <Accion
              titulo="Generar la próxima tanda"
              descripcion="Elige productos distintos cada semana, balanceando categorías para que el feed no quede lleno de iPhones iguales."
              comando={"python3 scripts/generar-placas.py\ncp -r contenido ~/storage/shared/Pictures/instagram"}
            />
          </div>
        </>
      )}
    </div>
  );
}
