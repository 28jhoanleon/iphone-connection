# GitHub + Vercel · paso a paso

Objetivo: dejar de subir ZIP a mano. Cuando termines, actualizar la web va a ser
arrastrar archivos al repositorio, y Vercel republica sola en un minuto.

Todo se hace desde el navegador. No hace falta instalar nada ni usar la terminal.

---

## PARTE 1 · Crear la cuenta de GitHub (5 min)

Si ya tenés cuenta, saltá a la Parte 2.

1. Entrá a **github.com** y tocá **Sign up**.
2. Poné tu email, una contraseña y un nombre de usuario.
   El nombre de usuario va a formar parte de la URL, así que conviene algo serio:
   `iphoneconnection`, `iphoneconnection-ar` o similar. Nada de apodos.
3. Confirmá el email desde el correo que te llega.
4. Cuando pregunte el plan, elegí **Free**.

---

## PARTE 2 · Crear el repositorio (3 min)

1. Arriba a la derecha, tocá el **+** y después **New repository**.
2. Completá:
   - **Repository name:** `iphone-connection`
   - **Description:** (opcional) `Sitio web y catálogo de iPhone Connection`
   - **Public** o **Private**: elegí **Private**. El código no necesita ser público
     y Vercel funciona igual con repositorios privados.
   - **NO** marques "Add a README file". El proyecto ya trae el suyo.
3. Tocá **Create repository**.

Vas a ver una pantalla con instrucciones de terminal. Ignoralas.

---

## PARTE 3 · Subir el proyecto (10 min)

1. **Descomprimí** `iphone-connection-v1.zip` en tu computadora.
   Te queda una carpeta con `src`, `data`, `public`, `package.json`, etc.

2. **Verificá que NO exista una carpeta `node_modules`.** Si está, borrala:
   pesa cientos de megas, no hace falta subirla y Vercel la reconstruye sola.

3. En la página del repositorio, tocá el link **uploading an existing file**
   (o andá a **Add file → Upload files**).

4. **Arrastrá el CONTENIDO de la carpeta, no la carpeta.**
   Abrí la carpeta, seleccioná todo con Ctrl+A (Cmd+A en Mac) y arrastralo
   a la ventana del navegador.

   > Esto es lo que más se equivoca. Si arrastrás la carpeta entera, todo queda
   > un nivel más abajo y Vercel no va a encontrar `package.json`.
   > Tiene que verse `package.json` en la raíz del repositorio.

5. Esperá a que termine de subir. Son unos 500 archivos, tarda unos minutos.

6. Abajo, en **Commit changes**, escribí `V1 inicial` y tocá **Commit changes**.

7. Cuando termine, la pantalla del repositorio tiene que mostrar `package.json`,
   `next.config.ts`, y las carpetas `src`, `data`, `public`.

---

## PARTE 4 · Conectar Vercel (5 min)

1. Entrá a **vercel.com** y logueate.
2. Tocá **Add New… → Project**.
3. Si es la primera vez, Vercel te va a pedir permiso para ver tus repositorios:
   **Install** / **Authorize**. Podés darle acceso solo a `iphone-connection`.
4. En la lista aparece `iphone-connection`. Tocá **Import**.
5. En la pantalla de configuración:
   - **Framework Preset:** debe decir **Next.js**. Si dice otra cosa, cambialo.
   - **Root Directory:** dejalo en `./`
   - **Build Command:** dejalo vacío o `next build` (Vercel lo detecta solo)
   - **Environment Variables:** no hace falta ninguna por ahora.
6. Tocá **Deploy**.
7. Tarda entre 1 y 3 minutos. Cuando termina, te muestra la URL.

---

## PARTE 5 · Borrar el proyecto viejo

Ya tenés un proyecto de Vercel del deploy anterior. Si queda vivo, vas a tener dos
URLs distintas mostrando versiones distintas, y es un problema molesto de detectar.

1. En Vercel, entrá al proyecto viejo.
2. **Settings → General → Delete Project** (está abajo del todo).
3. Confirmá escribiendo el nombre.

---

## CÓMO ACTUALIZAR DE ACÁ EN ADELANTE

Esto es lo que cambia tu día a día.

**Para actualizar una imagen** (lo que más vas a hacer):

1. En GitHub, entrá a la carpeta `public/productos`.
2. **Add file → Upload files**, arrastrá los archivos nuevos (`A167.jpg`, etc.).
3. **Commit changes**.
4. Vercel detecta el cambio y republica sola. En 1-2 minutos está online.

No hay que avisarme, ni tocar código, ni volver a desplegar a mano.

**Para actualizar el proyecto completo** (cuando te pase una versión nueva):

1. **Add file → Upload files** desde la raíz del repositorio.
2. Arrastrá el contenido del ZIP nuevo.
3. GitHub reemplaza los archivos que cambiaron y deja el resto igual.
4. Commit y listo.

---

## PROBLEMAS FRECUENTES

**"No Next.js version detected"**
Subiste la carpeta en vez de su contenido. `package.json` tiene que estar en la
raíz del repositorio, no dentro de otra carpeta.

**El build falla con error de módulos**
Subiste `node_modules`. Borralo del repositorio: Vercel instala las dependencias
por su cuenta.

**La subida se corta o tarda muchísimo**
GitHub por navegador acepta hasta 100 archivos por tanda. Si se traba, subí en
partes: primero `src`, `data` y los archivos sueltos de la raíz, y después
`public` (que es la carpeta más pesada).

**Cambié una imagen y la web sigue mostrando la anterior**
Es caché del navegador. Probá con Ctrl+Shift+R, o abrí la URL en una ventana
de incógnito.

**El deploy dice "Ready" pero la web se ve rota**
Fijate en Vercel → Deployments → el último → pestaña **Building**. El error
aparece ahí. Pasame ese texto y lo resuelvo.

---

## DESPUÉS: EL DOMINIO

Cuando registres `iphoneconnection.com.ar`:

1. En Vercel: **Settings → Domains → Add**, escribí el dominio.
2. Vercel te muestra dos registros DNS (tipo A y CNAME).
3. Entrá al panel de NIC Argentina y cargá esos registros.
4. Tarda entre 10 minutos y algunas horas en propagarse.

Recordá que **NIC Argentina exige CUIT o CUIL** para registrar un `.com.ar`,
y que el dominio tiene que quedar a nombre de ustedes, nunca de un tercero.
