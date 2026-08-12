import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const ejecutar = promisify(execFile);
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Publica los cambios: commit y push.
 *
 * Evita el último paso manual en Termux. Si no hay nada que publicar lo dice en
 * vez de fallar, y si el push es rechazado explica que hay que traer los cambios
 * del repositorio primero.
 */
export async function POST() {
  if (process.env.VERCEL === "1") {
    return NextResponse.json(
      { error: "Sólo funciona con el servidor local." },
      { status: 400 },
    );
  }

  try {
    const { stdout: estado } = await ejecutar("git", ["status", "--porcelain"]);
    if (!estado.trim()) {
      return NextResponse.json({ ok: true, sinCambios: true });
    }

    const fecha = new Date().toLocaleDateString("es-AR");
    await ejecutar("git", ["add", "-A"]);
    await ejecutar("git", ["commit", "-m", `actualizacion ${fecha}`]);
    const { stdout } = await ejecutar("git", ["push"], { maxBuffer: 4 * 1024 * 1024 });

    const archivos = estado.trim().split("\n").length;
    return NextResponse.json({ ok: true, archivos, salida: stdout });
  } catch (e) {
    const err = e as { stderr?: string; stdout?: string; message?: string };
    const texto = err.stderr || err.stdout || err.message || "";
    if (texto.includes("rejected") || texto.includes("fetch first")) {
      return NextResponse.json(
        { error: "El repositorio tiene cambios más nuevos. Corré: git pull --rebase" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: texto || "No se pudo publicar." }, { status: 500 });
  }
}
