# Field · Sistema personal

Aplicación personal en español rioplatense para Uruguay. Primera etapa: base responsive, navegación, perfil mínimo, temas, IndexedDB y respaldos. Sin backend, cuentas ni sincronización.

Finanzas y alimentación son los módulos prioritarios siguientes. Sus páginas actuales explican el alcance pendiente; todavía no registran gastos, compras ni recetas. Actividad, hábitos y PWA offline quedan para después. Ver [plan](docs/PLAN.md), [reglas](AGENTS.md) y [resultados de validación](docs/VALIDACION.md).

## Probar en tu computadora

Requiere Node.js 24 LTS (mínimo 22.12) y npm.

```sh
npm ci
npm run dev
```

Abrí la dirección que muestra Vite y usá la ruta `/Field/`. Para probar el build de producción:

```sh
npm run build
npm run preview
```

El servidor de desarrollo y el preview escuchan en la red local, pero esta base requiere un contexto seguro para generar identificadores. En tu computadora, el acceso local que muestra Vite cumple ese requisito. En el iPhone usá la URL HTTPS de Pages; el acceso por IP y HTTP no es un flujo soportado. Esta etapa no funciona sin conexión ni incluye instalación PWA.

## Publicar gratis en GitHub Pages

El build está preparado para el repositorio `pedazodetopow/Field`, con base `/Field/` y navegación por hash.

1. Incorporá los cambios a la rama `main` en GitHub.
2. En el repositorio, abrí **Settings → Pages → Build and deployment → Source** y elegí **GitHub Actions**. Actions debe estar habilitado.
3. El workflow [pages.yml](.github/workflows/pages.yml) ejecuta instalación con lockfile, pruebas, typecheck, build y pruebas de navegador. Publica solamente cuando pasa la validación; los pull requests validan sin desplegar.
4. Si activaste Pages después de subir el código, ejecutá **Actions → Validar y publicar Field → Run workflow** en `main`.
5. Usá la URL que devuelve el job **Publicar**. No se considera publicada hasta que el despliegue termine y la URL devuelta responda correctamente.

En el iPhone, abrí esa URL HTTPS en Safari. El código y el workflow ya se incorporaron a `main` mediante un push de avance directo, sin forzar el historial. La publicación remota todavía no se pudo comprobar: el entorno bloquea la API y el dominio de Pages. Ver [estado de publicación y acción manual pendiente](docs/PUBLICACION.md).

Si cambiás el nombre del repositorio o publicás bajo otro path, ajustá `base` en `vite.config.ts`. Mantener el mismo origen público conserva el acceso a los datos locales; cambiar de dominio requiere trasladarlos con un respaldo.

## Datos y respaldos

- Personal y demo usan bases IndexedDB distintas: `field-personal` y `field-demo`. Ambos empiezan con preferencias; la demo agrega un nombre ficticio identificado.
- El selector de espacio vive en sessionStorage de la pestaña. Cambiarlo no copia ni elimina datos. Una nueva pestaña empieza en personal.
- En **Ajustes y respaldos**, podés guardar nombre/apodo, elegir apariencia y exportar todos los datos activos del espacio a JSON. Las copias automáticas locales no se incluyen en el archivo exportado.
- Para importar, elegí un archivo, revisá el resumen y confirmá. Un respaldo de demo solamente se importa en demo; uno personal, en personal. JSON inválido, campos desconocidos y versiones futuras se rechazan antes de modificar datos.
- Antes de importar, restaurar una copia o migrar el esquema, se conserva una copia anterior. Se retienen las cinco más recientes; podés restaurarlas desde la misma pantalla. La copia y el reemplazo se confirman en una sola transacción.
- Si otra pestaña cambió los datos, Field rechaza la escritura desactualizada y te pide recargar. No fusiona cambios automáticamente.
- El navegador puede denegar almacenamiento persistente o borrar datos locales. La solicitud de persistencia es opcional; exportá un archivo y guardalo fuera del navegador. Computadora, Safari y futuras apps instaladas pueden tener espacios diferentes: no asumir que comparten almacenamiento.
- Los respaldos no están cifrados. Conservá tus archivos privados fuera del repositorio.

El esquema de datos y el formato del respaldo están versionados por separado. La versión 0 soportada es un formato previo de desarrollo para probar migraciones; no es un importador del proyecto de referencia. La interfaz `Repository` permite sumar entidades y otro adaptador más adelante, sin implementar nube ahora.

## Pruebas

```sh
npm test
npm run build
npx playwright install --with-deps chromium webkit
npm run test:e2e
```

Las pruebas de navegador corren sobre `dist`, bajo `/Field/`; ejecutá el build primero. Playwright inicia y detiene su propio servidor de preview. Usa un perfil aislado por prueba con datos sintéticos.

En el entorno de nube actual existe Chromium del sistema. Para usarlo sin descargar otro navegador:

```sh
FIELD_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e -- --project=chromium-mobile --project=chromium-desktop --workers=2
```

Si la caché predeterminada de npm no es escribible en un entorno aislado, agregá `--cache /tmp/field-npm-cache` a `npm ci`. La descarga de navegadores necesita acceso a los dominios oficiales de Playwright; ver las limitaciones documentadas en [VALIDACION.md](docs/VALIDACION.md).

## Organización

```text
src/app/          navegación, vistas y casos de uso pequeños
src/storage/      contrato de repositorio, IndexedDB, esquema y respaldos
src/demo/         datos ficticios del espacio separado
src/styles/       tokens y estilos propios, claro/oscuro y móvil
tests/            persistencia, validación y flujos de navegador
.github/          validación y publicación en Pages
docs/             plan, decisiones y resultados reales
```

No se crean módulos ni entidades vacías por anticipado. El diseño de compra → ingredientes → costo de receta y del único gasto vinculado está documentado en el plan y se implementará en las etapas autorizadas siguientes.
