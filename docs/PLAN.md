# Sistema Personal: análisis y plan inicial (histórico)

Estado actual: foco exclusivo autorizado en Inicio, Finanzas y experiencia visual. Cocina, ejercicio y hábitos pausados. La nueva entrega y sus reglas se describen en README.md, SKILLS.md y VALIDACION.md. Lo que sigue es el plan histórico; no sustituye las instrucciones vigentes de AGENTS.md.

## 1. Repositorio actual

Al comenzar el análisis, `/workspace/Field` contenía únicamente `README.md` con el título Field. El checkout estaba limpio al iniciar este análisis; no tiene aplicación, dependencias, configuración de publicación ni pruebas. Hay libertad para diseñar una base pequeña sin migrar código previo.

## 2. Referencia analizada

- Código: https://github.com/Agusgodmode1/proyecto-ahorros
- Aplicación: https://agusgodmode1.github.io/proyecto-ahorros/
- Revisión inspeccionada: `e05a466dc79ac4a88a0ea52c08ac81a790497c10`.
- Se revisaron README, HTML, CSS, arranque, planificación financiera, fechas, persistencia, PWA y conexión opcional a la nube. `node --test` ejecutó 93 pruebas: 93 pasaron, ninguna falló ni fue omitida.
- El sitio publicado respondió HTTP 403 desde este entorno. No se verificó visualmente ese despliegue ni se probó en un iPhone físico. Los comentarios sobre diseño describen lo observado en el código.

### Arquitectura y organización

Es una aplicación estática de HTML, CSS y JavaScript con módulos ES, sin proceso de compilación y sin dependencias declaradas en package.json. `js/logica/` contiene funciones puras y `js/ui/` las vistas; `js/app.js` coordina arranque, navegación y guardado. Una página HTML contiene los paneles. Es una base económica y publicable en GitHub Pages.

La separación de cálculos es valiosa. Para cuatro áreas conviene reducir el acoplamiento a su contexto global mutable y al render general: cada módulo de Field tendrá casos de uso propios y utilizará una interfaz compartida de persistencia.

### Experiencia de usuario y componentes

El inicio prioriza cuánto se puede gastar hoy y cuánto falta para cobrar. Permite registro rápido, edición de gastos, deshacer eliminaciones y consulta por semanas. La configuración avanzada se pliega. Ofrece comienzo vacío, importación y ejemplo identificado.

El CSS usa tokens de color, tarjetas, barras de progreso, formularios y colores por sección. Contempla temas claro/oscuro, navegación inferior móvil, áreas seguras de iOS, campos de 16 px y adaptación al ancho disponible. Algunas fuentes se descargan de Google con fallback del sistema. Field usará tipografía del sistema, tres destinos principales iniciales y una jerarquía sobria: disponible, días hasta cobrar y próxima acción.

### Presupuesto y cálculos

El plan de referencia resta ahorro y gastos fijos del monto disponible, divide el período en bloques de siete días desde su inicio y prorratea el presupuesto según la duración de cada bloque. El remanente positivo o negativo pasa al siguiente. La recomendación diaria se deriva del resto de la semana y sus días pendientes.

Field tomará la idea de semanas ligadas al período de cobro y cálculos explicables. Definirá centésimos enteros y reparto exacto para que los redondeos no inventen dinero. No incorporará liquidación salarial, feriados laborales, voz, dólares ni extractos bancarios en el MVP.

### Almacenamiento y PWA

La referencia guarda un documento en IndexedDB, mantiene migraciones de esquema, usa localStorage como fallback y conserva tres copias anteriores a operaciones importantes. Incluye exportación/importación JSON y solicitud de almacenamiento persistente. El guardado tiene debounce y vaciado al pasar a segundo plano.

El manifest usa rutas relativas, modo standalone e íconos para instalación; el service worker precachea archivos, conserva versiones y espera una acción para actualizar. El arranque intenta guardar antes de recargar. Ese enfoque inspira Field, pero Field bloqueará la actualización si el guardado falla y no dependerá de guardar recién al cerrar la app.

