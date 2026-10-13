# Publicación inicial de Field

## Estado comprobado

- Build y TypeScript completados; Vite usa `/Field/`.
- 20 pruebas de persistencia y 10 flujos Chromium (móvil y escritorio) pasaron localmente. En GitHub Actions pasó la suite completa de Chromium y WebKit, además de instalación, typecheck, build y carga del artefacto de Pages.
- Código y workflow incorporados a `main` mediante Git, con avance directo desde el commit inicial. El push fue aceptado y se verificó el SHA remoto.
- También existe la rama `codex/field-pages-stage1`. La creación de PR con la CLI fue bloqueada por la red; no fue necesaria para incorporar el código porque Git permitió el avance directo de `main`.
- El workflow `.github/workflows/pages.yml` valida en push a `main`, instala las dependencias de los navegadores, construye `dist`, carga el artefacto, verifica la configuración de Pages y lo publica. En PR valida sin desplegar.
- No se agregaron nuevas funcionalidades para la publicación.

## Publicación confirmada

El 13 de octubre de 2026 se confirmó la publicación en **https://pedazodetopow.github.io/Field/**. GitHub devolvió esa URL con `build_type: workflow`; los jobs `validate` y `deploy` de la ejecución [38442744314](https://github.com/pedazodetopow/Field/actions/runs/38442744314) finalizaron correctamente sobre el commit `8e09fdc`.

El usuario seleccionó GitHub Actions como fuente de Pages. Codex relanzó los jobs fallidos y verificó el resultado. La respuesta pública fue HTTP 200 con verificación TLS correcta. El ícono, CSS y JavaScript también respondieron 200 y sus hashes coinciden con el build validado. La suite completa de Chromium y WebKit pasó en Actions; la prueba en un iPhone físico queda a cargo del uso real.

El navegador automatizado de Cloud no confió en el certificado del proxy del entorno. No se desactivó TLS: se verificó la publicación con curl usando el almacén de confianza del sistema y se contrastaron todos los recursos. Ese fallo local de confianza no se describe como una comprobación de interfaz pública en navegador.

No falta ninguna acción manual para abrir la aplicación. Los pasos siguientes se conservan como referencia para futuras publicaciones.

## Referencia para futuras publicaciones

1. Abrí el repositorio **pedazodetopow/Field** → **Settings** → **Pages**.
2. En **Build and deployment**, seleccioná **GitHub Actions** como **Source**. Si ya está seleccionado, dejalo así. Si no aparece la opción, necesitás permiso de administración en el repositorio; si el repositorio es privado, verificá que tu plan permita Pages o hacelo público si corresponde. No modificar visibilidad automáticamente.
3. Abrí **Actions** → **Validar y publicar Field**. Si GitHub pide habilitar Actions, habilitalo.
4. Si la ejecución de `main` ya publicó correctamente, no hace falta ejecutarla otra vez. Si falló porque Pages aún no estaba configurado, o no hay ejecución, elegí **Run workflow**, rama **main**.
5. Esperá que **validate** y **deploy** terminen en verde. Si el entorno `github-pages` requiere revisión, aprobá ese deployment desde la ejecución.
6. Abrí el enlace real que muestra el paso **Publicar** o **Settings → Pages → Visit site**. Probá que carga el inicio, que navega a ajustes y que no hay errores al guardar el nombre.

Ese mismo enlace HTTPS sirve para Safari en el iPhone. La URL no se confirma a partir del nombre del repositorio: se obtiene del despliegue terminado y se verifica al abrirla.

## Comprobación desde Codex Cloud

Se guardaron en el borrador del entorno los dominios `api.github.com` y `pedazodetopow.github.io`, preservando los destinos de Playwright. La API de GitHub y el dominio público ya son accesibles. Para descargar logs o artefactos de diagnóstico se agregaron además los destinos observados `results-receiver.actions.githubusercontent.com` y `productionresultssa12.blob.core.windows.net`; los logs siguen bloqueados en el proceso actual, por lo que el workflow expone errores en anotaciones consultables por la API. El guardado del borrador no demuestra permisos efectivos ni publicación; su activación en ajustes del entorno es independiente de habilitar Pages en GitHub. No se necesitan nuevas credenciales para el push Git que ya funcionó.

Cuando el acceso esté disponible, consultar el workflow correspondiente al HEAD de `main`, comprobar ambos jobs y usar exclusivamente la URL devuelta por Pages. Validar la respuesta pública y los recursos del build antes de declarar terminada la publicación.
