# Skills y referencia de Field

Comprobación realizada el 13 de octubre de 2026, dentro de Codex Cloud.

## Disponibilidad real

- Catálogo Cloud: `cloud-environment-onboarding:setup`. Catálogo executor: vacío.
- Skills locales incorporadas al entorno: documentos, PDF, presentaciones y planillas. No había skills de frontend, diseño ni navegador anunciadas en esta sesión.
- Navegador existente y comprobado: `@playwright/test` 1.64.0 y Chromium de `/usr/bin/chromium`. El plugin Browser y `js_repl` no están disponibles como herramientas de la sesión.

## Intento de habilitar frontend-skill

Se consultó la documentación oficial `https://developers.openai.com/codex/skills/`; la política de red respondió HTTP 403. Se pudo leer la documentación oficial distribuida por Git:

- [openai/skills](https://github.com/openai/skills), revisión `49f948faa9258a0c61caceaf225e179651397431`: el README indica que el catálogo está deprecado y remite a `openai/plugins`.
- [openai/plugins](https://github.com/openai/plugins), revisión `0722921d5542fc593105c27bd52630babd8b8c2a`: el plugin `build-web-apps` ofrece `frontend-app-builder` y `frontend-testing-debugging`.
- La búsqueda en ambos catálogos y la búsqueda de código de la organización OpenAI no encontraron una skill con el nombre exacto `frontend-skill`. No se instaló un paquete homónimo de terceros ni se afirmó habilitar una capacidad inexistente.

Se revisó `frontend-app-builder`: sus principios de jerarquía, tokens, densidad, estados, fidelidad y revisión de capturas son aplicables. Su flujo de conceptos generados por imagen no se instaló: esta tarea tiene una referencia funcional concreta y pide ejecutar directamente una herramienta financiera. Se conservaron TypeScript y CSS propios.

`playwright-interactive` exige `js_repl`, reiniciar la sesión y, en la versión consultada, desactivar el sandbox. No es compatible con las capacidades actuales sin cambiar el entorno; no se instaló. La skill CLI de Playwright tampoco es necesaria para duplicar el navegador ya disponible.

## Skills locales habilitadas por instrucciones

- [field-finance](../.agents/skills/field-finance/SKILL.md): skill propia, creada para diseño, cálculos, fijos, metas, migraciones y pruebas. No contiene código del proyecto de referencia.
- [frontend-testing-debugging](../.agents/skills/frontend-testing-debugging/SKILL.md): instrucciones oficiales de `openai/plugins/plugins/build-web-apps/skills/frontend-testing-debugging/SKILL.md`, revisión indicada arriba. Compatible: su ruta explícita cuando falta Browser usa el Playwright del repositorio. No requiere MCP, servicios, claves ni dependencias nuevas.

Ambas están en `.agents/skills` y enlazadas desde AGENTS.md. Se leyeron y aplicaron en esta tarea; su aparición automática en el catálogo de una sesión futura depende del descubrimiento de skills del cliente. No se afirma que guardar archivos instale un plugin en la cuenta de Codex.

## Estudio de Proyecto Ahorros

Repositorio `Agusgodmode1/proyecto-ahorros`, revisión `e05a466dc79ac4a88a0ea52c08ac81a790497c10`. No declara una licencia en su árbol raíz ni package.json. Se estudió y renderizó una copia local con su demo en perfiles de navegador aislados; no se trasladó código, CSS, íconos ni assets a Field.

Se revisaron `js/logica/plan.js`, `metas.js`, `js/ui/plan.js`, `gastos.js`, `fijos.js`, `metas.js`, `index.html` y `css/app.css`. Sus patrones trasladados mediante implementación propia son:

| Evidencia de referencia | Resultado en Field |
| --- | --- |
| Importe diario grande y cuenta regresiva | Inicio destaca hoy, saldo semanal y días hasta cobrar |
| Formulario de gasto en Plan | Formulario directo en Inicio, con foco restaurado y deshacer |
| Recibo saldo − fijos − ahorro | Recibo verificable y reserva de pendientes sin duplicar pagos |
| Semanas con arrastre y detalle | Reparto exacto de centésimos, déficit visible y semanas futuras rotuladas |
| Fijos por día mensual | Vencimientos por fecha, meses cortos y pago único ligado a movimiento |
| Metas separadas y escenario al cobrar | Metas propias y proyección con supuestos editables, sin ingresos ficticios |

La comparación visual se hizo contra el render local de la referencia a 390 y 1440 px, no contra su sitio remoto (bloqueado por la red). Desviaciones intencionales: Field conserva navegación y Cocina existente, excluye voz/BROU/salarios/logros, usa recibo lateral en escritorio y prioriza gasto rápido antes del recibo en móvil. No se copiaron paleta, tipografía ni markup.