Existe además código para sincronización opcional mediante Supabase, con autenticación por email, revisiones y combinación de cambios. Esto matiza la descripción del README de funcionamiento exclusivamente local. No se verificó su configuración remota. Field será local en el MVP, con exportación para traslado manual; preparar una interfaz de almacenamiento no equivale a implementar sincronización.

No se copiarán código, datos ni recursos de la referencia. No se encontró un archivo de licencia en el checkout inspeccionado; se utilizarán sus ideas como referencia y una implementación propia.

## 3. Arquitectura propuesta

Aplicación estática con TypeScript, Vite y CSS propio; sin framework de interfaz ni backend. TypeScript ayuda a mantener contratos entre áreas. Vite se usará solo para desarrollo y build. Vitest y Playwright serán herramientas de desarrollo para cálculos y flujos de navegador, respectivamente; las versiones se fijarán con lockfile al implementar.

```text
src/
  app/                    arranque, navegación y estado de sesión
  shared/                 dinero, fechas, validación y controles comunes
  modules/
    finance/              dominio, casos de uso y vistas financieras
    food/                 ingredientes, recetas y costos
    activity/             registros y resumen semanal
    habits/               hábitos y cumplimiento por fecha
  storage/                contrato de repositorio, IndexedDB, migraciones y respaldos
  demo/                   fixtures ficticios y espacio separado
  styles/                 tokens, temas y estilos responsive
public/                   manifest, íconos y recursos PWA
tests/                    dominio, persistencia y flujos de navegador
docs/                     fórmulas, decisiones, uso y publicación
```

Flujo: vista → caso de uso → repositorio → IndexedDB. Los resúmenes llaman a funciones puras con datos fuente. La vista recibe el resultado y mensajes de validación; no calcula saldos por su cuenta.

### Modelo y relaciones

| Entidad                  | Datos principales y relaciones                                                        |
| ------------------------ | ------------------------------------------------------------------------------------- |
| Configuración            | Moneda UYU, zona America/Montevideo, tema y versión de esquema                        |
| Período financiero       | ID, fecha de inicio, próximo cobro y saldo inicial en centésimos                      |
| Gasto                    | ID estable, fecha, monto, categoría, descripción y referencia al período              |
| Ingrediente              | ID, nombre, precio del envase, cantidad del envase y unidad base                      |
| Compra (etapa posterior) | ID, fecha y líneas vinculadas a ingredientes; un único gasto vinculado por purchaseId |
| Receta                   | ID, nombre, porciones y líneas con ingredientId + cantidad + unidad                   |
| Actividad                | ID, fecha, tipo, duración en minutos y distancia opcional                             |
| Hábito                   | ID, nombre, objetivo semanal de 1 a 7 días y estado activo/archivado                  |
| Cumplimiento             | habitId + fecha como clave única; marcar dos veces no duplica                         |

Los importes agregados y costos por porción se calculan; no se mantienen copias en varias áreas. El MVP mostrará gastos de alimentación desde la categoría del registro financiero; cargar un precio de ingrediente no implicará haber hecho una compra. Las recetas usarán precios actuales y aclararán esa condición. Desde el diseño inicial, una compra tendrá ID, fecha y líneas con ingredientId, cantidad, unidad y precio pagado. El gasto financiero será el único movimiento de dinero, con purchaseId único; se guardará en la misma transacción que la compra. El total de la compra se derivará de sus líneas; finanzas contará ese movimiento una sola vez. Comprar actualizará la referencia de precio del ingrediente, pero editar ese precio o una receta no generará gastos. El costo histórico requerirá un snapshot explícito. En la etapa 1 estos son contratos de diseño, no entidades o funcionalidades implementadas.

IndexedDB tendrá espacios separados para personal y demo. Un contrato de repositorio centralizará escrituras, lecturas y validación; el esquema y los respaldos tendrán versiones independientes de la versión de la PWA. Los IDs estables permiten relaciones y una eventual sincronización, pero conflictos, autenticación y eliminación sincronizada quedan para una fase futura.

## 4. Comportamiento concreto del MVP

### Inicio y navegación

Primera etapa: Inicio, Finanzas y Alimentación como navegación; Ajustes y respaldos como vista secundaria. Finanzas y Alimentación explican su alcance pendiente sin formularios ni botones simulados. Actividad y Hábitos se incorporarán después. En la etapa financiera, Inicio mostrará saldo disponible, días hasta cobrar, referencia diaria y accesos para registrar. Los resúmenes de actividad y hábitos llegarán cuando esos módulos se implementen.

