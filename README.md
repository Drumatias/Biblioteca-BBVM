# Catálogo Oficial B.B.V.M.

Catálogo de consulta para los visitantes de la **Biblioteca Benjamín Vicuña Mackenna** (Viña del Mar). Pensado para un equipo en sala: el visitante toca la pantalla, escribe lo que busca y ve dónde está el libro.

Es un sitio estático (HTML, CSS y JavaScript, sin servidor ni base de datos), listo para publicarse con **GitHub Pages**.

## Qué hace

- **Portada:** logos de la biblioteca y de la Municipalidad sobre un collage de fotos de la biblioteca en blanco y negro, que se desliza lentamente en una dirección al azar en cada carga. Un clic o cualquier tecla abre la búsqueda.
- **Búsqueda:** una sola barra. Mientras se escribe aparecen sugerencias; con **Buscar** o **Enter** se muestra la lista completa. Busca en todos los campos (título, autor, Dewey, categoría, ubicación, estado, código), sin distinguir tildes ni mayúsculas.
- **Resultados:** título con Dewey, estado, autor y ubicación (Sala › Caja) destacada.
- **Vuelta a la portada:** al tocar el logo de la biblioteca o tras 3 minutos sin uso.
- **Administración:** carga de una nueva planilla Excel, con revisión antes de publicar.

## Estructura

```
index.html                    Página principal
assets/css/estilos.css        Estilos
assets/js/app.js              Lógica (búsqueda, portada, administración, fondo)
assets/img/logo-bbvm.png      Logo de la biblioteca (versión blanca)
assets/img/logo-vina-del-mar.png
assets/img/fondo/foto-1..8.jpg  Fotos del collage (monocromo)
data/catalogo-inicial.js      Base de libros que trae el sitio
.nojekyll                     Indica a GitHub Pages que publique los archivos tal cual
```

## Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub (por ejemplo `catalogo-bbvm`).
2. Sube **todo el contenido de esta carpeta** a la raíz del repositorio, incluido el archivo oculto `.nojekyll`.
   - Desde la web: **Add file › Upload files** y arrastra los archivos y carpetas.
   - Con Git:
     ```bash
     git init
     git add .
     git commit -m "Catálogo Oficial B.B.V.M."
     git branch -M main
     git remote add origin https://github.com/USUARIO/catalogo-bbvm.git
     git push -u origin main
     ```
3. En el repositorio: **Settings › Pages › Build and deployment**. En *Source* elige **Deploy from a branch**, rama **main**, carpeta **/ (root)**, y guarda.
4. En uno o dos minutos el sitio queda en `https://USUARIO.github.io/catalogo-bbvm/`.

Para probarlo sin publicar, basta con abrir `index.html` en el navegador.

## Uso en sala

- Abre el sitio en el navegador y usa pantalla completa (**F11**).
- Para un equipo dedicado, Chrome en modo kiosco evita que se cierre o cambie de página:
  `chrome --kiosk https://USUARIO.github.io/catalogo-bbvm/`

## Administración

**Entrar:** escribe `:admin:` en la barra de búsqueda.

**Cargar una planilla nueva:**
1. Arrastra el archivo (.xlsx, .xls o .csv) o haz clic para elegirlo.
2. Revisa el resumen: libros a publicar, filas omitidas, datos faltantes y una vista previa.
3. **Publicar y reemplazar catálogo.**

La planilla publicada **se guarda solo en ese equipo** (en el navegador). Sigue ahí al recargar, pero otros equipos no la ven. **Volver a la base inicial** la descarta.

**Para que todos los equipos vean la base nueva:**
1. Publícala en Administración.
2. Pulsa **Descargar base para el sitio**; se descarga `catalogo-inicial.js`.
3. En GitHub, reemplaza `data/catalogo-inicial.js` por ese archivo (**Add file › Upload files**, con el mismo nombre y en la carpeta `data`).
4. GitHub Pages se actualiza solo en uno o dos minutos.

### Formato de la planilla

La primera fila debe tener los nombres de las columnas. Se reconocen (sin importar tildes ni mayúsculas):

| Columna | Obligatoria | Ejemplo |
|---|---|---|
| TITULO | Sí | Socialismo y Democracia |
| AUTOR | | Ignacio Walker |
| DEWEY | | 321.74 |
| CATEGORIA | | Ensayo |
| UBICACIÓN | | CAJA Nº1,SALA 506-A |
| ESTADO | | Disponible |
| IDENTIFICACION | | BBVM-0001 |
| AÑO, EDICION, EDITORIAL | | |

Otras columnas también se muestran en los resultados. En Administración se puede descargar una plantilla de ejemplo.

## Personalización

| Qué | Dónde |
|---|---|
| Velocidad del fondo | `assets/js/app.js`, `SPEED` (píxeles por segundo, hoy 8) |
| Código de administración | `assets/js/app.js`, `ADMIN_CODE` |
| Tiempo para volver a la portada | `assets/js/app.js`, `IDLE_MS` (hoy 3 minutos) |
| Color de fondo | `assets/css/estilos.css`, `--bg` |
| Opacidad del velo sobre las fotos | `assets/css/estilos.css`, `.collage::after` |
| Fotos del collage | Reemplaza `assets/img/fondo/foto-1.jpg` a `foto-8.jpg` (idealmente en blanco y negro, horizontales) |

## Importante

- **El código `:admin:` oculta el acceso, pero no lo protege.** Quien lo conozca, o agregue `#/admin` a la dirección, puede entrar. Como la carga solo afecta al equipo donde se hace, el riesgo es acotado; una versión con varios equipos necesitará un acceso con contraseña y un servidor.
- **Los datos del repositorio son públicos** si el repositorio lo es: cualquiera puede ver `data/catalogo-inicial.js`.
- **Requiere internet** para las tipografías (Google Fonts) y para leer planillas Excel (SheetJS desde cdnjs). La búsqueda funciona aunque esas fuentes no carguen.
- Respeta la preferencia del sistema de **reducir movimiento**: el fondo queda quieto.
