# Field · Finanzas personales

Aplicación personal para Uruguay, en español rioplatense. TypeScript, Vite, CSS propio e IndexedDB; sin backend, cuentas, servicios pagos ni sincronización.

**Sitio:** [Abrir Field](https://pedazodetopow.github.io/Field/). La nueva versión se publica desde main únicamente si pasa la validación de GitHub Actions.

## Uso

### Presupuesto y movimientos

1. En **Finanzas**, configurá saldo inicial, ahorro a reservar, inicio y próximo cobro.
2. Anotá ingresos y gastos con fecha, categoría y descripción. Podés editarlos, eliminarlos, buscar y filtrar por tipo.
3. En Inicio anotá gastos al instante. En Finanzas consultá presupuesto, movimientos, fijos, metas y proyección. **Deshacer** revierte la última modificación financiera durante 15 segundos, mientras no haya otra escritura.
4. Al cobrar, creá un nuevo período con el saldo que confirmes. El anterior conserva todos sus movimientos y puede consultarse desde **Períodos guardados**.

Los montos de los formularios se ingresan sin separadores de miles: `40000` o `350,50`. Los resultados se muestran como `$ 40.000`, con decimales cuando corresponden.

- Saldo calculado = saldo inicial + ingresos registrados − gastos registrados. **Comprobar saldo** guarda una observación del saldo real; solo crea un movimiento de ajuste si marcás la casilla correspondiente.
- Disponible = saldo calculado − ahorro reservado − fijos pendientes. Reservar ahorro no crea un gasto ni supone una transferencia bancaria. Podés calcular el monto a reservar mediante un porcentaje del saldo inicial; se guarda el monto resultante.
- Las semanas son bloques de siete días desde el inicio; la última puede ser parcial. El cobro queda fuera del período.
- Se reparte el presupuesto inicial en centésimos exactos, los ingresos entran en la semana en que se reciben y el remanente positivo o negativo pasa a la siguiente.
- Hoy podés gastar = (resto semanal + gastos variables de hoy) ÷ días restantes de la semana, redondeado hacia abajo a centésimos, menos lo gastado hoy. Pagar un fijo reservado no reduce otra vez el presupuesto semanal.
- Los períodos terminados no dividen por cero ni generan automáticamente ingresos. Los gastos con saldo negativo se conservan.
- Las semanas futuras son proyecciones que cambian al registrar movimientos. No se presentan como dinero adicional.

### Fijos, metas y proyecciones

En **Finanzas → Fijos** agregá importe mensual, día de vencimiento y vigencia. Los días 29–31 se ajustan al último día de los meses cortos. Cada vencimiento reserva dinero hasta **Registrar pago**, que crea un único gasto y libera esa reserva. Podés editar el pago desde movimientos. Borrarlo vuelve a dejar el fijo pendiente; borrar la regla conserva los pagos históricos. Modificar una regla cambia sus vencimientos pendientes.

**Metas** registra el ahorro ya separado, objetivo y fecha opcional, con aportes y edición. No transfiere dinero ni lo vuelve a descontar; si el saldo inicial incluye ese ahorro, incluilo también en la reserva.

**Proyección** estima el saldo antes de cobrar usando el ritmo de gastos variables hasta hoy y los fijos pendientes. El escenario del siguiente período permite indicar ingreso esperado, ahorro nuevo y siguiente fecha de cobro. Son supuestos: nunca se crean ingresos automáticamente ni se promete un saldo futuro.

El desarrollo actual se limita a Inicio y Finanzas. Cocina conserva funcionamiento y datos; ejercicio y hábitos siguen pausados. Reglas locales y comprobación de skills: [docs/SKILLS.md](docs/SKILLS.md).

### Cocina existente (desarrollo pausado)

1. En **Cocina → Ingredientes**, cargá nombre, precio y cantidad del envase. Ejemplo: pollo, 1 kg, $ 350.
2. En **Recetas**, combiná ingredientes, cantidades y unidades, e indicá porciones. El formulario calcula el costo mientras completás las líneas; podés consultar el desglose de cada receta guardada.
3. En **Compras**, anotá ingredientes comprados, cantidades y precios pagados. La compra y su único gasto de Alimentación se guardan en la misma transacción.
4. En **Preparaciones**, registrá una receta preparada, fecha y porciones. Descontá una porción con **Consumir 1** o editá las disponibles. Sus porciones se consultan en Cocina.

**Ejemplo probado:** 400 g de pollo comprado a $ 350/kg cuestan $ 140; si la receta solo lleva ese pollo y produce cuatro porciones, cada una cuesta $ 35.

- Se convierten g↔kg y ml↔l. Las unidades contables quedan como unidades; no se inventan densidades para convertir ml a g.
- El costo se conserva con precisión intermedia y se redondea al final, a centésimos. El precio actual de referencia recalcula las recetas, sin generar movimientos financieros.
- Guardar una compra usa sus precios como nueva referencia de los envases. Editar la compra modifica el mismo gasto; eliminarla quita también ese gasto. Eliminar una compra no revierte los precios de referencia, que siguen siendo editables.
- Usar ingredientes en una receta y registrar preparaciones **no agrega otro gasto**.
- Una preparación conserva nombre y costo calculado al registrarla, incluso si luego cambiás precios o eliminás la receta. No reconstruye precios históricos de días anteriores.
- Para borrar ingredientes usados, primero resolvé sus referencias en recetas o compras. Borrar una receta conserva las preparaciones y sus porciones.
- Las porciones son un registro manual; no se implementó inventario de materia prima ni control de vencimientos.

## Datos, demo y respaldos

Personal y demo viven en bases distintas: `field-personal` y `field-demo`. La demo es ficticia, está identificada permanentemente y puede recargarse sin tocar datos personales. Si tu demo era la base antigua, usá **Cargar demo completa** dentro de la demo.

El esquema 3 migra automáticamente los esquemas 0, 1 y 2, conserva perfil, preferencias, presupuestos, movimientos y todos los datos de Cocina, y guarda una copia previa. Los nuevos fijos, pagos, metas, comprobaciones y escenarios se incluyen en los respaldos. No se borran datos al actualizar la app. Se conservan cinco copias locales antes de migrar, importar o restaurar.

En **Ajustes y respaldos**, exportá todas las entidades del espacio activo a JSON. Para importar, elegí el archivo, revisá cantidades y confirmá. Se rechazan archivos inválidos, vínculos inconsistentes, datos de otro espacio y versiones futuras. Una importación confirmada reemplaza el espacio activo y guarda una copia anterior. Las copias automáticas no se incluyen en el archivo exportado.

Los archivos no están cifrados: guardalos fuera del repositorio. El navegador puede borrar almacenamiento local y dos dispositivos no comparten datos automáticamente. Un conflicto de revisión entre pestañas se rechaza para evitar sobrescribir cambios ajenos; recargá antes de continuar.

## Desarrollo y pruebas

Node 24 LTS (mínimo 22.12) y npm. Usar el checkout existente.

```sh
npm ci
npm run dev
```

Abrí la dirección que muestra Vite con la ruta `/Field/`. Para probar producción:

```sh
npm run build
npm run preview
```

El acceso local de tu computadora es un contexto seguro. En el iPhone usá HTTPS de Pages; generar identificadores requiere un contexto seguro y el acceso por IP/HTTP no es el flujo soportado. No hay PWA offline ni service worker en esta versión.

```sh
npm test
npm run build
npx playwright install --with-deps chromium webkit
npm run test:e2e
```

Playwright valida dist bajo `/Field/`, con Chromium móvil, Chromium escritorio y WebKit móvil. Los perfiles y datos de pruebas son aislados y ficticios. En el entorno Cloud con Chromium del sistema:

```sh
FIELD_CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e -- --project=chromium-mobile --project=chromium-desktop --workers=2
```

Si npm no puede escribir su caché predeterminada, usá `npm ci --cache /tmp/field-npm-cache`. Los resultados y limitaciones reales están en [VALIDACION.md](docs/VALIDACION.md).

Capturas reproducibles de seis pantallas financieras en claro/oscuro a 390 y 1440 px, con demo aislada:

```bash
FIELD_CHROMIUM_PATH=/usr/bin/chromium node scripts/capture-finance.mjs
```

Se guardan en `/tmp/field-finance-captures` (o `FIELD_SCREENSHOT_DIR`). Actions ejecuta el mismo script y conserva el artefacto `capturas-finanzas` por 14 días antes de desplegar. No hay dependencias de producción nuevas.

## Código y publicación

- `src/modules/finance/`: cálculo puro del presupuesto y vistas.
- `src/modules/food/`: unidades, costos, compras vinculadas y vistas.
- `src/storage/`: contrato de repositorio, validación, migraciones, copias y transacciones.
- `src/app/`: navegación, formularios y coordinación de casos de uso.
- `src/shared/`: fechas de Uruguay, dinero y controles visuales.
- `src/demo/`: datos sintéticos separados.

Vite conserva `base: '/Field/'` y navegación por hash. El workflow valida main y publica dist en GitHub Pages; en PR valida sin desplegar. Pages ya usa GitHub Actions como fuente. Consultá [PUBLICACION.md](docs/PUBLICACION.md) para el estado y la ejecución.

La referencia Proyecto Ahorros inspiró jerarquía de montos, semanas, formularios y fórmulas visibles; no se copió su código ni su identidad. El análisis histórico queda en [PLAN.md](docs/PLAN.md). El pedido actual autorizó esta implementación y reemplaza las restricciones de la primera etapa. Hábitos y ejercicio conservan su lugar en la visión, con navegación oculta hasta que tengan funciones reales.
