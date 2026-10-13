# Validación de la etapa 1

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
- La descarga de WebKit también se intentó de forma independiente; sigue bloqueada por la política de red. Para ejecutar esa parte, habilitar `cdn.playwright.dev` y `playwright.download.prss.microsoft.com` en la configuración del entorno y volver a instalar WebKit. No presentar Chromium móvil como Safari ni como una prueba real de iPhone.
- La consulta de solo lectura del estado de Pages mediante `gh api` fue prohibida. El acceso de lectura Git a `origin` sí funciona; eso no prueba acceso a la API ni configuración de Pages. No se solicitó ni inventó un token.

## Límites y siguiente etapa

La base puede usarse para preferencias, demo y respaldos. Las páginas de finanzas/alimentación indican claramente que sus funciones están pendientes. No hay ingresos, gastos, compras, recetas, actividad, hábitos, nube, service worker ni funcionamiento offline implementados.

El workflow incluye Chromium y WebKit en GitHub Actions antes de publicar; su ejecución remota aún no fue observada. Elegir GitHub Actions como fuente de Pages e incorporar el código a `main` son pasos necesarios para disponer de una URL HTTPS comprobada en el iPhone.

La implementación se detiene en esta etapa. La siguiente prioridad será finanzas, con pruebas de cálculos, y luego alimentación con compra/gasto único, solamente tras nueva indicación del usuario.

## Configuración reutilizable del entorno

Se guardaron `install_script` (npm ci con caché escribible, build y pruebas) y `start_skill` (arranque, verificaciones y alcance de etapa 1), más los dominios oficiales de descarga de Playwright. Es un borrador persistido: no aplica los permisos al proceso actual ni publica el entorno. Para activarlo, revisar y guardar los cambios en ajustes del entorno, y publicar el entorno. Esto es independiente del despliegue de la aplicación en GitHub Pages.
