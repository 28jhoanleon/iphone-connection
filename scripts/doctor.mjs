/**
 * Diagnóstico del entorno.
 *
 * Detecta la plataforma y avisa qué falta para trabajar en el proyecto.
 * Pensado para que la misma instrucción sirva en Termux, Linux, macOS y Windows.
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { platform, arch, version } from "node:process";

const esTermux = existsSync("/data/data/com.termux") || Boolean(process.env.TERMUX_VERSION);
const SO = esTermux ? "Android · Termux" : { linux: "Linux", darwin: "macOS", win32: "Windows" }[platform] ?? platform;

const hay = (cmd) => {
  try {
    execSync(platform === "win32" ? `where ${cmd}` : `command -v ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

const ver = (cmd) => {
  try {
    return execSync(`${cmd} --version`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim().split("\n")[0];
  } catch {
    return null;
  }
};

const INSTALAR = {
  "Android · Termux": { python: "pkg install python", git: "pkg install git", zip: "pkg install zip" },
  Linux: { python: "sudo apt install python3", git: "sudo apt install git", zip: "sudo apt install zip" },
  macOS: { python: "brew install python", git: "xcode-select --install", zip: "ya viene instalado" },
  Windows: { python: "winget install Python.Python.3", git: "winget install Git.Git", zip: "usá el Explorador" },
};

console.log(`\nEntorno: ${SO} · ${arch} · Node ${version}\n`);

const py = ["python3", "python"].find(hay);
const filas = [
  ["Node", true, ver("node")],
  ["npm", hay("npm"), ver("npm")],
  ["git", hay("git"), ver("git")],
  ["Python", Boolean(py), py ? ver(py) : null],
  ["Pillow", py ? (() => { try { execSync(`${py} -c "import PIL"`, { stdio: "ignore" }); return true; } catch { return false; } })() : false, "para generar imágenes"],
  ["numpy", py ? (() => { try { execSync(`${py} -c "import numpy"`, { stdio: "ignore" }); return true; } catch { return false; } })() : false, "para validar imágenes"],
];

let faltan = 0;
for (const [nombre, ok, detalle] of filas) {
  console.log(`  ${ok ? "✓" : "✗"} ${nombre.padEnd(9)} ${ok ? (detalle ?? "") : "FALTA"}`);
  if (!ok) faltan++;
}

if (faltan) {
  console.log(`\n  Para instalar lo que falta en ${SO}:`);
  const guia = INSTALAR[SO] ?? INSTALAR.Linux;
  if (!py) console.log(`    ${guia.python}`);
  if (py) console.log(`    ${py} -m pip install pillow numpy scipy`);
  if (!hay("git")) console.log(`    ${guia.git}`);
}

console.log(`
  Node y npm alcanzan para: npm run build, dev, limpiar, verificar-imagenes.
  Python hace falta sólo para reprocesar la planilla y regenerar imágenes.
  La auditoría visual se abre en /auditoria desde cualquier navegador: no necesita nada.
`);
process.exit(0);
