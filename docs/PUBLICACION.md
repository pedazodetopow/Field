# Publicación inicial de Field

## Estado comprobado

- Build y TypeScript completados; Vite usa `/Field/`.
- 20 pruebas de persistencia y 10 flujos Chromium (móvil y escritorio) pasaron en la revisión de publicación.
- Código y workflow incorporados a `main` mediante Git, con avance directo desde el commit inicial. El push fue aceptado y se verificó el SHA remoto.
- También existe la rama `codex/field-pages-stage1`. La creación de PR con la CLI fue bloqueada por la red; no fue necesaria para incorporar el código porque Git permitió el avance directo de `main`.
- El workflow `.github/workflows/pages.yml` valida en push a `main`, instala las dependencias de los navegadores, construye `dist`, carga el artefacto, verifica la configuración de Pages y lo publica. En PR valida sin desplegar.
- No se agregaron nuevas funcionalidades para la publicación.

No se ha confirmado una URL pública funcionando. La API `api.github.com` está bloqueada para este proceso y el intento de consultar el dominio de Pages recibió 403 de la política de red. Eso no prueba que la aplicación esté publicada ni que esté caída. El acceso Git permitió los pushes, pero no permite consultar la ejecución de Actions.

## Acción manual en GitHub

1. Abrí el repositorio **pedazodetopow/Field** → **Settings** → **Pages**.
2. En **Build and deployment**, seleccioná **GitHub Actions** como **Source**. Si ya está seleccionado, dejalo así. Si no aparece la opción, necesitás permiso de administración en el repositorio; si el repositorio es privado, verificá que tu plan permita Pages o hacelo público si corresponde. No modificar visibilidad automáticamente.
3. Abrí **Actions** → **Validar y publicar Field**. Si GitHub pide habilitar Actions, habilitalo.
4. Si la ejecución de `main` ya publicó correctamente, no hace falta ejecutarla otra vez. Si falló porque Pages aún no estaba configurado, o no hay ejecución, elegí **Run workflow**, rama **main**.
5. Esperá que **validate** y **deploy** terminen en verde. Si el entorno `github-pages` requiere revisión, aprobá ese deployment desde la ejecución.
6. Abrí el enlace real que muestra el paso **Publicar** o **Settings → Pages → Visit site**. Probá que carga el inicio, que navega a ajustes y que no hay errores al guardar el nombre.

Ese mismo enlace HTTPS sirve para Safari en el iPhone. La URL no se confirma a partir del nombre del repositorio: se obtiene del despliegue terminado y se verifica al abrirla.

## Comprobación desde Codex Cloud

Se guardaron en el borrador del entorno los dominios `api.github.com` y `pedazodetopow.github.io`, preservando los destinos de Playwright. El guardado del borrador no cambia los permisos de red del proceso actual. Para que Codex pueda consultar Actions y comprobar el sitio, revisar y guardar ese borrador en los ajustes del entorno y publicar el entorno; eso es independiente de activar Pages en GitHub. No se necesitan nuevas credenciales para el push Git que ya funcionó.

Cuando el acceso esté disponible, consultar el workflow correspondiente al HEAD de `main`, comprobar ambos jobs y usar exclusivamente la URL devuelta por Pages. Validar la respuesta pública y los recursos del build antes de declarar terminada la publicación.
