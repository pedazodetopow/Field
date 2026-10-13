# Estado vigente

El rediseño financiero posterior reemplaza Inicio y Finanzas, agrega fijos, metas, conciliación y proyección. Cocina se conserva y su desarrollo está pausado. Consultar README.md, SKILLS.md y VALIDACION.md para el estado actual. El informe siguiente conserva la entrega anterior como historial.

# Rediseño y versión funcional

## Entregado

Se reemplazó la landing y las páginas de próximamente por Inicio operativo, Finanzas, Cocina y Ajustes. La navegación es horizontal y compacta; números tabulares, colores consistentes, claro/oscuro/sistema y formularios modales adaptados a móvil. Se eliminaron frases motivacionales, ilustraciones decorativas y módulos vacíos. Hábitos y actividad siguen como ampliación futura con navegación oculta.

Finanzas registra ingresos y gastos, edición/eliminación, categorías, búsqueda, períodos conservados, ahorro reservado, presupuesto por semanas, arrastre de déficit/sobrante y referencias diarias. Inicio usa esos datos y las preparaciones para mostrar disponible, saldo, cobro, semana, movimientos y comidas disponibles.

Cocina registra ingredientes y envases, recetas con varias líneas y costos, compras integradas con un único movimiento, y preparaciones con porciones consumibles. Editar o eliminar compras actúa sobre ese mismo movimiento. Una preparación conserva su costo al registro y no genera un gasto nuevo.

## Migración e integridad

Se conserva IndexedDB con los mismos nombres de bases y stores. El documento evoluciona de esquema 1 a 2 añadiendo colecciones; la migración conserva perfil, tema, fechas e identidad y guarda una copia del documento original en la misma transacción. Importar valida tipos, referencias, unidades, fechas, IDs únicos y totales de compras antes de reemplazar. Una compra debe tener exactamente un gasto asociado y el mismo total que sus líneas.

El repositorio sigue siendo una interfaz independiente de la UI y los IDs son estables. No se construyeron servicios remotos ni un motor de sincronización. Los cálculos derivados no se almacenan como una segunda fuente financiera; las preparaciones sí conservan un snapshot explícito de su costo.

## Decisiones verificables

- Dinero financiero en centésimos enteros; semanas con reparto exacto del residuo y días civiles de Uruguay.
- Los ingresos adicionales se asignan a su semana de recepción. Las semanas futuras son proyecciones; no incluyen ingresos supuestos.
- Costo de receta = suma de precio del envase × cantidad convertida / contenido del envase. Costo por porción = costo preciso total / porciones; redondeo al final.
- Compras actualizan la referencia de precio y su único gasto juntos. Eliminar una compra elimina el gasto y conserva la referencia editable de precio.
- Porciones manuales. Preparar/consumir no descuenta dinero ni pretende controlar stock o vencimientos.
- Los períodos no se renuevan solos: el usuario confirma el saldo de un período nuevo; el historial queda disponible.

La referencia obligatoria fue revisada en código (commit e05a466dc79ac4a88a0ea52c08ac81a790497c10, también confirmado al actualizar la referencia). Su sitio publicado devolvió 403 desde este entorno. Se utilizaron como inspiración sus prioridades operativas, módulos de cálculo y presupuesto por semanas; toda esta implementación es propia.

## Límites reales

No hay sincronización, PWA offline, gastos recurrentes, múltiples metas de ahorro, inventario de ingredientes ni planificación de menús futuros. Inicio cubre comidas mediante porciones disponibles. La reserva de ahorro es presupuestaria, no una transferencia bancaria. El respaldo sigue limitado a 2 MB; se informa y rechaza antes de reemplazar datos. No se probó en un iPhone físico: WebKit automatizado y comprobación visual móvil se reportan por separado.

Ver resultados en VALIDACION.md y publicación en PUBLICACION.md.
