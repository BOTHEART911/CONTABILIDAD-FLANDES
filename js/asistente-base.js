/* CONTABILIDAD-FLANDES · BASE SEMBRADA DEL ASISTENTE (24/10/2026)
   Respaldo embebido: la usa el asistente la primera vez y en la entrada.
   La de verdad vive en el CORE (hoja ASISTENTE_TEMAS) y se edita en ADMIN;
   cuando cambia, llega con el arranque y reemplaza esta en el teléfono.
   Generado desde la semilla: no se edita a mano. */
window.ASISTENTE_BASE = [
{
"id": "CB-INICIO",
"app": "CONTABILIDAD",
"vista": "",
"titulo": "Ir al inicio",
"frases": [
"ir al inicio",
"volver al inicio",
"pantalla principal",
"menu principal",
"regresar al menu"
],
"respuesta": "Te llevo a tu **inicio**: ahí están los bloques de la app y el resumen de órdenes por hacer.",
"accion": "ir:inicio",
"estado": "",
"activo": true,
"orden": 1
},
{
"id": "CB-QUE-ME-TOCA",
"app": "CONTABILIDAD",
"vista": "inicio,ordenes",
"titulo": "¿Qué tengo pendiente?",
"frases": [
"que tengo pendiente",
"que me toca hacer",
"que tengo que hacer hoy",
"que me falta",
"que hago primero",
"tengo algo pendiente",
"que es lo mas urgente",
"por donde empiezo hoy"
],
"respuesta": "{{queMeToca}}",
"accion": "",
"estado": "",
"activo": true,
"orden": 2
},
{
"id": "CB-POR-HACER",
"app": "CONTABILIDAD",
"vista": "inicio,ordenes",
"titulo": "¿Cuántas órdenes de pago tengo por hacer?",
"frases": [
"cuantas ordenes tengo por hacer",
"ordenes de pago pendientes",
"cuentas por pagar",
"cuentas esperando orden de pago",
"cuentas cerradas",
"plan de pagos aceptado",
"que cuentas me llegaron",
"cuentas nuevas para orden",
"hacer ordenes de pago"
],
"respuesta": "{{porHacer}}",
"accion": "ir:ordenes",
"estado": "",
"activo": true,
"orden": 3
},
{
"id": "CB-MAS-ANTIGUA",
"app": "CONTABILIDAD",
"vista": "inicio,ordenes",
"titulo": "¿Cuál lleva más días esperando?",
"frases": [
"cual lleva mas dias",
"la cuenta mas antigua",
"cual hago primero",
"cual esta esperando mas",
"cuenta mas vieja",
"cual se radico primero"
],
"respuesta": "{{masAntigua}}",
"accion": "ir:ordenes",
"estado": "",
"activo": true,
"orden": 4
},
{
"id": "CB-ATRASADAS",
"app": "CONTABILIDAD",
"vista": "inicio,ordenes",
"titulo": "¿Cuáles van atrasadas?",
"frases": [
"cuales van atrasadas",
"cuentas atrasadas",
"ordenes atrasadas",
"cuentas demoradas",
"llevan muchos dias",
"cuentas en rojo",
"cuales estan tarde"
],
"respuesta": "{{atrasadas}}",
"accion": "ir:ordenes",
"estado": "",
"activo": true,
"orden": 5
},
{
"id": "CB-SIN-MARCAR",
"app": "CONTABILIDAD",
"vista": "inicio,ordenes,orden",
"titulo": "¿Cuáles tienen la orden hecha y falta marcar ORDEN CREADA?",
"frases": [
"orden generada",
"ya hice el pdf",
"falta marcar orden creada",
"ordenes sin pasar a tesoreria",
"cuales ya tienen pdf",
"orden ya generada",
"quedo a medias la orden"
],
"respuesta": "{{sinMarcar}}",
"accion": "ir:ordPdf",
"estado": "",
"activo": true,
"orden": 6
},
{
"id": "CB-POR-GIRAR",
"app": "CONTABILIDAD",
"vista": "inicio,ordenes",
"titulo": "¿Cuánto hay por girar?",
"frases": [
"cuanto hay por girar",
"cuanto suman las cuentas",
"total por pagar",
"neto a girar",
"valor total de las cuentas",
"cuanta plata hay pendiente"
],
"respuesta": "{{porGirar}}",
"accion": "ir:ordenes",
"estado": "",
"activo": true,
"orden": 7
},
{
"id": "CB-ESTAMPILLAS",
"app": "CONTABILIDAD",
"vista": "inicio,ordenes,orden",
"titulo": "¿Cuáles llevan estampillas?",
"frases": [
"cuales llevan estampillas",
"estampillas",
"adulto mayor",
"procultura",
"primera cuenta del tramo",
"primeras del tramo",
"pro cultura"
],
"respuesta": "{{primeras}}",
"accion": "ir:ordPrimeras",
"estado": "",
"activo": true,
"orden": 8
},
{
"id": "CB-CESION",
"app": "CONTABILIDAD",
"vista": "ordenes,orden",
"titulo": "¿Cuáles traen RP de cesión?",
"frases": [
"rp de cesion",
"contrato cedido",
"cesion",
"cuales son cedidos",
"usar el rp de la cesion",
"rp del cesionario"
],
"respuesta": "{{cesion}}",
"accion": "ir:ordCesion",
"estado": "",
"activo": true,
"orden": 9
},
{
"id": "CB-LISTA-COMO",
"app": "CONTABILIDAD",
"vista": "ordenes",
"titulo": "¿Cómo funciona la lista?",
"frases": [
"como funciona la lista",
"que estoy viendo",
"como se ordena la lista",
"pastillas de la lista",
"filtrar cuentas",
"buscar una cuenta",
"buscar por orden"
],
"respuesta": "Aquí están las cuentas con **plan de pagos aceptado** por Supervisión (estado CERRADA), por fecha de radicación. Las pastillas separan las **primeras del tramo** (llevan estampillas), **las demás**, las que traen **RP de cesión** y las que ya tienen la **orden generada**. Busca por nombre, documento, contrato o N° de orden. Toca **Liquidar** para abrir la orden.",
"accion": "ir:ordenes",
"estado": "",
"activo": true,
"orden": 10
},
{
"id": "CB-LIQUIDAR",
"app": "CONTABILIDAD",
"vista": "ordenes,orden",
"titulo": "¿Cómo hago una orden de pago?",
"frases": [
"como hago una orden de pago",
"liquidar una cuenta",
"crear orden de pago",
"hacer la orden",
"pasos de la orden",
"como liquido",
"elaborar orden de pago"
],
"respuesta": "En la lista toca **Liquidar** en la cuenta. Revisa los **descuentos** (marca o desmarca, cambia un valor si hace falta), escribe los dígitos finales del **N° de orden** y toca **Crear orden**: sale el PDF y queda en la carpeta de la cuenta. Cuando esté bien, toca **Orden creada**: la cuenta pasa a ORDEN DE PAGO y se les avisa al contratista y a Tesorería.",
"accion": "ir:ordenes",
"estado": "",
"activo": true,
"orden": 11
},
{
"id": "CB-DESCUENTOS",
"app": "CONTABILIDAD",
"vista": "orden",
"titulo": "Explícame los descuentos",
"frases": [
"explicame los descuentos",
"que descuentos lleva",
"retenciones de esta cuenta",
"cuanto se le descuenta",
"como se calcula el descuento",
"liquidacion de la cuenta",
"neto de esta cuenta"
],
"respuesta": "{{descuentos}}",
"accion": "",
"estado": "",
"activo": true,
"orden": 12
},
{
"id": "CB-NO-MARCA",
"app": "CONTABILIDAD",
"vista": "orden",
"titulo": "¿Por qué no puedo marcar un descuento?",
"frases": [
"por que no puedo marcar",
"no me deja marcar",
"descuento gris",
"no se activa la retencion",
"esta bloqueado el check",
"por que no aparece la retencion"
],
"respuesta": "{{noMarca}}",
"accion": "",
"estado": "",
"activo": true,
"orden": 13
},
{
"id": "CB-ANTERIORES",
"app": "CONTABILIDAD",
"vista": "orden",
"titulo": "¿Por qué vienen marcados esos descuentos?",
"frases": [
"por que vienen marcados",
"cuentas anteriores",
"como venia la cuenta anterior",
"de donde salen los checks",
"que le descontaron antes",
"orden anterior"
],
"respuesta": "{{anteriores}}",
"accion": "",
"estado": "",
"activo": true,
"orden": 14
},
{
"id": "CB-RETEICA-IVA",
"app": "CONTABILIDAD",
"vista": "orden",
"titulo": "ReteICA e Impuesto a las ventas 15 %",
"frases": [
"reteica",
"iva",
"impuesto a las ventas",
"factura electronica",
"valor base de la factura",
"15 por ciento",
"iva factura"
],
"respuesta": "**ReteICA** (0,9 % del cobro) sale marcado y lo marcas o desmarcas tú en cualquier momento; ninguna otra retención lo quita. Con **Sobre base** el 0,9 % se calcula sobre una base que escoges de las ya escritas o que escribes tú. **Imp. a las ventas por servicios 15 %** solo aplica con **factura electrónica**: al marcarlo escribes el **valor base** de la factura con sus decimales y el descuento se redondea. El punto de miles sale solo; la coma la pones tú, solo para los centavos (ej. 4.621.848,74).",
"accion": "",
"estado": "",
"activo": true,
"orden": 15
},
{
"id": "CB-HONORARIOS-11",
"app": "CONTABILIDAD",
"vista": "orden",
"titulo": "Honorarios persona jurídica 11 %",
"frases": [
"honorarios persona juridica",
"honorarios 11",
"once por ciento",
"persona juridica",
"base de honorarios"
],
"respuesta": "Al marcar **Honorarios persona jurídica 11 %** aparece su **valor base**: escríbelo como en la factura (el punto de miles sale solo, la coma solo para los centavos) y el descuento se calcula sobre esa base.",
"accion": "",
"estado": "",
"activo": true,
"orden": 16
},
{
"id": "CB-NUMERO",
"app": "CONTABILIDAD",
"vista": "orden",
"titulo": "¿Qué escribo en el N° de orden?",
"frases": [
"numero de orden",
"n de orden",
"consecutivo de la orden",
"que numero le pongo",
"numero de la orden de pago"
],
"respuesta": "Escribe solo los **dígitos finales**: la app completa el año. Por ejemplo, **1023** queda como **2026001023**.",
"accion": "",
"estado": "",
"activo": true,
"orden": 17
},
{
"id": "CB-CUENTAS-CONTABLES",
"app": "CONTABILIDAD",
"vista": "orden,configuracion",
"titulo": "Débitos, créditos y cuentas contables",
"frases": [
"cuentas contables",
"debito",
"credito",
"cambiar la cuenta contable",
"publicidad",
"no cuadra la orden",
"imputacion"
],
"respuesta": "En la orden ves cómo sale cada **débito** y **crédito**; siempre cuadran (el crédito de la cuenta del beneficiario es el valor a girar). Puedes escoger otra cuenta del catálogo a mano. Si aparece la casilla de **publicidad**, no descuenta: solo cambia las cuentas contables. Las cuentas por tipo de contrato y el catálogo se definen en **CONFIGURACIÓN**.",
"accion": "",
"estado": "",
"activo": true,
"orden": 18
},
{
"id": "CB-ORDEN-ATRASADA",
"app": "CONTABILIDAD",
"vista": "orden",
"titulo": "Orden de pago atrasada",
"frases": [
"orden de pago atrasada",
"fecha anterior",
"cambiar la fecha de la orden",
"orden con fecha de ayer",
"fecha atrasada"
],
"respuesta": "**Orden de pago atrasada** deja escoger un **día hábil anterior** a hoy como fecha de la orden. Úsala **solo con autorización del Secretario(a) de Hacienda**.",
"accion": "",
"estado": "",
"activo": true,
"orden": 19
},
{
"id": "CB-CREAR",
"app": "CONTABILIDAD",
"vista": "orden",
"titulo": "¿Qué hace Crear orden?",
"frases": [
"que hace crear orden",
"crear orden",
"generar el pdf",
"donde queda el pdf",
"descargar la orden",
"ver la orden"
],
"respuesta": "**Crear orden** vuelve a cuadrar la liquidación en el servidor, arma el **PDF**, lo guarda en la **carpeta de la cuenta** y lo abre en el visor (desde ahí se descarga). Si corriges algo, toca **Crear de nuevo**. Todavía no le avisa a nadie.",
"accion": "",
"estado": "",
"activo": true,
"orden": 20
},
{
"id": "CB-ORDEN-CREADA",
"app": "CONTABILIDAD",
"vista": "orden,ordenes",
"titulo": "¿Qué hace Orden creada?",
"frases": [
"que hace orden creada",
"orden creada",
"pasar a tesoreria",
"avisar a tesoreria",
"terminar la orden",
"enviar la orden",
"ya cree la orden y ahora"
],
"respuesta": "**Orden creada** pasa la cuenta a **ORDEN DE PAGO** y en los próximos minutos les llega el aviso al **contratista** y a **Tesorería**. Solo se activa después de **Crear orden**. La cuenta sale de tu lista.",
"accion": "",
"estado": "",
"activo": true,
"orden": 21
},
{
"id": "CB-SIN-CONTRATO",
"app": "CONTABILIDAD",
"vista": "orden,perfil",
"titulo": "¿Qué firma sale si no tengo contrato?",
"frases": [
"sin contrato",
"que firma sale",
"firma de oficina",
"no tengo contrato",
"a nombre de quien sale",
"usuario contabilidad"
],
"respuesta": "Si el administrador te marcó **SIN CONTRATO**, la orden sale con la **firma y el nombre del usuario OFICINA**, y hacia el contratista se lee **Usuario Contabilidad**. En tu pantalla no cambia nada: creas la orden igual y por dentro queda que la hiciste tú (en **Mis registros** y en el informe gerencial).",
"accion": "",
"estado": "",
"activo": true,
"orden": 22
},
{
"id": "CB-VENCIMIENTO",
"app": "CONTABILIDAD",
"vista": "orden",
"titulo": "Avisar vencimiento al supervisor",
"frases": [
"avisar vencimiento",
"cierre de mes",
"vence la cuenta",
"avisar al supervisor",
"radicar hoy los paquetes"
],
"respuesta": "En la cuenta toca **Avisar vencimiento**: se le escribe al grupo del **supervisor** que esa cuenta vence por cierre de mes y debe radicar hoy los paquetes. Antes de enviar te pide confirmar.",
"accion": "",
"estado": "",
"activo": true,
"orden": 23
},
{
"id": "CB-VER-INFORME",
"app": "CONTABILIDAD",
"vista": "orden,ordenes",
"titulo": "Ver el informe y los documentos de la cuenta",
"frases": [
"ver informe de supervision",
"ver la factura",
"ver el acta",
"documentos de la cuenta",
"abrir el informe",
"ver soportes"
],
"respuesta": "Toca **Ver informe** en la tarjeta o en la orden: se abren en el visor el **informe de supervisión** y, si los hay, la **factura electrónica**, el **acta final** y la **orden de pago** ya creada.",
"accion": "",
"estado": "",
"activo": true,
"orden": 24
},
{
"id": "CB-FIRMA",
"app": "CONTABILIDAD",
"vista": "inicio,perfil,orden",
"titulo": "¿Por qué no puedo crear órdenes? (firma)",
"frases": [
"falta la firma",
"subir mi firma",
"no puedo crear ordenes",
"firma del contador",
"firma de elaboro",
"mi firma",
"cambiar la firma"
],
"respuesta": "{{firmas}}",
"accion": "ir:perfil",
"estado": "",
"activo": true,
"orden": 25
},
{
"id": "CB-FIRMA-FOTO",
"app": "CONTABILIDAD",
"vista": "perfil",
"titulo": "¿Cómo tomo bien la foto de la firma?",
"frases": [
"foto de la firma",
"como tomo la firma",
"la firma sale fea",
"quitar el fondo de la firma",
"firma con fondo"
],
"respuesta": "Firma con **tinta negra o azul oscura** en una hoja **blanca**, con buena luz y sin sombras. Toma la foto de cerca y derecha (o arrástrala o pégala). La app quita el fondo y la recorta; antes de guardar ves cómo queda.",
"accion": "ir:perfil",
"estado": "",
"activo": true,
"orden": 26
},
{
"id": "CB-REGISTROS",
"app": "CONTABILIDAD",
"vista": "inicio,registros",
"titulo": "Descargar las órdenes que he hecho",
"frases": [
"mis registros",
"ordenes que hice",
"descargar ordenes",
"historial de ordenes",
"excel de ordenes",
"pdf de ordenes",
"lo que he hecho",
"informe gerencial"
],
"respuesta": "En **MIS REGISTROS** escoges el periodo (y, si eres el contador, todos los contables o uno) y descargas en **PDF** membretado, **Excel** (una fila por orden) o el **informe gerencial**.",
"accion": "ir:registros",
"estado": "",
"activo": true,
"orden": 27
},
{
"id": "CB-PERIODO",
"app": "CONTABILIDAD",
"vista": "registros",
"titulo": "Resúmeme el periodo",
"frases": [
"resumeme el periodo",
"cuantas ordenes este mes",
"total del periodo",
"descuentos del mes",
"cuanto se giro este mes"
],
"respuesta": "{{periodo}}",
"accion": "ir:registros",
"estado": "",
"activo": true,
"orden": 28
},
{
"id": "CB-QUIEN-MAS",
"app": "CONTABILIDAD",
"vista": "registros",
"titulo": "¿Quién elaboró más órdenes?",
"frases": [
"quien elaboro mas",
"quien hizo mas ordenes",
"ordenes por contable",
"ranking de contables"
],
"respuesta": "{{quienMas}}",
"accion": "ir:registros",
"estado": "",
"activo": true,
"orden": 29
},
{
"id": "CB-CONTRATISTAS",
"app": "CONTABILIDAD",
"vista": "inicio,contratistas",
"titulo": "Buscar un contratista",
"frases": [
"buscar un contratista",
"ver contratistas",
"lista de contratistas",
"ficha del contratista",
"datos del contratista",
"whatsapp del contratista",
"drive del contratista"
],
"respuesta": "En **CONTRATISTAS** están todos los contratos de la Alcaldía (empieza en los **activos**). Busca por nombre, documento o contrato. Cada tarjeta trae **Detalles**, **Informe**, **Requerimiento**, WhatsApp y Drive.",
"accion": "ir:contratistas",
"estado": "",
"activo": true,
"orden": 30
},
{
"id": "CB-ACTIVOS",
"app": "CONTABILIDAD",
"vista": "inicio,contratistas",
"titulo": "¿Cuántos contratos activos hay?",
"frases": [
"cuantos contratos activos hay",
"contratos activos",
"cuantos contratistas hay",
"total de contratos"
],
"respuesta": "{{activos}}",
"accion": "ir:activos",
"estado": "",
"activo": true,
"orden": 31
},
{
"id": "CB-POR-VENCER",
"app": "CONTABILIDAD",
"vista": "contratistas",
"titulo": "¿Cuáles terminan pronto?",
"frases": [
"cuales terminan pronto",
"contratos por vencer",
"contratos que terminan",
"se acaba el contrato",
"proximos a terminar"
],
"respuesta": "{{porVencer}}",
"accion": "ir:activos",
"estado": "",
"activo": true,
"orden": 32
},
{
"id": "CB-SIN-FECHAS",
"app": "CONTABILIDAD",
"vista": "contratistas,contratista",
"titulo": "¿A quién le faltan fechas o datos?",
"frases": [
"a quien le faltan fechas",
"sin fecha de inicio",
"contrato incompleto",
"le faltan datos",
"que le falta al contrato"
],
"respuesta": "{{sinFechas}}",
"accion": "ir:activos",
"estado": "",
"activo": true,
"orden": 33
},
{
"id": "CB-VARIOS",
"app": "CONTABILIDAD",
"vista": "contratistas,contratista",
"titulo": "¿Quién tiene varios contratos?",
"frases": [
"quien tiene varios contratos",
"dos contratos",
"mismo contratista dos veces",
"sale dos veces"
],
"respuesta": "{{varios}}",
"accion": "ir:contratistas",
"estado": "",
"activo": true,
"orden": 34
},
{
"id": "CB-INFORME",
"app": "CONTABILIDAD",
"vista": "inicio,contratistas,contratista,informe",
"titulo": "Descargar el informe de cuentas de un contratista",
"frases": [
"descargar informe",
"informe de cuentas",
"cuentas de un contratista",
"excel del contratista",
"pdf del contratista",
"historial de pagos del contratista",
"saldo del contrato"
],
"respuesta": "En **CONTRATISTAS** toca **Informe** en la tarjeta del contrato: ves valor, cobrado, pagado y saldo, y descargas el **PDF** (por bloques, con las actividades si quieres) o el **Excel** (una fila por cuenta). Nunca se mezclan dos contratos de la misma persona.",
"accion": "ir:contratistas",
"estado": "",
"activo": true,
"orden": 35
},
{
"id": "CB-COMO-VA",
"app": "CONTABILIDAD",
"vista": "informe",
"titulo": "¿Cómo va este contrato?",
"frases": [
"como va este contrato",
"cuanto ha cobrado",
"cuanto le han pagado",
"saldo por ejecutar",
"avance del contrato"
],
"respuesta": "{{comoVa}}",
"accion": "",
"estado": "",
"activo": true,
"orden": 36
},
{
"id": "CB-SALDOS",
"app": "CONTABILIDAD",
"vista": "informe",
"titulo": "¿Cuadran los saldos?",
"frases": [
"cuadran los saldos",
"saldo no cuadra",
"revisar saldos",
"saldo anterior",
"nuevo saldo"
],
"respuesta": "{{saldos}}",
"accion": "",
"estado": "",
"activo": true,
"orden": 37
},
{
"id": "CB-REQUERIMIENTO",
"app": "CONTABILIDAD",
"vista": "inicio,requerimientos,contratistas,contratista",
"titulo": "Pedirle algo a un contratista",
"frases": [
"requerimiento",
"pedirle algo al contratista",
"enviar un requerimiento",
"solicitar documentos",
"requerir",
"pedir la factura"
],
"respuesta": "En **REQUERIMIENTOS** eliges a quién (o marcas varios, máximo 20) y redactas una vez. Le llega como notificación y por WhatsApp, firmado como Contabilidad, y queda en su buzón. En **Historial** lo marcas **atendido** cuando lo resuelva.",
"accion": "ir:requerimientos",
"estado": "",
"activo": true,
"orden": 38
},
{
"id": "CB-REQ-ABIERTOS",
"app": "CONTABILIDAD",
"vista": "requerimientos",
"titulo": "¿Cuántos requerimientos siguen abiertos?",
"frases": [
"cuantos siguen abiertos",
"requerimientos abiertos",
"requerimientos sin atender",
"quien no ha respondido"
],
"respuesta": "{{reqAbiertos}}",
"accion": "ir:requerimientos",
"estado": "",
"activo": true,
"orden": 39
},
{
"id": "CB-COMUNICADO",
"app": "CONTABILIDAD",
"vista": "inicio,comunicados",
"titulo": "Publicar un comunicado",
"frases": [
"comunicado",
"publicar un aviso",
"avisar a todos los contratistas",
"enviar un mensaje a todos",
"circular"
],
"respuesta": "En **COMUNICADOS** toca **Nuevo comunicado**: escribe, adjunta documentos (PDF, fotos, Word, Excel…) y publica. Llega como notificación a los teléfonos de los contratistas. **Retirar** lo quita de su app sin borrarlo.",
"accion": "ir:comunicados",
"estado": "",
"activo": true,
"orden": 40
},
{
"id": "CB-CONFIG",
"app": "CONTABILIDAD",
"vista": "inicio,configuracion",
"titulo": "Configuración de retenciones",
"frases": [
"configuracion",
"retenciones",
"cambiar un porcentaje",
"agregar una retencion",
"regimen simple",
"convenio de cooperacion",
"reglas de la orden"
],
"respuesta": "En **CONFIGURACIÓN** se define cómo se liquida cada orden: las **retenciones** (código, porcentaje, base, si es automática o solo de la primera cuenta del tramo), las **cuentas contables** por tipo de contrato, el **catálogo** y las reglas de **Régimen Simple**, **Convenio de Cooperación** e **IVA**. Cada bloque tiene su botón **Guardar**.",
"accion": "ir:configuracion",
"estado": "",
"activo": true,
"orden": 41
},
{
"id": "CB-CONFIG-ON",
"app": "CONTABILIDAD",
"vista": "configuracion",
"titulo": "¿Qué retenciones están encendidas?",
"frases": [
"que retenciones estan encendidas",
"retenciones activas",
"lista de retenciones",
"porcentajes actuales"
],
"respuesta": "{{retenciones}}",
"accion": "ir:configuracion",
"estado": "",
"activo": true,
"orden": 42
},
{
"id": "CB-CONFIG-FALTA",
"app": "CONTABILIDAD",
"vista": "configuracion",
"titulo": "¿Qué falta por definir?",
"frases": [
"que falta por definir",
"retencion sin codigo",
"falta configurar",
"configuracion incompleta"
],
"respuesta": "{{faltaConfig}}",
"accion": "ir:configuracion",
"estado": "",
"activo": true,
"orden": 43
},
{
"id": "CB-PERMISOS",
"app": "CONTABILIDAD",
"vista": "inicio",
"titulo": "¿Qué puede hacer mi usuario?",
"frases": [
"que puedo hacer",
"mi rol",
"soy contable",
"soy el contador",
"no me sale el boton",
"no tengo permiso",
"por que no veo"
],
"respuesta": "{{permisos}}",
"accion": "soporte",
"estado": "",
"activo": true,
"orden": 44
},
{
"id": "CB-FOTO",
"app": "CONTABILIDAD",
"vista": "",
"titulo": "Cambiar mi foto",
"frases": [
"cambiar mi foto",
"foto de perfil",
"poner foto",
"mi imagen"
],
"respuesta": "Toca tu foto (o tus iniciales) en el saludo, o el menú de tu perfil → **Foto de perfil**. Es la misma en todas las apps de la Alcaldía.",
"accion": "foto",
"estado": "",
"activo": true,
"orden": 45
},
{
"id": "CB-CLAVE",
"app": "CONTABILIDAD",
"vista": "",
"titulo": "Cambiar mi contraseña",
"frases": [
"cambiar mi contraseña",
"cambiar la clave",
"actualizar contraseña",
"nueva contraseña"
],
"respuesta": "Desde el menú de tu perfil → **Actualizar contraseña**.",
"accion": "clave",
"estado": "",
"activo": true,
"orden": 46
},
{
"id": "CB-INSTALAR",
"app": "CONTABILIDAD",
"vista": "",
"titulo": "Instalar la app",
"frases": [
"instalar la app",
"poner la app en el celular",
"acceso directo",
"descargar la app"
],
"respuesta": "Puedes instalarla en tu teléfono o computador para abrirla como una app más.",
"accion": "instalar",
"estado": "",
"activo": true,
"orden": 47
},
{
"id": "CB-AVISOS",
"app": "CONTABILIDAD",
"vista": "",
"titulo": "¿Me llegan los avisos al teléfono?",
"frases": [
"avisos al telefono",
"notificaciones",
"no me llegan avisos",
"activar notificaciones"
],
"respuesta": "{{avisosTelefono}}",
"accion": "",
"estado": "",
"activo": true,
"orden": 48
},
{
"id": "CB-GUIA",
"app": "CONTABILIDAD",
"vista": "",
"titulo": "Guía rápida en PDF",
"frases": [
"guia rapida",
"manual",
"instructivo",
"como se usa la app",
"tutorial"
],
"respuesta": "Aquí tienes la **guía rápida** de Contabilidad en PDF.",
"accion": "guia",
"estado": "",
"activo": true,
"orden": 49
},
{
"id": "CB-SOPORTE",
"app": "CONTABILIDAD",
"vista": "",
"titulo": "Hablar con soporte",
"frases": [
"soporte",
"tengo un problema",
"no funciona",
"reportar un error",
"ayuda tecnica",
"hablar con alguien"
],
"respuesta": "Cuéntale a **soporte** qué pasó: llega al equipo de desarrollo y te responden en la app.",
"accion": "soporte",
"estado": "",
"activo": true,
"orden": 50
},
{
"id": "CBE-OLVIDE",
"app": "CONTABILIDAD",
"vista": "entrada",
"titulo": "Olvidé mi contraseña",
"frases": [
"olvide mi contraseña",
"no me acuerdo la clave",
"recuperar contraseña",
"perdi la contraseña",
"clave incorrecta"
],
"respuesta": "Escribe tu **documento** y toca **Olvidé mi contraseña**: te llega una nueva por WhatsApp.",
"accion": "olvide",
"estado": "",
"activo": true,
"orden": 51
},
{
"id": "CBE-ENTRAR",
"app": "CONTABILIDAD",
"vista": "entrada",
"titulo": "¿Cómo entro?",
"frases": [
"como entro",
"como ingreso",
"iniciar sesion",
"no puedo entrar",
"usuario y contraseña"
],
"respuesta": "Entra con tu **documento** (sin puntos) y tu **contraseña**. Si no la tienes o no te funciona, usa **Olvidé mi contraseña**.",
"accion": "documento",
"estado": "",
"activo": true,
"orden": 52
},
{
"id": "CBE-ACCESO",
"app": "CONTABILIDAD",
"vista": "entrada",
"titulo": "No tengo acceso a Contabilidad",
"frases": [
"no tengo acceso",
"no tengo usuario",
"me dice que no tengo permiso",
"soy nuevo en contabilidad",
"crear usuario"
],
"respuesta": "Los usuarios de Contabilidad (contables y el contador) los crea el **administrador** del ecosistema. Pídeselo indicando tu nombre y documento. Si eres contratista, tu app es **Contratista**, no esta.",
"accion": "",
"estado": "",
"activo": true,
"orden": 53
},
{
"id": "CBE-INSTALAR",
"app": "CONTABILIDAD",
"vista": "entrada",
"titulo": "Instalar la app",
"frases": [
"instalar la app",
"poner la app en el celular",
"descargar la app",
"acceso directo"
],
"respuesta": "Puedes instalarla en tu teléfono o computador para abrirla como una app más.",
"accion": "instalar",
"estado": "",
"activo": true,
"orden": 54
},
{
"id": "CBE-QUE-ES",
"app": "CONTABILIDAD",
"vista": "entrada",
"titulo": "¿Para qué sirve esta app?",
"frases": [
"para que sirve",
"que es esta app",
"que hago aqui",
"que es contabilidad"
],
"respuesta": "**Contabilidad** es la app de la oficina contable: liquidar los descuentos de las cuentas con plan de pagos aceptado, crear la **orden de pago** en PDF y pasarla a Tesorería, y consultar contratistas y sus cuentas.",
"accion": "",
"estado": "",
"activo": true,
"orden": 55
}
];
