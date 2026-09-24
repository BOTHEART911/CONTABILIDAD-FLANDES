# CONTABILIDAD-FLANDES

App de Contabilidad de la Alcaldía de Flandes. Front estático (GitHub Pages) sobre FLANDES_CORE (app `CONTABILIDAD`). Mismo kit, estilos, cielo, cohete, esqueletos, Insights, foto de perfil, modo oscuro y firma que Contratista, Contratación y Supervisión.

Roles: **CONTABLE** y **OFICINA** (el CONTADOR, cuya firma va en todas las órdenes). El DEV entra a todo.

## Fase 7 · qué hay aquí
- **Inicio**: el login trae el arranque en el mismo viaje; las órdenes se piden una sola vez (burbuja y resumen: por hacer, primeras del tramo, las demás, con RP de cesión, orden generada). Aviso si falta alguna firma.
- **Órdenes de pago** (`js/ordenes.js`): las cuentas CERRADAS (plan de pagos aceptado). Va primero Oscar Polania y luego por fecha de radicación. Pastillas: primeras del tramo (primario, 1ª y 2ª adición), las demás, con RP de cesión, orden ya generada, tipo de contrato y secretaría. La tarjeta trae tipo, cobro, valor del contrato, adiciones y descuentos.
- **La orden**: descuentos con check (cada uno editable a mano), Publicidad y propaganda, cuentas contables, movimiento financiero y contable, **Usar RP Cesión**, N° de orden con solo los dígitos (1023 → 2026001023). Todo se recalcula en el teléfono con `js/motor.js`, que es el mismo cálculo del CORE (FC7_liquidar_).
  - **Crear orden**: una llamada. El CORE vuelve a cuadrar, llena la plantilla ORDEN DE PAGO V1, guarda el PDF en la carpeta de la cuenta, escribe su URL y lo descarga como `OP_{cuenta}_{contrato}_{nombre}.pdf`.
  - **Orden creada**: una llamada. Pasa la cuenta a ORDEN DE PAGO y avisa al contratista y al grupo de Tesorería (sin el enlace).
  - **Ver informe** abre el informe de supervisión en el visor rápido. **Avisar vencimiento** escribe al grupo del supervisor. Ya no existe marcar/desmarcar pendiente.
- **Registros** (`js/registros.js`): el CONTABLE ve y descarga las órdenes que elaboró; OFICINA ve todas y escoge todos los contables o uno. Todas o por periodo, en PDF membretado por bloques o en Excel.
- **Configuración** (`js/configuracion.js`): retenciones (código, tipo, %, base, automática, solo primera cuenta del tramo, a qué tipos aplica, a cuál reemplaza), cuentas contables por tipo de contrato, catálogo de cuentas, Régimen Simple, Convenio de Cooperación e IVA. **Mi firma y mi foto** (la firma se sube con foto, arrastrándola o pegándola, y se le quita el fondo).
- **Contratistas**, **Informe de cuentas**, **Requerimientos** y **Comunicados**: las vistas de oficina de Supervisión, para todos los contratos.
- Soporte en el menú del perfil. Insights en todas las vistas.
