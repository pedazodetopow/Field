# Validación de Field

## Rediseño funcional — 13 de octubre de 2026

- TypeScript estricto y build de producción: completados.
- `npm test`: 38 pruebas de dominio y persistencia pasaron, sin fallos ni omitidas.
- Chromium local móvil/escritorio: 22 flujos pasaron, sin fallos ni omitidos. Incluyen CRUD financiero y de cocina, compras con varias líneas sin duplicar gasto, consumo de porciones, períodos guardados, respaldo completo, errores de importación, migración del esquema publicado y temas.
- Composición: capturas revisadas en 390 px y 1440 px, claras y oscuras, con Inicio, Finanzas, Cocina y formulario de compra con varias líneas. Playwright también comprobó 390/400/1280 px y diálogo sin desborde.
- La primera corrida detectó etiquetas de selectores ambiguas y reimportación del mismo archivo tras cancelar. Se corrigieron nombres accesibles y limpieza del input; las pruebas afectadas y la suite completa pasaron después.
- El ejemplo requerido pasó: 400 g de pollo a $ 350/kg = $ 140; cuatro porciones = $ 35 cada una. Los ingresos, ahorro, semanas parciales, déficits, centésimos y cambios de período tienen pruebas.
- Se conservó el test significativo de falta de espacio: una escritura abortada no guarda un reemplazo ni una copia parcial. La migración 1→2 también fue ejercitada en IndexedDB real del navegador.
- GitHub Actions ejecutó la suite completa: **38 pruebas unitarias y 33 flujos Playwright pasaron** (Chromium móvil, Chromium escritorio y WebKit móvil), sin omitidos. Validate y deploy terminaron en success en la ejecución 38449526421, commit 95e3532.
- La nueva versión pública respondió HTTP 200 con TLS válido; HTML, CSS, JS e ícono coinciden por SHA-256 con dist. No se afirma una prueba física en iPhone ni una comprobación dinámica pública en el navegador de Cloud con su CA de proxy. Los flujos de interfaz completos sí se ejecutaron en Actions.
- Se guardaron instrucciones de arranque actualizadas en el borrador del entorno Cloud para reemplazar el alcance antiguo de etapa 1. Ese borrador se revisa y publica en ajustes del entorno; es independiente del sitio de Pages, que ya quedó desplegado.

## Historial: etapa 1

Fecha: 13 de octubre de 2026. Alcance: estructura, navegación, tema, persistencia, demo separada, respaldos y preparación de GitHub Pages.

## Resultados de Field

| Comprobación                          | Resultado                                                                                  |
| ------------------------------------- | ------------------------------------------------------------------------------------------ |
| `npm ci --cache /tmp/field-npm-cache` | Instalación reproducible usando el lockfile; caché escribible fuera de HOME                |
| `npm run build`                       | TypeScript estricto y build de producción completados                                      |
| `npm test`                            | 20 pruebas de validación, respaldos y repositorio IndexedDB pasaron                        |
| Chromium escritorio y móvil           | 10 flujos Playwright pasaron usando Chromium 154 del sistema                               |
| Subruta `/Field/`                     | Preview respondió; HTML, CSS, JS e ícono usan la base correcta; navegación hash verificada |
| Revisión visual                       | Capturas de inicio en 1440 px y 390 px revisadas; no se observó desborde                   |
| WebKit                                | No ejecutado: descarga bloqueada por la política de red del entorno                        |
| iPhone físico                         | No ejecutado; pendiente Safari, descarga a Archivos y teclado real                         |
| GitHub Pages remoto                   | Build y workflow preparados; no se realizó push ni despliegue remoto                       |

Las pruebas de referencia mencionadas en PLAN.md son independientes: no se suman a los resultados de Field.

## Qué se verificó

- Creación del espacio personal vacío y guardado de perfil/tema al reabrir IndexedDB.
- Demo en una base física distinta; editarla y recargar no altera personal.
- Exportar e importar todos los campos del esquema actual; un archivo real descargado por el navegador se usa para restaurar.
- Validación y rechazo de JSON inválido, campos incompatibles, nombres demasiado largos, tipos incorrectos, formato de otro espacio y esquema futuro.
- Migración conocida con preservación de identidad y copia del documento anterior.
- Copia previa y reemplazo atómicos; cinco copias recientes, incluso con reemplazos en el mismo milisegundo.
- Recuperación de una copia automática, con una nueva copia de seguridad antes de restaurar.
- Conflictos por revisión y escrituras simultáneas: una escritura desactualizada se rechaza sin reemplazar datos.
- Fallo de escritura simulado por falta de espacio: ni el reemplazo ni la copia parcial quedan confirmados.
- Navegación entre Inicio, Finanzas, Alimentación y Ajustes bajo la base de Pages.
- Claro, oscuro y tema del sistema; preferencias conservadas al recargar.
- Cancelación antes de importar, y texto de usuario renderizado como texto, sin ejecutar HTML.
- Ausencia de desborde horizontal en inicio y ajustes a 390 px y escritorio.