Primera apertura: empezar vacío o explorar demo ficticia. La demo tendrá un aviso permanente y almacenamiento separado; entrar o salir no borrará datos personales. No se precargarán ejemplos como si fueran datos del usuario.

### Finanzas: reglas verificables

- El usuario indica fecha de inicio, saldo disponible en esa fecha y fecha exacta del próximo cobro. No se calcula sueldo ni se registra ingreso automáticamente.
- El período incluye el inicio y excluye el día de cobro. Los gastos tienen fecha entre el inicio y hoy, siempre antes del cobro; gastos futuros no se registran como realizados.
- Saldo disponible = saldo inicial − gastos del período. Se permiten saldos negativos y se explican como déficit.
- Días restantes = diferencia de fechas civiles entre hoy y cobro. Si es cero o el cobro pasó, se muestra que el período terminó; no se divide por cero ni se supone que hubo un nuevo cobro.
- Referencia diaria = saldo restante / días restantes, cuando hay días pendientes. Es una orientación, no dinero adicional.
- Presupuesto semanal automático: bloques de siete días desde el inicio, último bloque parcial. Se reparte el saldo inicial por días en centésimos, asignando el residuo con una regla determinista; la suma siempre coincide con el saldo inicial.
- Disponible de la semana = presupuesto base + remanente anterior − gastos de la semana. Los excesos se arrastran. El presupuesto base no se recalcula cada vez que se registra un gasto.
- Saldo inicial editable con explicación de su efecto, historial editable y eliminable con confirmación o deshacer, resumen por categoría y detalle de las fórmulas.
- Al iniciar un nuevo período, se archiva el anterior y se confirma el nuevo saldo disponible; el histórico se conserva. No se cambia el período silenciosamente.

No se incluyen ingresos adicionales, objetivos de ahorro, gastos recurrentes ni edición manual de límites semanales en esta primera entrega. El presupuesto automático cubre el requisito de presupuesto semanal sin agregar controles que se contradigan.

### Alimentación

Registrar ingredientes con precio y contenido del envase; crear, editar y borrar recetas con cantidades y porciones. Unidades iniciales: g/kg, ml/l y unidad. Costo de línea = precio del envase × cantidad usada / contenido del envase; costo por porción = suma de líneas / porciones. Se redondea al presentar el resultado, conservando precisión intermedia y una regla documentada.

No convertir ml a g ni una unidad a gramos sin equivalencia explícita. Impedir borrar ingredientes referenciados sin resolver esas referencias. Incorporar compras simples vinculadas a ingredientes y a un único gasto financiero. No incluir aún planificación, inventario ni listas de compras.

### Actividad y hábitos

Registrar, editar y eliminar actividad con fecha, tipo y duración; distancia opcional. Mostrar totales y frecuencia semanal, lunes a domingo. Crear hábitos, marcar/desmarcar un cumplimiento por día y ver días cumplidos sobre el objetivo semanal. Archivar hábitos conserva su historial. No incluir rachas complejas ni objetivos deportivos en esta entrega.

## 5. Persistencia, riesgos y límites

| Riesgo o decisión                                                   | Tratamiento propuesto                                                                                                                       |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Safari puede borrar almacenamiento; dispositivos no comparten datos | Exportación JSON y restauración desde el MVP; aviso de almacenamiento local. Pedir persistencia sin prometer que iOS la concederá.          |
| Fallo de escritura o cierre de la app                               | Confirmar transacciones antes de mostrar “Guardado”; informar fallos y ofrecer exportación. No depender de pagehide para persistir cambios. |
| Actualización y migraciones                                         | Copia previa, migraciones probadas, versión futura rechazada sin modificar datos; actualización PWA explícita tras completar escrituras.    |
| Demo mezclada con datos reales                                      | Espacios físicos distintos, exportación identificada y sin sustituciones silenciosas.                                                       |
| Fechas y redondeos                                                  | Fechas civiles, reloj inyectable, zona Uruguay, dinero entero y tests de límites.                                                           |
| Restauración malformada o texto malicioso                           | Validar tipos, límites, IDs y relaciones antes de reemplazar; mostrar resumen y pedir confirmación. Renderizar texto sin HTML ejecutable.   |
| Varias pestañas escribiendo                                         | Serializar escrituras y controlar revisiones en transacciones; detectar estado desactualizado y recargar antes de sobrescribir.             |
| PWA queda con código viejo                                          | Versionado de caché y prueba de actualización; cachés de recursos separadas de IndexedDB.                                                   |
| GitHub Pages usa subruta                                            | Build preparado para `/Field/`, navegación por hash y rutas compatibles con subruta.                                                        |
| Sincronización futura                                               | Mantener contrato de repositorio e IDs. Diseñar resolución de conflictos cuando exista ese alcance; no agregar nube ni cuentas ahora.       |

