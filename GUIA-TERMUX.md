# Termux · publicar y actualizar iPhone Connection desde el celular

Con esto dejás de pelear con la subida por navegador. La instalación lleva unos
20 minutos una sola vez. Después, actualizar la web es **un comando**.

Todos los comandos se escriben tal cual y se termina con Enter.

---

## PASO 0 · Instalar Termux (importante)

**No lo instales desde Play Store.** Esa versión está abandonada desde 2020 y falla.

1. Entrá desde el celular a **f-droid.org/packages/com.termux/**
2. Descargá el APK y instalalo.
   Android va a pedir permiso para "instalar apps desconocidas": aceptalo.
3. Abrí Termux. Vas a ver una pantalla negra con un cursor. Eso es todo.

---

## PASO 1 · Preparar Termux (5 min)

Copiá y pegá cada bloque, uno por vez.

```bash
pkg update -y && pkg upgrade -y
```

Si pregunta algo, contestá `y` y Enter.

```bash
pkg install -y git openssh unzip nano
```

```bash
termux-setup-storage
```

Android va a mostrar un cartel pidiendo permiso de archivos. **Aceptá.**
Esto crea la carpeta `~/storage/shared`, que es la memoria del teléfono.

Verificá que funcionó:

```bash
ls ~/storage/shared/Download
```

Tenés que ver la lista de tus descargas. Ahí va a estar el ZIP.

---

## PASO 2 · Configurar tu identidad en git (1 min)

Poné tu nombre y tu email real (el mismo de GitHub):

```bash
git config --global user.name "Jhoan"
git config --global user.email "tuemail@ejemplo.com"
```

```bash
git config --global init.defaultBranch main
```

---

## PASO 3 · Crear la llave para conectarte a GitHub (5 min)

Esto reemplaza la contraseña. Se hace una sola vez.

```bash
ssh-keygen -t ed25519 -C "iphone-connection"
```

Te va a preguntar tres cosas. **Apretá Enter en las tres** (ubicación por defecto
y sin contraseña).

Ahora mostrá la llave pública:

```bash
cat ~/.ssh/id_ed25519.pub
```

Aparece una línea larga que empieza con `ssh-ed25519`. **Mantené el dedo apretado
sobre el texto para seleccionarlo y copialo entero.**

Después, en el navegador:

1. Entrá a **github.com** → tu foto arriba a la derecha → **Settings**
2. En el menú de la izquierda: **SSH and GPG keys**
3. **New SSH key**
4. **Title:** `Celular Termux`
5. **Key:** pegá la línea que copiaste
6. **Add SSH key**

Volvé a Termux y probá la conexión:

```bash
ssh -T git@github.com
```

La primera vez pregunta `Are you sure...?` → escribí `yes` y Enter.

Si responde **"Hi TUUSUARIO! You've successfully authenticated"**, está listo.

---

## PASO 4 · Crear el repositorio en GitHub (3 min)

Desde el navegador:

1. github.com → botón **+** arriba a la derecha → **New repository**
2. **Repository name:** `iphone-connection`
3. Elegí **Private**
4. **NO** marques "Add a README file"
5. **Create repository**

---

## PASO 5 · Subir el proyecto (5 min)

En Termux:

```bash
cd ~
mkdir -p proyecto && cd proyecto
unzip -o ~/storage/shared/Download/iphone-connection-v1.zip
```

Si el archivo tiene otro nombre, fijate cómo se llama con:
`ls ~/storage/shared/Download | grep zip`

Comprobá que quedó bien:

```bash
ls
```

Tenés que ver `package.json`, `next.config.ts`, `src`, `data`, `public`.
Si en cambio ves una sola carpeta, entrá a ella con `cd nombre-de-la-carpeta`.

Por las dudas, sacá `node_modules` si vino incluido:

```bash
rm -rf node_modules .next out
```

Ahora inicializá y subí. **Cambiá `TUUSUARIO` por tu usuario de GitHub:**

```bash
git init
git add -A
git commit -m "V1 inicial"
git branch -M main
git remote add origin git@github.com:TUUSUARIO/iphone-connection.git
git push -u origin main
```

Tarda un par de minutos. Cuando termina, recargá la página del repositorio en el
navegador y vas a ver todos los archivos.

---

## PASO 6 · Conectar Vercel (5 min)

Desde el navegador:

1. **vercel.com** → **Add New… → Project**
2. Autorizá el acceso a GitHub si lo pide (podés darle acceso solo a este repo)
3. Buscá `iphone-connection` → **Import**
4. **Framework Preset** debe decir **Next.js**. Root Directory: `./`
5. **Deploy**

En 1 a 3 minutos tenés la URL.

**Después borrá el proyecto viejo de Vercel:** Settings → General → Delete Project.
Si queda vivo vas a tener dos URLs con versiones distintas.

---

## EL DÍA A DÍA · esto es lo que gana

### Actualizar imágenes

Guardás las fotos en Descargas del celular con el nombre de la referencia
(`A167.jpg`, `A253.jpg`, etc.) y corrés:

```bash
cd ~/proyecto
cp ~/storage/shared/Download/A*.jpg public/productos/
git add -A && git commit -m "imagenes nuevas" && git push
```

Vercel republica sola. En un minuto está online.

### Un solo comando

Para no escribir todo eso cada vez, creá un atajo:

```bash
echo '
subir() {
  cd ~/proyecto
  cp ~/storage/shared/Download/A*.jpg public/productos/ 2>/dev/null
  cp ~/storage/shared/Download/A*.webp public/productos/ 2>/dev/null
  cp ~/storage/shared/Download/A*.png public/productos/ 2>/dev/null
  git add -A
  git commit -m "actualizacion $(date +%d/%m)" && git push
  echo "Listo. Vercel republica en ~1 minuto."
}' >> ~/.bashrc
source ~/.bashrc
```

A partir de ahí, poner imágenes nuevas online es escribir:

```bash
subir
```

### Actualizar el proyecto cuando te paso una versión nueva

```bash
cd ~/proyecto
unzip -o ~/storage/shared/Download/iphone-connection-v1.zip
git add -A && git commit -m "version nueva" && git push
```

El `-o` sobrescribe lo que cambió y deja el resto igual. **Tus imágenes en
`public/productos` no se pierden**, porque el ZIP también las trae.

---

## OPCIONAL · correr los scripts en el celular

Si querés reimportar la planilla o regenerar imágenes sin pasar por mí:

```bash
pkg install -y python
pip install pillow numpy
cd ~/proyecto
python scripts/importar-planilla.py
python scripts/generar-productos.py
```

`scipy` y `cairosvg` no compilan bien en Termux, así que el segmentador de láminas
seguí mandándomelo a mí. Lo demás corre sin problema.

---

## PROBLEMAS FRECUENTES

**`Permission denied (publickey)`**
La llave no quedó cargada en GitHub. Repetí el Paso 3 y fijate de haber copiado
la línea completa, desde `ssh-ed25519` hasta el final.

**`unzip: cannot find or open`**
El nombre del archivo no coincide. Listá las descargas con
`ls ~/storage/shared/Download` y usá el nombre exacto.

**`fatal: not a git repository`**
Te olvidaste de entrar a la carpeta. Escribí `cd ~/proyecto` y reintentá.

**`remote origin already exists`**
Ya lo habías configurado. Corregilo con:
`git remote set-url origin git@github.com:TUUSUARIO/iphone-connection.git`

**El push queda colgado o muy lento**
Es normal la primera vez: son unos 500 archivos y varios MB de imágenes.
Dejalo terminar sin cerrar Termux.

**Termux se cierra solo al minimizarlo**
Android lo mata para ahorrar batería. En Ajustes → Aplicaciones → Termux →
Batería, poné "Sin restricciones".

---

## LO QUE NO CAMBIA

El mecanismo de imágenes sigue igual: un archivo llamado `A167.jpg` dentro de
`public/productos` reemplaza automáticamente a la imagen generada. Termux solo
cambia **cómo** llega ese archivo al servidor, no cómo funciona el sistema.

---

## Auditoría visual del sitio publicado

Recorre todo el sitio con un navegador real, saca captura de cada pantalla y arma
hojas de contacto para revisar el catálogo entero de un vistazo.

**Primera vez** (descarga el navegador, ~150 MB):

```bash
cd ~/proyecto
npm i
npx playwright install chromium
```

**Cada vez que quieras revisar:**

```bash
cd ~/proyecto && npm run audit:visual
```

Tarda entre 5 y 10 minutos para las 417 pantallas. Al terminar deja:

```
auditoria-visual/hojas/     hojas de contacto (25 pantallas cada una)
auditoria-visual.zip        todo empaquetado
```

Para verlas desde la galería del celular:

```bash
cp -r ~/proyecto/auditoria-visual/hojas ~/storage/shared/Pictures/auditoria
```

**Variantes útiles:**

```bash
npm run audit:visual -- --solo=fichas      # sólo fichas de producto
npm run audit:visual -- --solo=catalogo    # sólo las 8 categorías
npm run audit:visual -- --limite=40        # prueba rápida
npm run audit:visual -- --local            # contra localhost:3000
```

Si Termux se queda sin memoria con las 417 pantallas, corré por partes con `--solo`.

**Nota:** las capturas son artefactos de revisión, no van al repositorio.
Ya están en `.gitignore`.
