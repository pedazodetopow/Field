---
name: field-finance
description: Diseñar, implementar y verificar Inicio y Finanzas de Field; usar para presupuestos, movimientos, fijos, metas, migraciones financieras y cambios visuales.
---
# Finanzas de Field

## Alcance
Inicio y Finanzas exclusivamente. Cocina conserva rutas, datos, compras vinculadas y comportamiento; no desarrollar Cocina, ejercicio ni hábitos. TypeScript, Vite, CSS propio, IndexedDB, /Field/. Sin backend ni nuevas dependencias de UI.

## Diseño
Referencia funcional: Proyecto Ahorros (estudiar código y render local, no copiar su código sin licencia). Importe diario como foco, cuenta regresiva, gasto rápido visible, recibo del presupuesto, semanas con arrastre, fijos y metas accesibles mediante pestañas. No landing, eslóganes, tarjetas de relleno ni promesas. Escritorio 1440 px y móvil 390 px: jerarquía de importes, cifras tabulares, 44 px táctiles, campos de 16 px, navegación simple, foco visible, claro/oscuro, sin depender solo del color. Componentes propios con tokens y estados de error, vacío y saldo negativo. No agregar imágenes decorativas a la herramienta financiera.

## Reglas de dinero
UYU en centésimos enteros, fechas civiles de Montevideo. Inicio incluido, cobro excluido. Saldo calculado = inicial + ingresos recibidos − gastos; saldo real observado se registra aparte para comparar, nunca sobrescribe movimientos. Diferencia explícita con opción de ajuste auditado. Ahorro reservado no es un gasto. Porcentaje aplicado al saldo inicial, redondeado una vez. Metas independientes describen ahorro ya separado y no descuentan dinero por segunda vez.

Fijos mensuales: día 29–31 se limita al último día del mes. Cada vencimiento tiene una sola vinculación de pago a un movimiento real. Lo pendiente se reserva; al pagar disminuyen saldo y pendiente por igual, manteniendo el disponible. Las semanas excluyen pagos fijos ya reservados. Eliminar un movimiento pagado vuelve el vencimiento a pendiente. No generar cargos ni ingresos automáticos. Proyecciones rotuladas y basadas en supuestos visibles; nunca ingresos ficticios. Arrastre conserva déficit. Hoy = cuota de los días restantes antes de gastos de hoy menos gastos variables de hoy.

## Integridad
Migración aditiva con copia previa, validación estricta, exportar/importar todos los datos. Demo en otra base y siempre rotulada. Una compra = un gasto; no alterar Cocina para rediseñar Finanzas. Deshacer solo una modificación reciente, con revisión optimista; no sobrescribir cambios posteriores ni de otra pestaña. Éxito solo después de commit de IndexedDB.

## Verificación obligatoria
Pruebas puras: centésimos, negativos, semanas parciales, fecha de cobro, fijos en febrero/año bisiesto, pagar/editar/borrar sin duplicar, proyecciones, saldo observado, metas y migración v2. Navegador: CRUD y deshacer, gasto rápido, fijos, metas, conciliación, recarga, respaldo completo, demo separada y regresión de compras. Usar frontend-testing-debugging: Browser ausente → Playwright del proyecto. Revisar capturas reales de Inicio, Finanzas y formulario a 390/1440 en claro/oscuro, más teclado/foco, overflow y consola. Corregir antes de publicar; sin anular TLS. Documentar resultados reales en docs/VALIDACION.md y procedencia de skills en docs/SKILLS.md. Publicación autorizada: CI verde, despliegue finalizado, HTTPS y recursos verificados antes de confirmar URL.