Comando de navegador utilizado:

```sh
FIELD_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e -- --project=chromium-mobile --project=chromium-desktop --workers=2
```

Las pruebas unitarias usan fake-indexeddb para errores y concurrencia controlados; los flujos Playwright también ejercitan IndexedDB real en Chromium. No hay cálculos financieros implementados todavía, por lo tanto no hay resultados de pruebas financieras que reportar.

## Problemas encontrados y tratamiento

- La caché npm predeterminada de este entorno no era escribible. Se usó `/tmp/field-npm-cache`; no se cambió HOME ni se desactivó verificación de paquetes.
- La primera comprobación TypeScript detectó una colisión entre el nombre del documento persistido y el DOM, y una comprobación de API incorrecta. Se corrigieron antes del build final.
- La descarga de Chromium de Playwright devolvió HTTP 403 `Domain forbidden` en `cdn.playwright.dev`. Se utilizó Chromium ya instalado, manteniendo verificación y sin descargar artefactos de terceros.
- En el intento inicial la descarga de WebKit fue bloqueada. En el intento de publicación se descargó WebKit 27.2, pero faltan GTK4, Graphene, HarfBuzz ICU, Manette, Hyphen y GLES. El instalador oficial requiere privilegios que este entorno no dispone; no se solicitaron contraseñas. Los cinco casos de WebKit fallaron en el lanzamiento, antes de ejecutar sus verificaciones. GitHub Actions instala las dependencias oficiales en Ubuntu con `playwright install --with-deps`. No presentar Chromium móvil como Safari ni como una prueba real de iPhone.
- La consulta de solo lectura del estado de Pages mediante `gh api` fue prohibida. El acceso de lectura Git a `origin` sí funciona; eso no prueba acceso a la API ni configuración de Pages. No se solicitó ni inventó un token.

## Límites y siguiente etapa

La base puede usarse para preferencias, demo y respaldos. Las páginas de finanzas/alimentación indican claramente que sus funciones están pendientes. No hay ingresos, gastos, compras, recetas, actividad, hábitos, nube, service worker ni funcionamiento offline implementados.

El workflow incluye Chromium y WebKit en GitHub Actions antes de publicar; su ejecución remota aún no fue observada. Elegir GitHub Actions como fuente de Pages e incorporar el código a `main` son pasos necesarios para disponer de una URL HTTPS comprobada en el iPhone.

La implementación se detiene en esta etapa. La siguiente prioridad será finanzas, con pruebas de cálculos, y luego alimentación con compra/gasto único, solamente tras nueva indicación del usuario.

## Configuración reutilizable del entorno

Se guardaron `install_script` (npm ci con caché escribible, build y pruebas) y `start_skill` (arranque, verificaciones y alcance de etapa 1), más los dominios oficiales de descarga de Playwright. Es un borrador persistido: no aplica los permisos al proceso actual ni publica el entorno. Para activarlo, revisar y guardar los cambios en ajustes del entorno, y publicar el entorno. Esto es independiente del despliegue de la aplicación en GitHub Pages.

## Comprobación remota tras hacer público el repositorio

GitHub Actions ejecutó correctamente instalación con lockfile, las pruebas unitarias, typecheck, build, instalación de navegadores y la suite completa de Chromium/WebKit en la ejecución 38442343231 (commit 1f78070). Se cargó el artefacto dist. El job deploy falló solamente al consultar una configuración de Pages inexistente.

En una ejecución anterior WebKit detectó que el tema del sistema no actualizaba al volver a claro. Se conservó una referencia estable a MediaQueryList en la aplicación y la misma prueba pasó en la ejecución siguiente; no se omitieron ni relajaron verificaciones. El instalador y WebKit funcionan en Actions aunque falten bibliotecas locales. La prueba en iPhone físico sigue pendiente.

El repositorio público no activa Pages automáticamente. La API de activación rechazó la integración con 403; falta seleccionar GitHub Actions como fuente de Pages y volver a ejecutar el workflow. Ver PUBLICACION.md.

## Publicación pública confirmada

Después de que el usuario seleccionó GitHub Actions como fuente de Pages, se relanzó la ejecución 38442744314. Los jobs validate y deploy terminaron en success. GitHub devolvió https://pedazodetopow.github.io/Field/; se comprobó respuesta HTTP 200, TLS válido y coincidencia SHA-256 del ícono, CSS y JS públicos con dist. No se inventó la URL ni se desactivó la validación de certificados.

El navegador automatizado de Cloud rechazó el certificado del proxy, de modo que esa comprobación dinámica pública no se completó. Las pruebas de interfaz completas pasaron en Actions y los recursos públicos corresponden al build probado. Safari en un iPhone físico aún no fue probado.
