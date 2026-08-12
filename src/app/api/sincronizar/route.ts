import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const ejecutar = promisify(execFile);
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Sincronización desde el panel.
 *
 * GET  -> mira si la planilla cambió, sin tocar nada. Compara el contenido del
 *         CSV publicado contra el que se procesó la última vez.
 * POST -> corre la sincronización completa: importa, aplica correcciones,
 *         regenera imágenes, clasifica calidad y reconstruye el buscador.
 *
 * Es deliberado que no se dispare sola: un error del proveedor llegaría al sitio
 * en minutos. El panel avisa; la decisión de aplicar sigue siendo humana.
 */

async function huellaRemota(): Promise<{ filas: number; hash: string } | null> {
  try {
    const cfg = JSON.parse(await readFile("data/sincronizacion.json", "utf8"));
    const r = await fetch(cfg.url, { cache: "no-store" });
    if (!r.ok) return null;
    const texto = await r.text();
    const filas = texto.split("\n").filter((l) => l.replace(/[,; \t]/g, "")).length;
    // huella simple del contenido: alcanza para saber si algo cambió
    let h = 0;
    for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) | 0;
    return { filas, hash: String(h) };
  } catch {
    return null;
  }
}

export async function GET() {
  const remota = await huellaRemota();
  if (!remota) {
    return NextResponse.json({ estado: "sin_conexion" });
  }

  let local: { hash?: string; filas?: number } = {};
  try {
    local = JSON.parse(await readFile("data/sincronizacion.json", "utf8"));
  } catch {
    /* primera corrida */
  }

  const hayCambios = local.hash !== remota.hash;
  return NextResponse.json({
    estado: hayCambios ? "hay_cambios" : "al_dia",
    filas: remota.filas,
    filasAntes: local.filas ?? null,
  });
}

export async function POST(req: NextRequest) {
  if (process.env.VERCEL === "1") {
    return NextResponse.json(
      { error: "Sólo funciona con el servidor local: npm run dev" },
      { status: 400 },
    );
  }

  const { aplicar } = await req.json().catch(() => ({ aplicar: false }));

  try {
    const args = ["scripts/sincronizar-planilla.py"];
    if (aplicar) args.push("--aplicar");
    const { stdout } = await ejecutar("python3", args, { maxBuffer: 8 * 1024 * 1024 });

    // guardar la huella para que el aviso deje de aparecer
    if (aplicar) {
      const remota = await huellaRemota();
      if (remota) {
        const cfg = JSON.parse(await readFile("data/sincronizacion.json", "utf8"));
        cfg.hash = remota.hash;
        cfg.filas = remota.filas;
        const { writeFile } = await import("node:fs/promises");
        await writeFile("data/sincronizacion.json", JSON.stringify(cfg, null, 2), "utf8");
      }
    }

    return NextResponse.json({ ok: true, salida: stdout });
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    return NextResponse.json(
      { error: err.stdout || err.stderr || err.message || "Falló la sincronización." },
      { status: 500 },
    );
  }
}