No es posible garantizar conservación absoluta si se borran los datos del sitio o se cambia de teléfono sin respaldo. Actualizar la aplicación sí deberá conservar los datos mediante las migraciones verificadas. La instalación y el comportamiento real de Safari en iPhone requieren una comprobación manual en dispositivo; WebKit automatizado no sustituye esa prueba.

## 6. Plan de implementación por etapas

1. **Base pequeña y publicable — única etapa autorizada ahora.** TypeScript/Vite, navegación responsive, temas, perfil mínimo, repositorio IndexedDB, espacios personal/demo, esquema versionado, exportación/importación y copias recuperables. Build con subruta y workflow de GitHub Pages desde esta etapa. Sin cálculos ni formularios financieros o alimentarios; sus destinos informan el alcance pendiente. Salida: perfil y tema sobreviven a recarga, respaldos se validan antes de reemplazar, demo no toca el espacio personal, build y navegación bajo `/Field/` verificados. Documentar pruebas y pasos para navegador/iPhone; no afirmar publicación sin una URL desplegada comprobada.
2. **Finanzas e inicio — requiere nueva autorización.** Configuración del período, gastos editables, presupuesto semanal y resúmenes. Modelar el vínculo único de compra/gasto y probar que no hay doble conteo, además de dinero, fechas y arrastre.
3. **Alimentación e integración — requiere nueva autorización.** Ingredientes, compras vinculadas al único gasto, recetas, unidades y costo por porción. Probar atomicidad compra/gasto y que editar precios no agrega movimientos. Sin inventario ni listas de compras aún.
4. **PWA y validación en dispositivo — alcance posterior.** Manifest, íconos, offline y actualización controlada. Pages ya está preparado desde la etapa 1. No agregar un service worker prematuramente: en la base el navegador recibe directamente el build publicado y los datos permanecen en IndexedDB.
5. **Actividad y hábitos — después de las prioridades.** Registros y cumplimiento diario, con alcance confirmado antes de implementar.

Al finalizar cada etapa ejecutar sus pruebas, registrar resultados reales y limitaciones en `docs/VALIDACION.md`, y detenerse para revisión. No avanzar automáticamente. Mantener la primera versión pequeña, con datos separados, respaldo completo y sin servicios de nube. La preparación del despliegue no implica que el repositorio haya sido enviado a GitHub ni que Pages esté activo.

## 7. Pruebas previstas y aprobación

- Dominio: reparto exacto de centésimos, semanas parciales, arrastre positivo/negativo, cobro hoy o vencido, cambio de mes/año, saldo editable, unidades incompatibles y costos por porción.
- Persistencia: migraciones, error de escritura, exportar/restaurar, copias previas, referencias inválidas, respaldo de versión futura y aislamiento demo/personal.
- Navegador: crear/editar/borrar gastos, ingredientes, recetas y actividades; marcar/desmarcar hábitos; recarga, tema, respaldo, offline y actualización PWA. Chromium y WebKit, móvil y escritorio.
- Manual: Safari en iPhone, agregar a pantalla de inicio, compartir/guardar respaldo, teclado, áreas seguras y regreso desde segundo plano. Informar cuáles se pudieron ejecutar.

Las 93 pruebas mencionadas en el análisis pertenecen exclusivamente a la referencia. Los resultados de Field se documentan por separado. La etapa 1 está autorizada; cualquier etapa siguiente necesita una nueva indicación del usuario.
