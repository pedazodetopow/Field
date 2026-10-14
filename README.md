# Field

Field es una aplicación financiera personal instalable en el iPhone. Permite organizar el dinero hasta el próximo sueldo, registrar gastos y horas extra, controlar gastos fijos y tarjeta, estimar sueldo y aguinaldo, administrar metas y exportar o importar un respaldo completo.

La aplicación funciona como una PWA estática: HTML, CSS y JavaScript sin dependencias de producción. Los datos se guardan localmente en IndexedDB y puede seguir funcionando sin conexión después de la primera carga.

## Abrir e instalar

La versión pública se publica mediante GitHub Pages en:

<https://pedazodetopow.github.io/Field/>

En iPhone, abrí ese enlace en Safari, tocá **Compartir** y elegí **Agregar a pantalla de inicio**.

La primera pantalla permite:

- crear un perfil propio;
- importar un respaldo compatible;
- recorrer la aplicación con datos de ejemplo.

Los datos de ejemplo se cargan solamente cuando se elige esa opción. Los perfiles y respaldos personales permanecen en el dispositivo.

## Respaldo y compatibilidad

Desde **Ajustes y respaldo** se puede exportar toda la información a un archivo `field-AAAA-MM-DD.json`, importarla y recuperar copias automáticas recientes.

Field conserva internamente el identificador `proyecto-ahorros` y el esquema de almacenamiento original. Esto mantiene la compatibilidad con respaldos creados por Proyecto Ahorros y evita migraciones innecesarias. La sincronización remota sigue desactivada mientras `js/config.js` no tenga una instancia configurada.

## Desarrollo

Requiere Node.js 20 o posterior. No hay dependencias que instalar.

```bash
npm test
```

Para abrirla localmente con la misma subruta de GitHub Pages:

```bash
cd /workspace
python3 -m http.server 4173 --bind 127.0.0.1
```

Luego usá `http://127.0.0.1:4173/Field/` para las pruebas internas. Los módulos no funcionan correctamente al abrir `index.html` directamente como archivo.

Cada cambio de la aplicación debe incrementar la misma versión en `sw.js` y `js/version.js`. El service worker controla las actualizaciones y mantiene disponibles sin conexión todos los archivos enumerados en `ARCHIVOS`.

## Publicación

El workflow `.github/workflows/pages.yml` ejecuta las pruebas y publica la aplicación estática cuando cambia `main`. GitHub Pages debe usar **GitHub Actions** como fuente.

## Procedencia

Esta versión parte del contenido completo de [`Agusgodmode1/proyecto-ahorros`](https://github.com/Agusgodmode1/proyecto-ahorros) en la revisión `e05a466dc79ac4a88a0ea52c08ac81a790497c10`. La reutilización para Field fue confirmada por el propietario de este repositorio con autorización del autor original. El commit de importación se mantiene separado para conservar una procedencia clara; las adaptaciones posteriores pertenecen a Field.
