# Reglas de trabajo de Field

## Alcance actual

- Field se concentra en finanzas personales y en una experiencia clara en escritorio y móvil.
- No agregues Cocina, ejercicio ni hábitos salvo que el usuario cambie expresamente el alcance.
- Conservá la aplicación pequeña: HTML, CSS y módulos JavaScript sin framework ni backend obligatorio.

## Compatibilidad de datos

- IndexedDB es la fuente local de datos y los respaldos deben incluir el estado completo.
- Conservá el identificador interno `proyecto-ahorros` y las claves históricas de almacenamiento para poder importar respaldos existentes.
- Los datos de demostración solo se crean cuando la persona elige esa opción. No mezcles ejemplos con un perfil personal.
- No actives Supabase ni otra sincronización sin una decisión explícita. Mantené los límites de persistencia desacoplados para que pueda agregarse después.

## PWA y publicación

- La app se publica en GitHub Pages bajo `/Field/`; usá rutas relativas.
- Cada cambio visible o funcional requiere incrementar `VERSION` en `sw.js` y `js/version.js` con el mismo valor.
- Si agregás un archivo de la aplicación dentro de `css/`, `js/` o `icons/`, agregalo también a `ARCHIVOS` en `sw.js`.
- El workflow de Pages debe probar antes de desplegar.

## Validación

- Ejecutá `npm test` o `node --test` después de cada cambio.
- Antes de publicar, abrí la aplicación desde un servidor HTTP bajo `/Field/` y probá al menos el ingreso con datos de ejemplo, la navegación financiera y Ajustes en un viewport de escritorio y otro de iPhone.
- Revisá errores de consola, recursos fallidos y desbordamiento horizontal. Guardá capturas cuando el usuario pida una validación visual.

## Procedencia

La base importada proviene de `Agusgodmode1/proyecto-ahorros` en `e05a466dc79ac4a88a0ea52c08ac81a790497c10`, con autorización confirmada por el propietario de Field. No elimines esa atribución del README ni combines el commit de importación con los cambios propios de Field.
