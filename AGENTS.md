# Reglas de mantenimiento de Field

## Alcance y forma de trabajo

- Alcance vigente: foco exclusivo en Inicio, Finanzas y su experiencia visual. Cocina, ejercicio y hábitos pausados; conservar datos y flujos de Cocina. Autorizadas implementación, pruebas y publicación de este rediseño financiero.
- Para cambios de finanzas aplicar `.agents/skills/field-finance/SKILL.md` y para navegador `.agents/skills/frontend-testing-debugging/SKILL.md`.

- Producto: herramienta personal para Uruguay, en español rioplatense, con finanzas, alimentación, actividad y hábitos.
- Evitar pantallas de próximamente, frases promocionales y navegación sin funciones. Hábitos y ejercicio siguen en la visión, con navegación oculta hasta implementarlos.
- No borrar datos existentes. Migrar el esquema publicado y conservar copias previas; mantener importación/exportación y demo en una base físicamente separada.
- Prioridad actual exclusiva: Finanzas y su experiencia visual. Conservar alimentación sin ampliarla.
- Conservar GitHub Pages y la base /Field/ y documentar acceso por navegador e iPhone. Ejecutar pruebas y registrar resultados en `docs/VALIDACION.md` al cerrar cada etapa.
- Implementar solo el alcance aprobado. Las funcionalidades futuras no son requisitos del MVP.
- Usar el checkout existente: las tareas en la nube ya están aisladas. No crear worktrees salvo pedido explícito.
- Inspeccionar y preservar cambios existentes. No incluir información personal, credenciales ni respaldos reales en el repositorio, fixtures, capturas o logs.

## Arquitectura

- Separar dominio y cálculos puros, casos de uso, persistencia e interfaz. Los cálculos no deben depender del DOM ni de IndexedDB.
- Organizar módulos a medida que se implementan; no crear capas vacías por anticipado. Compartir identificadores y referencias. Diseñar compras con líneas vinculadas a ingredientes y un único gasto por purchaseId; compra y gasto deberán guardarse atómicamente. Editar un precio o una receta no implica una compra.
- No implementar nube todavía. Usar IDs estables y un contrato de repositorio para permitir agregar sincronización después, sin construir ahora un motor de conflictos remoto.
- Acceder a los datos mediante una interfaz de repositorio. No acceder a IndexedDB directamente desde componentes visuales.
- Mantener los valores derivados como cálculos; persistir solamente datos fuente y snapshots históricos que tengan una razón documentada.
- Evitar dependencias innecesarias y servicios pagos. Documentar la razón de nuevas dependencias.

## Cálculos y validación

- Representar dinero en centésimos enteros de UYU; validar límites seguros. Nunca calcular dinero a partir de cadenas formateadas.
- Mostrar moneda como `$ 40.000`, con decimales cuando correspondan. Usar fechas civiles `YYYY-MM-DD` y `America/Montevideo` para determinar el día actual.
- Documentar límites de períodos, inclusión del día de cobro, redondeos y arrastre semanal. No ocultar saldos negativos ni simular nuevos ingresos.
- Ingredientes: distinguir masa, volumen y unidades. No convertir entre dimensiones sin información explícita. Validar cantidades y porciones positivas.
- Toda modificación de cálculos importantes debe incluir pruebas de comportamiento y casos límite: centésimos, períodos parciales, fechas de cobro, saldo negativo y conversiones de unidades.

## Persistencia y seguridad

- Versionar el esquema. Migrar sin borrar datos existentes y probar las migraciones con fixtures sintéticos.
- Guardar una copia antes de importar, migrar o reemplazar datos. Confirmar que la escritura finalizó antes de mostrar éxito; si falla, informar y conservar el estado recuperable.
- Validar respaldos completos antes de restaurar. Rechazar versiones futuras incompatibles y no modificar el estado activo ante un archivo inválido.
- Separar físicamente los espacios de demostración y personal. La demo debe estar claramente marcada y nunca reemplazar datos personales.
- No prometer sincronización ni conservación absoluta del almacenamiento del navegador. Ofrecer exportación y restauración; explicar sus límites.
- Tratar texto y archivos importados como datos no confiables. No interpolarlos en HTML sin escape; preferir `textContent`.
- En actualizaciones PWA, separar caché de aplicación y datos. No borrar IndexedDB al renovar cachés y no forzar recarga con cambios sin guardar.

## Interfaz y calidad

- Priorizar iPhone y escritorio. Validar a 390–400 px sin desplazamiento horizontal, con teclado abierto y áreas seguras.
- Mantener claro, oscuro y preferencia del sistema; usar etiquetas, foco visible, controles táctiles de al menos 44 px y mensajes accesibles.
- Todas las acciones visibles deben funcionar. No agregar botones decorativos ni pantallas que prometan funciones inexistentes.
- Probar flujos completos de registro, edición, eliminación, recarga, exportación y restauración, además de cálculos aislados.
- Probar PWA y publicación bajo una subruta de GitHub Pages; no asumir despliegue en `/`.
- Informar comandos ejecutados y resultados reales. Distinguir pruebas automáticas, verificaciones manuales y checks pendientes en un iPhone físico.
- Mantener documentación de instalación, pruebas, publicación, fórmulas y limitaciones actualizada. No publicar ni enviar datos a servicios externos sin autorización.
