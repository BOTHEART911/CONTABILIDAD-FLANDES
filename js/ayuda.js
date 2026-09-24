/* ============================================================
   CONTABILIDAD-FLANDES · AYUDA POR VISTA (Insights)
   Ecosistema Flandes · Fase 7 (guías de las 11 vistas)

   El mismo patrón de CONTRATISTA y CONTRATACIÓN: cada vista tiene una
   GUÍA que habla de lo que hay en pantalla y PREGUNTAS RÁPIDAS con la
   respuesta calculada en el teléfono. Nada viaja al servidor ni pasa
   por una IA: los números salen de la lista que ya llegó.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var CTX = function () { return {}; };

  function ctx() { try { return CTX() || {}; } catch (e) { return {}; } }
  function nombre(s) {
    var t = K.piezas.personas ? K.piezas.personas.nombrePropio(s) : String(s || '');
    return t.replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); })
            .replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); });
  }
  function primerNombre(s) { return nombre(String(s || '').trim().split(/\s+/)[0] || ''); }
  function hola() { var y = ctx().yo || {}; return y.nombre ? primerNombre(y.nombre) + ', ' : ''; }
  function pesos(v) { return '$ ' + K.pesos(v || 0).replace(/^\$\s*/, ''); }
  function OR() { return window.ORDENES || null; }
  function RG() { return window.REGISTROS || null; }
  function CF() { return window.CONFIGURACION || null; }
  function cuentas() { return OR() ? OR()._cuentas().filter(function (c) { return !c.error; }) : []; }
  function soyOficina() { var r = K.norm((ctx().yo || {}).rol || ''); return r === 'OFICINA' || r === 'DEV'; }
  function tramoTxt(c) { var t = OR() ? (OR().TRAMO_TXT[c.tramo] || c.tramo) : c.tramo; return String(t || '').toLowerCase(); }

  function parseFecha(s) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(s || ''));
    return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
  }
  function diasDe(f) {
    var d = parseFecha(f); if (!d) return null;
    var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    return Math.round((hoy - d) / 864e5);
  }
  function listaCorta(filas, fmt, max) {
    max = max || 8;
    var t = filas.slice(0, max).map(fmt).join('\n');
    if (filas.length > max) t += '\n… y ' + (filas.length - max) + ' más.';
    return t;
  }

  var GUIAS = {

    inicio: function () {
      var n = OR() && OR()._cuentas && OR()._cuentas().length ? OR().contar() : null;
      var t = hola() + 'este es el inicio de Contabilidad. ';
      if (n && n.total) {
        t += 'Hay **' + n.total + ' cuentas cerradas** esperando orden de pago';
        if (n.primeras) t += ', **' + n.primeras + '** son la primera de su tramo (llevan estampillas)';
        if (n.cesion) t += ' y **' + n.cesion + '** traen RP de cesión';
        t += '. ';
      } else if (n) t += 'No hay cuentas esperando orden de pago ahora mismo. ';
      t += 'Toca una cifra del resumen y la lista se abre ya filtrada.';
      var f = ctx().arranque && ctx().arranque.firmas;
      if (f && !f.listo && f.faltan) t += ' Ojo: para crear órdenes falta ' + f.faltan.join(' y ') + '.';
      return {
        guia: t,
        botones: [
          { texto: '¿Cuál lleva más días esperando?', responde: function () {
              var c = cuentas();
              if (!c.length) return '¡Ninguna! No hay cuentas esperando orden de pago.';
              var o = c.slice().sort(function (a, b) { return (diasDe(b.radicada) || 0) - (diasDe(a.radicada) || 0); });
              return listaCorta(o, function (x) {
                var d = diasDe(x.radicada);
                return '· **' + nombre(x.nombre) + '** — cuenta ' + x.informe + (x.total ? ' de ' + x.total : '') + (d !== null ? ', radicada hace ' + d + (d === 1 ? ' día' : ' días') : '');
              }, 6);
            } },
          { texto: '¿Cuánto hay por girar?', responde: function () {
              var c = cuentas(), s = 0, n = 0;
              c.forEach(function (x) { s += Number(x.cobro) || 0; try { n += OR()._liquidar(x).neto; } catch (e) { n += Number(x.cobro) || 0; } });
              return c.length ? 'Las ' + c.length + ' cuentas cobran **' + pesos(s) + '**; con los descuentos sugeridos el neto a girar sería **' + pesos(n) + '**.' : 'No hay cuentas esperando orden de pago.';
            } },
          { texto: '¿Cómo cambio mi foto o mi firma?', responde: function () {
              return 'Toca tu foto (arriba a la derecha del saludo) para cambiarla. La **firma** está en **MI FIRMA Y MI FOTO**: sin ella no sale la orden de pago.';
            } }
        ]
      };
    },

    ordenes: function () {
      return {
        guia: 'Las cuentas con plan de pagos aceptado por Supervisión (estado CERRADA). Va de primero **Oscar Polania** y luego por fecha de radicación. ' +
              'Las pastillas separan las **primeras del tramo** (contrato primario, 1ª o 2ª adición: ahí van las estampillas Adulto Mayor y Procultura sobre el valor del tramo), las **demás**, las que traen **RP de cesión** y las que ya tienen la orden generada. ' +
              'Toca **Liquidar** para ver los descuentos, ajustarlos y crear la orden.',
        botones: [
          { texto: '¿Qué estoy viendo?', responde: function () {
              var f = OR() ? OR()._filtradas() : [];
              var p = f.filter(function (x) { return x.primera; }).length;
              return 'Estás viendo **' + f.length + '** ' + (f.length === 1 ? 'cuenta' : 'cuentas') + (p ? ', ' + p + ' primeras de su tramo' : '') + '.';
            } },
          { texto: '¿Cuáles llevan estampillas?', responde: function () {
              var c = cuentas().filter(function (x) { return x.primera; });
              if (!c.length) return 'Ninguna: no hay primeras cuentas de tramo esperando.';
              return listaCorta(c, function (x) { return '· **' + nombre(x.nombre) + '** — ' + tramoTxt(x) + ', base ' + pesos(x.base); }, 8);
            } },
          { texto: '¿Cuáles traen RP de cesión?', responde: function () {
              var c = cuentas().filter(function (x) { return x.cedido && x.rpCesion; });
              if (!c.length) return 'Ninguna cuenta en espera es de un contrato cedido con RP de cesión.';
              return listaCorta(c, function (x) { return '· **' + nombre(x.nombre) + '** — RP ' + x.rpCesion + (x.rpCesionUsado ? ' (ya usado)' : ''); }, 8);
            } }
        ]
      };
    },

    orden: function () {
      return {
        guia: 'La orden de pago de UNA cuenta. Todo se calcula en tu teléfono al instante: marca o desmarca cada descuento, cambia un valor a mano o escoge otra cuenta contable. ' +
              '**ReteICA** (0,9 % del cobro) va siempre. Las **estampillas** solo en la primera cuenta del tramo. Escribe solo los dígitos del **N° de orden** (1023 → 2026001023). ' +
              '**Crear orden** arma el PDF, lo guarda en la carpeta de la cuenta y lo descarga; **Orden creada** pasa la cuenta a ORDEN DE PAGO y avisa al contratista y a Tesorería.',
        botones: [
          { texto: 'Explícame los descuentos', responde: function () {
              var c = OR() && OR()._actual(); if (!c) return 'Abre una cuenta para ver su liquidación.';
              var l = OR()._liquidar(c);
              if (!l.aplicadas.length) return 'No hay descuentos marcados: se giraría el cobro completo, ' + pesos(l.cobro) + '.';
              return l.aplicadas.map(function (o) { return '· **' + o.nombre + '**: ' + String(o.porcentaje).replace('.', ',') + ' % de ' + pesos(o.base) + ' (' + (o.baseTipo === 'TRAMO' ? 'valor del tramo' : (o.baseTipo === 'IVA' ? 'IVA' : 'cobro')) + ') = ' + pesos(o.valor) + (o.editado ? ' ✎' : ''); }).join('\n') +
                '\nTotal descuentos **' + pesos(l.retenido) + '** · neto a girar **' + pesos(l.neto) + '**.';
            } },
          { texto: '¿Por qué no puedo marcar algo?', responde: function () {
              var c = OR() && OR()._actual(); if (!c) return 'Abre una cuenta.';
              var l = OR()._liquidar(c);
              var no = l.opciones.filter(function (o) { return !o.disponible || o.reemplazada; });
              return no.length ? no.map(function (o) { return '· **' + o.nombre + '**: ' + (o.reemplazada ? 'lo reemplaza ' + o.reemplazada : o.motivo); }).join('\n') : 'Todos los descuentos de este tipo de contrato están disponibles.';
            } },
          { texto: '¿Qué pasó en cuentas anteriores?', responde: function () {
              var c = OR() && OR()._actual(); if (!c) return 'Abre una cuenta.';
              var p = c.previo;
              if (!p) return 'No hay una orden anterior de este contrato con la que comparar.';
              return 'Los checks arrancan como en la cuenta ' + p.informe + (p.orden ? ' (orden ' + p.orden + ')' : '') +
                (p.inferido ? ': se dedujeron de lo que se le giró con la app anterior.' : ': es lo que se guardó al crear esa orden.') +
                (c.primera ? ' Como esta es la primera del tramo, las estampillas se sugieren aunque la anterior no las llevara.' : '');
            } }
        ]
      };
    },

    registros: function () {
      return {
        guia: soyOficina()
          ? 'Todas las órdenes de pago creadas. Escoge **todos los contables** o uno, el periodo, y descárgalas: el **PDF** membretado por bloques (agrupado por quien elaboró) y el **Excel** con una fila por orden.'
          : 'Las órdenes de pago que tú elaboraste. Escoge el periodo (o todas) y descárgalas en **PDF** membretado o en **Excel**.',
        botones: [
          { texto: 'Resúmeme el periodo', responde: function () {
              var r = RG(); if (!r || !r._datos()) return 'Todavía está cargando.';
              var f = r._filtradas(); if (!f.length) return 'No hay órdenes en este periodo.';
              var co = 0, ne = 0; f.forEach(function (x) { co += Number(x.cobro) || 0; ne += Number(x.neto) || 0; });
              return '**' + f.length + '** órdenes: cobro ' + pesos(co) + ', descuentos **' + pesos(co - ne) + '**, neto a girar **' + pesos(ne) + '**.';
            } },
          { texto: '¿Quién elaboró más?', responde: function () {
              var r = RG(); var f = r ? r._filtradas() : []; if (!f.length) return 'No hay órdenes en este periodo.';
              return listaCorta(top(f, 'elaboro', 99), function (x) { return '· **' + nombre(x.k) + '**: ' + x.n; }, 8);
            } },
          { texto: '¿Por mes?', responde: function () {
              var r = RG(); var f = r ? r._filtradas() : []; if (!f.length) return 'No hay órdenes en este periodo.';
              var m = {};
              f.forEach(function (x) { var k = String(x.fecha || '').slice(0, 7) || 'sin fecha'; m[k] = (m[k] || 0) + 1; });
              return Object.keys(m).sort().reverse().slice(0, 12).map(function (k) { return '· ' + k.split('-').reverse().join('/') + ': **' + m[k] + '**'; }).join('\n');
            } }
        ]
      };
    },

    configuracion: function () {
      return {
        guia: 'Aquí se define cómo se liquida cada orden: las **retenciones** (código, porcentaje, sobre qué base, si es automática o solo de la primera cuenta del tramo), las **cuentas contables** por tipo de contrato, el **catálogo** de cuentas para escoger a mano y las reglas de **Régimen Simple**, **Convenio de Cooperación** e **IVA**. Cada bloque tiene su botón Guardar.',
        botones: [
          { texto: '¿Qué retenciones están encendidas?', responde: function () {
              var c = CF() && CF()._cfg(); if (!c) return 'Todavía está cargando.';
              return (c.motor.retenciones || []).map(function (r) {
                return '· **' + r.nombre + '** ' + String(r.porcentaje).replace('.', ',') + ' %' + (r.activa === false ? ' (apagada)' : '') + (r.automatica ? ' · automática' : '') + (r.soloPrimeraCuenta ? ' · solo primera cuenta' : '') + (!r.codigo ? ' · ⚠ sin código' : '');
              }).join('\n');
            } },
          { texto: '¿Qué falta por definir?', responde: function () {
              var c = CF() && CF()._cfg(); if (!c) return 'Todavía está cargando.';
              var f = [];
              (c.motor.retenciones || []).forEach(function (r) {
                if (!r.codigo) f.push('el código contable de ' + r.nombre);
                if (r.activa !== false && !Number(r.porcentaje)) f.push('el porcentaje de ' + r.nombre);
                if (r.activa === false) f.push(r.nombre + ' está apagada');
              });
              return f.length ? '· ' + f.join('\n· ') : 'Nada: todas tienen código y porcentaje. ✓';
            } }
        ]
      };
    },

    perfil: function () {
      return {
        guia: 'Tu **firma** es la imagen que sale en la orden de pago: en **Elaboró** la de quien la crea y en **CONTADOR** la del usuario OFICINA. Sube una foto de tu firma en papel blanco, arrástrala o pégala: la app quita el fondo y la recorta. ' +
              'Tu **foto** es la misma en todas las apps de la Alcaldía.',
        botones: [
          { texto: '¿Cómo tomo bien la foto de la firma?', responde: function () {
              return 'Firma con **tinta negra o azul oscura** en una hoja **blanca**, con buena luz y sin sombras. Toma la foto de cerca y derecha. Antes de guardar ves cómo queda.';
            } }
        ]
      };
    }
  };

  /* ══════════════ las vistas de oficina (las de Supervisión 6.3) ══════════════ */
  function CT() { return window.CONTRATISTAS || null; }
  function todas() { return CT() ? CT().todas() : []; }
  function top(filas, campo, n) {
    var m = {};
    filas.forEach(function (f) { var v = f[campo] || 'SIN DATO'; m[v] = (m[v] || 0) + 1; });
    return Object.keys(m).sort(function (a, b) { return m[b] - m[a]; }).slice(0, n || 99).map(function (k) { return { k: k, n: m[k] }; });
  }
  function fechaIso(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
  function RQ() { return window.REQS || null; }
  function CM() { return window.COMUS || null; }
  function IN() { return window.INFORME || null; }

  GUIAS.contratistas = function () {
    return {
      guia: 'Todos los contratos de la Alcaldía. Empiezas viendo los **activos**; las pastillas cambian a inactivos o todos y suman **adicionados** o **cedidos**. ' +
            'En cada tarjeta: **Detalles** (la ficha), **Informe** (sus cuentas en PDF o Excel), **Requerimiento**, WhatsApp y Drive. Un contratista con dos contratos sale dos veces: cada tarjeta es un contrato.',
      botones: [
        { texto: '¿Qué estoy viendo?', responde: function (f) {
            var c = CT();
            return 'Estás viendo **' + f.length + '** ' + (f.length === 1 ? 'contrato' : 'contratos') + (c ? ': ' + c._filtros() : '') + '.';
          } },
        { texto: '¿Quiénes terminan pronto?', responde: function (f) {
            var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
            var p = f.filter(function (x) { var d = parseFecha(x.fin); return x.estado === 'ACTIVO' && d && (d - hoy) / 864e5 <= 30; });
            if (!p.length) return 'Ningún contrato activo en pantalla termina en los próximos 30 días.';
            return listaCorta(p, function (x) { return '· **' + nombre(x.nombre) + '** — contrato ' + x.contrato + ', termina el ' + x.fin; }, 8);
          } },
        { texto: '¿A quién le faltan fechas?', responde: function (f) {
            var s = f.filter(function (x) { return x.estado === 'ACTIVO' && (!x.inicio || !x.fin); });
            if (!s.length) return 'Todos los activos en pantalla tienen fecha de inicio y de terminación.';
            return 'Sin fecha de inicio o de terminación (sin ellas no salen sus formatos):\n' + listaCorta(s, function (x) { return '· **' + nombre(x.nombre) + '** — contrato ' + x.contrato; });
          } },
        { texto: '¿Los que tienen varios contratos?', responde: function () {
            var m = {};
            todas().forEach(function (x) { (m[x.doc] = m[x.doc] || []).push(x); });
            var v = Object.keys(m).filter(function (d) { return m[d].length > 1; });
            if (!v.length) return 'Nadie tiene más de un contrato.';
            return listaCorta(v, function (d) { return '· **' + nombre(m[d][0].nombre) + '** — ' + m[d].map(function (x) { return x.contrato + ' (' + x.estado.toLowerCase() + ')'; }).join(', '); });
          } }
      ],
      filas: function () { return CT() ? CT()._visibles() : []; },
      filtros: function () { return CT() ? CT()._filtros() : ''; },
      medidas: [
        { titulo: 'Contratos', calcula: function (f) { return f.length; } },
        { titulo: 'Activos', calcula: function (f) { return f.filter(function (x) { return x.estado === 'ACTIVO'; }).length; } },
        { titulo: 'Adicionados', calcula: function (f) { return f.filter(function (x) { return x.adic; }).length; } }
      ]
    };
  };

  GUIAS.contratista = function () {
    return {
      guia: 'La ficha del contrato: lo mismo que ve el contratista en su app, más sus datos personales y de pago. Arriba tienes **Informe** para descargar sus cuentas y **Requerimiento** para pedirle algo.',
      botones: [
        { texto: '¿Qué le falta a este contrato?', responde: function () {
            var d = CT() ? CT()._ficha() : null;
            if (!d) return 'La ficha todavía está cargando.';
            var c = d.contrato || {}, p = d.datos || {}, falta = [];
            if (!c.numProceso) falta.push('N° de proceso SECOP II');
            if (!c.fechaInicio) falta.push('fecha de inicio');
            if (!c.fechaTermino) falta.push('fecha de terminación');
            if (!c.rp) falta.push('RP');
            if (!p.firma) falta.push('firma');
            if (!p.numeroCuenta || !p.banco) falta.push('cuenta bancaria');
            if (!p.eps || !p.arl) falta.push('EPS o ARL');
            return falta.length ? 'Le falta: **' + falta.join(', ') + '**. Lo diligencia el contratista desde su app.' : 'No le falta nada: el contrato y sus datos están completos.';
          } }
      ]
    };
  };

  GUIAS.informe = function () {
    return {
      guia: 'Las cuentas de UN contrato (nunca se mezclan dos contratos de la misma persona). Arriba: valor, cobrado, pagado y saldo. ' +
            '**PDF** es un informe para leer, por bloques (puedes sumarle las actividades de cada obligación). **Excel** trae una fila por cuenta con todas las columnas, las mismas de Supervisión y Tesorería.',
      botones: [
        { texto: '¿Cómo va este contrato?', responde: function () {
            var d = IN() && IN()._datos(); if (!d) return 'Todavía está cargando.';
            var k = K.piezas.informeCuentas.cifras(d);
            return '**' + k.cuentas + '** cuentas' + (k.total ? ' de ' + k.total : '') + ': cobrado **' + pesos(k.cobrado) + '** (' + k.avance + '% del contrato), pagado **' + pesos(k.pagado) + '**, en trámite ' + pesos(k.enTramite) + '. Saldo por ejecutar **' + pesos(k.saldo) + '**.';
          } },
        { texto: '¿Cuál fue la última cuenta?', responde: function () {
            var d = IN() && IN()._datos(); if (!d || !d.cuentas.length) return 'Este contrato todavía no tiene cuentas.';
            var x = d.cuentas[d.cuentas.length - 1];
            return 'La **' + x.informe + (x.total ? ' de ' + x.total : '') + '**: ' + x.estado.toLowerCase() + ', ' + pesos(x.cobro) + (x.radicada ? ', radicada el ' + fechaIso(x.radicada) : '') +
              (x.egreso ? '. Egreso ' + x.egreso + (x.fechaEgreso ? ' del ' + fechaIso(x.fechaEgreso) : '') : '') + '.';
          } },
        { texto: '¿Cuadran los saldos?', responde: function () {
            var d = IN() && IN()._datos(); if (!d || !d.cuentas.length) return 'No hay cuentas.';
            var mal = [];
            d.cuentas.forEach(function (x, i) {
              if (Math.abs((x.saldo - x.cobro) - x.nuevo) > 1) mal.push('cuenta ' + x.informe + ': ' + pesos(x.saldo) + ' − ' + pesos(x.cobro) + ' ≠ ' + pesos(x.nuevo));
              var a = d.cuentas[i - 1];
              if (a && Math.abs(a.nuevo - x.saldo) > 1) mal.push('la ' + a.informe + ' dejó ' + pesos(a.nuevo) + ' y la ' + x.informe + ' arrancó en ' + pesos(x.saldo));
            });
            return mal.length ? '⚠ ' + mal.join('\n⚠ ') : 'Sí: cada saldo menos su cobro da el nuevo saldo y cada cuenta arranca donde terminó la anterior. ✓';
          } }
      ]
    };
  };

  GUIAS.requerimientos = function () {
    return {
      guia: 'En **Contratistas** eliges a quién pedirle algo (todos los contratistas): **Redactar**, o marca varios y redacta una sola vez (máximo 20). ' +
            'Le llega como notificación y por WhatsApp, firmado como Contabilidad, y queda en su buzón. En **Historial** lo marcas **atendido** cuando lo resuelva.',
      botones: [
        { texto: '¿Cuántos siguen abiertos?', responde: function () {
            var d = RQ() && RQ()._datos(); if (!d) return 'Todavía está cargando.';
            var ab = d.lista.filter(function (r) { return r.estado !== 'ATENDIDO'; });
            if (!d.lista.length) return 'Todavía no has hecho requerimientos desde Contabilidad.';
            return ab.length ? '**' + ab.length + '** abiertos de ' + d.lista.length + '.' : 'Ninguno: los ' + d.lista.length + ' están atendidos. ✓';
          } },
        { texto: '¿A quién no le llegó el aviso?', responde: function () {
            var d = RQ() && RQ()._datos(); if (!d) return 'Todavía está cargando.';
            var m = d.lista.filter(function (r) { return /falló|SIN/.test(r.aviso || ''); });
            return m.length ? listaCorta(m, function (r) { return '· **' + nombre(r.nombre) + '** (' + r.id + '): ' + r.aviso; }, 6) : 'A todos les salió el aviso por algún canal. ✓';
          } }
      ]
    };
  };

  GUIAS.comunicados = function () {
    return {
      guia: 'Toca **Nuevo comunicado**: escribe, adjunta documentos (PDF, fotos, Word, Excel…) y publica. Llega como notificación a los teléfonos de los contratistas. **Retirar** lo quita de su app sin borrarlo.',
      botones: [
        { texto: '¿Cuántos teléfonos lo reciben?', responde: function () {
            var d = CM() && CM()._datos(); if (!d) return 'Todavía está cargando.';
            return (d.telefonos === null || d.telefonos === undefined) ? 'No pude contar los teléfonos ahora.' : '**' + d.telefonos + '** teléfonos de contratistas tienen los avisos activados.';
          } },
        { texto: '¿Qué he publicado yo?', responde: function () {
            var d = CM() && CM()._datos(); if (!d) return 'Todavía está cargando.';
            var m = d.lista.filter(function (c) { return c.mio; });
            return m.length ? listaCorta(m, function (c) { return '· ' + (c.fecha ? fechaIso(c.fecha) + ' · ' : '') + (c.estado === 'RETIRADO' ? '(retirado) ' : '') + '«' + String(c.texto || '').slice(0, 60) + '»'; }, 6)
                            : 'Todavía no has publicado comunicados.';
          } }
      ]
    };
  };


  var TITULOS = { inicio: 'Tu inicio', ordenes: 'Órdenes de pago', orden: 'Orden de pago', registros: 'Registros',
                  contratistas: 'Contratistas', contratista: 'Ficha del contratista', informe: 'Informe de cuentas',
                  requerimientos: 'Requerimientos', comunicados: 'Comunicados', configuracion: 'Configuración', perfil: 'Mi firma y mi foto' };

  function montar(vista, extra) {
    if (!K.piezas.insights) return;
    var g = GUIAS[vista];
    if (!g) return;
    var base = g();
    var cfg = {
      vista: (extra && extra.vista) || TITULOS[vista] || vista,
      guia: function () { return g().guia; },
      botones: base.botones || [],
      alto: !!base.alto
    };
    if (base.filas) { cfg.filas = base.filas; cfg.medidas = base.medidas; cfg.filtros = base.filtros; }
    K.piezas.insights.montar(cfg);
  }

  window.AYUDA = {
    configurar: function (fn) { if (typeof fn === 'function') CTX = fn; },
    montar: montar,
    tiene: function (v) { return !!GUIAS[v]; },
    _guias: GUIAS
  };
}());
