/* ============================================================
   CONTABILIDAD-FLANDES · ADAPTADOR DEL ASISTENTE DE AYUDA
   24/10/2026 · entrega 5 (la pieza es la misma de CONTRATISTA,
   SUPERVISIÓN y CONTRATACIÓN)

   La pieza kit/asistente.js no sabe nada de esta app. Aquí se le dice:
     · a dónde puede llevar (destino), con qué rótulo y con qué pastilla
       de la lista de órdenes ya puesta (primeras del tramo, RP de cesión,
       orden ya generada…),
     · qué está cerrado y por qué (puerta): el permiso de la vista
       (llave PERMISOS de CONFIG, igual que el menú y el enrutador),
     · lo más urgente al abrir (urgente): la firma que falta para crear
       órdenes → órdenes generadas sin marcar ORDEN CREADA → cuentas en
       plan de pagos que llevan 5 días o más → cuentas esperando orden,
     · los datos reales de las respuestas ({{clave}}).

   TODO sale de lo que la app ya trajo: el arranque (con el estado de las
   firmas), la lista de órdenes que el inicio pide para su burbuja y, si
   la persona ya los abrió, contratistas, informe, registros,
   requerimientos y configuración. Ningún dato viaja al servidor para
   responder.

   La base embebida (js/asistente-base.js) es el respaldo para la primera
   apertura y la pantalla de entrada; la del CORE la reemplaza en cuanto
   llega con el arranque (solo cuando cambia su sello).
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  if (!K || !K.piezas.asistente) return;

  var TARDE = 5;   /* días desde la radicación: la lista ya los pinta en rojo desde 5 */

  function APP() { return window.CONTABILIDAD_APP || {}; }
  function ar() { try { return (APP().arranque && APP().arranque()) || {}; } catch (e) { return {}; } }
  function yo() { try { return (APP().yo && APP().yo()) || {}; } catch (e) { return {}; } }
  function OR() { return window.ORDENES || null; }
  function RG() { return window.REGISTROS || null; }
  function CF() { return window.CONFIGURACION || null; }
  function CT() { return window.CONTRATISTAS || null; }
  function RQ() { return window.REQS || null; }
  function IN() { return window.INFORME || null; }

  function listaLista() { var o = OR(); try { return !!(o && o._hora && o._hora()); } catch (e) { return false; } }
  function cuentas() { var o = OR(); try { return o ? o._cuentas().filter(function (c) { return !c.error; }) : []; } catch (e) { return []; } }
  function contratos() { var c = CT(); try { return c && c.todas ? c.todas() : []; } catch (e) { return []; } }
  function activos() { return contratos().filter(function (f) { return f.estado === 'ACTIVO'; }); }

  function nombre(s) {
    var t = K.piezas.personas ? K.piezas.personas.nombrePropio(s) : String(s || '');
    return t.replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); })
            .replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); });
  }
  function pesos(v) { return '$ ' + K.pesos(v || 0).replace(/^\$\s*/, ''); }
  function plural(n, uno, varios) { return n + ' ' + (n === 1 ? uno : varios); }
  function fecha(f) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(f || ''));
    return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
  }
  function hoy() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function diasDe(f) { var d = fecha(f); return d ? Math.round((hoy() - d) / 864e5) : null; }
  function lista(filas, fmt, max) {
    max = max || 5;
    var t = filas.slice(0, max).map(fmt).join('\n');
    if (filas.length > max) t += '\n… y ' + (filas.length - max) + ' más.';
    return t;
  }
  function tramoTxt(c) { var t = OR() ? (OR().TRAMO_TXT[c.tramo] || c.tramo) : c.tramo; return String(t || '').toLowerCase(); }
  function linea(x) {
    var d = diasDe(x.radicada);
    return '· **' + nombre(x.nombre) + '** — cuenta ' + x.informe + (x.total ? ' de ' + x.total : '') +
      (d !== null && d >= 0 ? ', radicada hace ' + plural(d, 'día', 'días') : '');
  }
  function porAntiguedad(c) { return c.slice().sort(function (a, b) { return (diasDe(b.radicada) || 0) - (diasDe(a.radicada) || 0); }); }

  var CARGANDO = 'Las cuentas todavía están llegando: pregúntame de nuevo en un momento.';
  var ABRE_CT = 'Abre **CONTRATISTAS** y vuelve a preguntarme: la lista de contratos se trae al entrar ahí.';

  /* ---------- permisos ---------- */

  function puede(perm) { try { return APP().puede ? APP().puede(perm) : true; } catch (e) { return true; } }

  /* ---------- lo de la lista de órdenes ---------- */

  function atrasadas() { return porAntiguedad(cuentas().filter(function (c) { var d = diasDe(c.radicada); return d !== null && d >= TARDE; })); }
  function sinMarcar() { return cuentas().filter(function (c) { return c.urlOrden; }); }
  function firmasFaltan() {
    var f = ar().firmas;
    return f && !f.listo && f.faltan && f.faltan.length ? f : null;
  }

  /* ---------- lo más urgente al abrir ---------- */

  function urgente() {
    if (!puede('ordenesPago')) return null;
    var f = firmasFaltan();
    if (f) return { texto: 'Para crear órdenes de pago falta **' + f.faltan.join(' y ') + '**.', accion: f.yo && !f.yo.firma && puede('configuracion') ? 'ir:perfil' : 'soporte' };
    if (!listaLista()) return null;
    var p = sinMarcar();
    if (p.length) {
      return { texto: '**' + plural(p.length, 'orden ya está generada', 'órdenes ya están generadas') + '** y falta tocar **Orden creada** para pasarlas a Tesorería' +
        (p.length === 1 ? ': la de **' + nombre(p[0].nombre) + '**.' : '.'), accion: 'ir:ordPdf' };
    }
    var a = atrasadas();
    if (a.length) {
      var d = diasDe(a[0].radicada);
      return { texto: '**' + plural(a.length, 'cuenta lleva', 'cuentas llevan') + ' ' + TARDE + ' días o más** esperando orden de pago; la de **' +
        nombre(a[0].nombre) + '** se radicó hace ' + plural(d, 'día', 'días') + '.', accion: 'ir:ordenes' };
    }
    var n = cuentas().length;
    if (n) return { texto: 'Tienes **' + plural(n, 'cuenta esperando', 'cuentas esperando') + ' orden de pago**.', accion: 'ir:ordenes' };
    return null;
  }

  /* ---------- a dónde puede llevar ---------- */

  /* [rótulo, ruta, filtro de ÓRDENES DE PAGO | ruta con atajo] */
  var DESTINOS = {
    inicio:         ['Ir al inicio', 'inicio'],
    ordenes:        ['Ver las cuentas esperando orden', 'ordenes', { tramo: '' }],
    ordPrimeras:    ['Ver las primeras del tramo', 'ordenes', { tramo: 'primera' }],
    ordResto:       ['Ver las demás cuentas', 'ordenes', { tramo: 'resto' }],
    ordCesion:      ['Ver las que traen RP de cesión', 'ordenes', { tramo: 'cesion' }],
    ordPdf:         ['Ver las que tienen la orden generada', 'ordenes', { tramo: 'pdf' }],
    registros:      ['Ir a MIS REGISTROS', 'registros'],
    contratistas:   ['Ir a CONTRATISTAS', 'contratistas'],
    activos:        ['Ver los contratos activos', 'contratistas', null, 'contratistas/activos'],
    requerimientos: ['Ir a REQUERIMIENTOS', 'requerimientos'],
    comunicados:    ['Ir a COMUNICADOS', 'comunicados'],
    configuracion:  ['Ir a CONFIGURACIÓN', 'configuracion'],
    perfil:         ['Ir a MI FIRMA Y MI FOTO', 'perfil']
  };
  var NOMBRES = { ordenes: 'las órdenes de pago', ordPrimeras: 'las órdenes de pago', ordResto: 'las órdenes de pago', ordCesion: 'las órdenes de pago',
    ordPdf: 'las órdenes de pago', registros: 'MIS REGISTROS', contratistas: 'CONTRATISTAS', activos: 'CONTRATISTAS',
    requerimientos: 'REQUERIMIENTOS', comunicados: 'COMUNICADOS', configuracion: 'CONFIGURACIÓN', perfil: 'MI FIRMA Y MI FOTO' };

  function rutaActual() { return String(location.hash || '').replace(/^#\/?/, ''); }

  function destino(id) {
    var d = DESTINOS[id];
    if (!d) return null;
    return { etiqueta: d[0], ir: function () {
      if (d[2] && d[1] === 'ordenes' && OR() && OR().filtrar) OR().filtrar(d[2]);
      var r = d[3] || d[1];
      if (rutaActual() === r) { window.dispatchEvent(new HashChangeEvent('hashchange')); return; }
      location.hash = '#/' + r;
    } };
  }

  /** Lo cerrado se explica con el permiso que falta y se ofrece soporte. */
  function puerta(id) {
    var d = DESTINOS[id];
    if (!d || !d[1] || d[1] === 'inicio') return null;
    var perm = APP().permiso ? APP().permiso(d[1]) : d[1];
    if (!puede(perm)) {
      return { texto: 'Tu usuario no tiene permiso para **' + (NOMBRES[id] || id) + '**. Si lo necesitas, pídeselo al administrador.', accion: 'soporte' };
    }
    return null;
  }

  /* ---------- acciones que no son ir a una vista ---------- */

  function vistaTitulo() { try { return (APP().vistaActual && APP().vistaActual()) || ''; } catch (e) { return ''; } }

  function accion(a) {
    switch (a) {
      case 'guia': return { etiqueta: 'Descargar la guía rápida', icono: 'descargar', cierra: false, hacer: function () { if (K.piezas.guia) K.piezas.guia.descargar('CONTABILIDAD'); } };
      case 'soporte': return { etiqueta: 'Contarle a soporte', icono: 'salvavidas', hacer: function (p) {
        if (K.piezas.soporte) K.piezas.soporte.abrir({ vista: vistaTitulo(), texto: p ? 'Le pregunté al asistente: «' + p + '»\n' : '' });
      } };
      case 'foto': return { etiqueta: 'Cambiar mi foto', icono: 'camara', hacer: function () { if (APP().abrirFoto) APP().abrirFoto(); } };
      case 'clave': return { etiqueta: 'Actualizar contraseña', icono: 'llave', hacer: function () { K.piezas.sesion.cambiarClave(); } };
      case 'instalar': return { etiqueta: 'Instalar la app', icono: 'descargar', hacer: function () { if (K.piezas.instalar) K.piezas.instalar.abrir(); } };
      default: return null;
    }
  }

  /* ---------- los datos de las respuestas ---------- */

  function sinPermisoOrdenes() { return 'Tu usuario no hace órdenes de pago. Si lo necesitas, pídeselo al administrador.'; }

  function liqActual() {
    var o = OR(), c = o && o._actual ? o._actual() : null;
    if (!c || !o._liquidar) return null;
    try { return { c: c, l: o._liquidar(c) }; } catch (e) { return null; }
  }

  function textoPermisos() {
    var r = K.norm(yo().rol || '');
    if (r === 'DEV') return 'Tu usuario es **DEV**: entra a todo.';
    var rotulo = r === 'OFICINA' ? 'CONTADOR (OFICINA)' : (r || 'de Contabilidad');
    var si = [], no = [];
    [['ordenesPago', 'órdenes de pago'], ['registros', 'mis registros'], ['contratistas', 'contratistas e informes'],
     ['requerimientos', 'requerimientos'], ['comunicados', 'comunicados'], ['configuracion', 'configuración y firma']]
      .forEach(function (p) { (puede(p[0]) ? si : no).push(p[1]); });
    return 'Tu usuario es **' + rotulo + '**. Puede: ' + (si.join(', ') || 'consultar') + '.' +
      (r === 'OFICINA' ? ' Tu firma va como **CONTADOR** en todas las órdenes.' : '') +
      (no.length ? ' No tiene: ' + no.join(', ') + '. Los permisos los da el administrador.' : '');
  }

  function dato(k) {
    var c, n, s, f, d, o;
    switch (k) {
      case 'queMeToca':
        var u = urgente();
        if (u) return u.texto;
        if (puede('ordenesPago') && !listaLista()) return CARGANDO;
        return 'Por ahora **nada urgente**: no hay cuentas esperando orden de pago. ✓';
      case 'porHacer':
        if (!puede('ordenesPago')) return sinPermisoOrdenes();
        if (!listaLista()) return CARGANDO;
        n = OR().contar();
        if (!n.total) return '**Ninguna**: estás al día, no hay cuentas esperando orden de pago. ✓';
        return 'Hay **' + plural(n.total, 'cuenta esperando', 'cuentas esperando') + ' orden de pago**' +
          (n.primeras ? '; ' + plural(n.primeras, 'es primera', 'son primeras') + ' de su tramo (llevan estampillas)' : '') +
          (n.conPdf ? '; ' + plural(n.conPdf, 'ya tiene', 'ya tienen') + ' la orden generada' : '') + '. Te llevo a la lista.';
      case 'masAntigua':
        if (!puede('ordenesPago')) return sinPermisoOrdenes();
        if (!listaLista()) return CARGANDO;
        c = porAntiguedad(cuentas());
        if (!c.length) return '¡Ninguna! No hay cuentas esperando orden de pago. ✓';
        return 'Las que más llevan esperando:\n' + lista(c, linea);
      case 'atrasadas':
        if (!puede('ordenesPago')) return sinPermisoOrdenes();
        if (!listaLista()) return CARGANDO;
        c = atrasadas();
        if (!c.length) return 'Ninguna: todas las cuentas en espera se radicaron hace menos de ' + TARDE + ' días. ✓';
        return '**' + plural(c.length, 'cuenta lleva', 'cuentas llevan') + ' ' + TARDE + ' días o más** desde la radicación (en la lista salen en rojo):\n' + lista(c, linea, 6);
      case 'sinMarcar':
        if (!puede('ordenesPago')) return sinPermisoOrdenes();
        if (!listaLista()) return CARGANDO;
        c = sinMarcar();
        if (!c.length) return 'Ninguna: no hay órdenes generadas esperando el botón **Orden creada**. ✓';
        return 'Ya tienen la orden en PDF pero falta tocar **Orden creada** (sin eso Tesorería no las recibe):\n' +
          lista(c, function (x) { return '· **' + nombre(x.nombre) + '** — cuenta ' + x.informe + (x.orden ? ', orden ' + x.orden : ''); }, 6);
      case 'porGirar':
        if (!puede('ordenesPago')) return sinPermisoOrdenes();
        if (!listaLista()) return CARGANDO;
        c = cuentas(); s = 0; n = 0;
        if (!c.length) return 'No hay cuentas esperando orden de pago.';
        c.forEach(function (x) { s += Number(x.cobro) || 0; try { n += OR()._liquidar(x).neto; } catch (e) { n += Number(x.cobro) || 0; } });
        return 'Las ' + plural(c.length, 'cuenta', 'cuentas') + ' cobran **' + pesos(s) + '**; con los descuentos sugeridos el neto a girar sería **' + pesos(n) + '**.';
      case 'primeras':
        if (!listaLista()) return CARGANDO;
        c = cuentas().filter(function (x) { return x.primera; });
        if (!c.length) return 'Ninguna: no hay primeras cuentas de tramo esperando. Las estampillas (Adulto Mayor y Procultura) solo van en la primera cuenta de cada tramo, sobre el valor del tramo.';
        return 'Llevan estampillas (primera cuenta de su tramo):\n' + lista(c, function (x) { return '· **' + nombre(x.nombre) + '** — ' + tramoTxt(x) + ', base ' + pesos(x.base); }, 6);
      case 'cesion':
        if (!listaLista()) return CARGANDO;
        c = cuentas().filter(function (x) { return x.cedido && x.rpCesion; });
        if (!c.length) return 'Ninguna cuenta en espera es de un contrato cedido con RP de cesión.';
        return lista(c, function (x) { return '· **' + nombre(x.nombre) + '** — RP ' + x.rpCesion + (x.rpCesionUsado ? ' (ya usado)' : ''); }, 6) +
          '\nEn la orden, la casilla del RP de la cesión reemplaza el RP del tramo y queda sellado como usado.';
      case 'descuentos':
        o = liqActual();
        if (!o) return 'Abre una cuenta con **Liquidar** y te explico sus descuentos.';
        if (!o.l.aplicadas.length) return 'No hay descuentos marcados: se giraría el cobro completo, ' + pesos(o.l.cobro) + '.';
        return o.l.aplicadas.map(function (x) {
          var base = x.baseTipo === 'MANUAL' && window.MOTOR && MOTOR.pesosDec ? MOTOR.pesosDec(x.base) : pesos(x.base);
          var de = x.baseTipo === 'TRAMO' ? 'valor del tramo' : (x.baseTipo === 'IVA' ? 'IVA' : (x.baseTipo === 'MANUAL' ? 'base escrita' : 'cobro'));
          return '· **' + x.nombre + '**: ' + String(x.porcentaje).replace('.', ',') + ' % de ' + base + ' (' + de + ') = ' + pesos(x.valor) + (x.editado ? ' ✎' : '');
        }).join('\n') + '\nTotal descuentos **' + pesos(o.l.retenido) + '** · neto a girar **' + pesos(o.l.neto) + '**.';
      case 'noMarca':
        o = liqActual();
        if (!o) return 'Abre una cuenta con **Liquidar** y te digo qué descuentos no aplican y por qué.';
        f = o.l.opciones.filter(function (x) { return !x.disponible || x.reemplazada; });
        return f.length ? f.map(function (x) { return '· **' + x.nombre + '**: ' + (x.reemplazada ? 'lo reemplaza ' + x.reemplazada : x.motivo); }).join('\n')
                        : 'Todos los descuentos de este tipo de contrato están disponibles.';
      case 'anteriores':
        o = liqActual();
        if (!o) return 'Abre una cuenta con **Liquidar** y te cuento de dónde salen sus checks.';
        d = o.c.previo;
        if (!d) return 'No hay una orden anterior de este contrato con la que comparar: los checks son los sugeridos por la configuración.';
        return 'Los checks arrancan como en la cuenta ' + d.informe + (d.orden ? ' (orden ' + d.orden + ')' : '') +
          (d.inferido ? ': se dedujeron de lo que se le giró con la app anterior.' : ': es lo que se guardó al crear esa orden.') +
          (o.c.primera ? ' Como esta es la primera del tramo, las estampillas se sugieren aunque la anterior no las llevara.' : '');
      case 'firmas':
        f = firmasFaltan();
        if (!f) return 'Las firmas están completas: puedes crear órdenes de pago. ✓ Tu firma sale en **Elaboró** y la del usuario OFICINA en **CONTADOR**; la cambias en **MI FIRMA Y MI FOTO**.';
        return 'Para crear órdenes de pago falta **' + f.faltan.join(' y ') + '**.' +
          (f.yo && !f.yo.firma ? ' Sube la tuya en **MI FIRMA Y MI FOTO** (foto de tu firma en papel blanco).' : ' Esa firma la sube su dueño desde su app.');
      case 'periodo':
        if (!RG() || !RG()._datos()) return 'Abre **MIS REGISTROS** y vuelve a preguntarme: ahí se traen tus órdenes.';
        c = RG()._filtradas();
        if (!c.length) return 'No hay órdenes en el periodo escogido.';
        s = 0; n = 0; c.forEach(function (x) { s += Number(x.cobro) || 0; n += Number(x.neto) || 0; });
        return '**' + plural(c.length, 'orden', 'órdenes') + '** en el periodo: cobro ' + pesos(s) + ', descuentos **' + pesos(s - n) + '**, neto a girar **' + pesos(n) + '**.';
      case 'quienMas':
        if (!RG() || !RG()._datos()) return 'Abre **MIS REGISTROS** y vuelve a preguntarme: ahí se traen las órdenes.';
        c = RG()._filtradas();
        if (!c.length) return 'No hay órdenes en el periodo escogido.';
        var m = {};
        c.forEach(function (x) { var q = x.elaboro || 'SIN DATO'; m[q] = (m[q] || 0) + 1; });
        return Object.keys(m).sort(function (a, b) { return m[b] - m[a]; }).slice(0, 8).map(function (q) { return '· **' + nombre(q) + '**: ' + m[q]; }).join('\n');
      case 'activos':
        if (!contratos().length) return ABRE_CT;
        return 'Hay **' + plural(activos().length, 'contrato activo', 'contratos activos') + '** de ' + contratos().length + ' registrados.';
      case 'porVencer':
        if (!contratos().length) return ABRE_CT;
        var h = hoy(), en30 = new Date(h.getTime() + 30 * 864e5);
        c = activos().filter(function (x) { var dd = fecha(x.fin); return dd && dd >= h && dd <= en30; })
          .sort(function (a, b) { return fecha(a.fin) - fecha(b.fin); });
        if (!c.length) return 'Ningún contrato activo termina en los próximos 30 días.';
        return '**' + plural(c.length, 'contrato termina', 'contratos terminan') + '** en los próximos 30 días:\n' +
          lista(c, function (x) { return '· **' + nombre(x.nombre) + '** — contrato ' + x.contrato + ', el ' + x.fin; }, 6);
      case 'sinFechas':
        if (!contratos().length) return ABRE_CT;
        c = activos().filter(function (x) { return !x.inicio || !x.fin; });
        if (!c.length) return 'Todos los contratos activos tienen fecha de inicio y de terminación. Lo demás que le falte a uno lo ves en **Detalles**.';
        return '**' + plural(c.length, 'contrato activo no tiene', 'contratos activos no tienen') + '** fecha de inicio o de terminación:\n' +
          lista(c, function (x) { return '· **' + nombre(x.nombre) + '** — contrato ' + x.contrato; }, 6);
      case 'varios':
        if (!contratos().length) return ABRE_CT;
        var pd = {};
        contratos().forEach(function (x) { (pd[x.doc] = pd[x.doc] || []).push(x); });
        c = Object.keys(pd).filter(function (q) { return pd[q].length > 1; });
        if (!c.length) return 'Nadie tiene más de un contrato.';
        return 'Cada tarjeta es un contrato; estos tienen más de uno:\n' + lista(c, function (q) {
          return '· **' + nombre(pd[q][0].nombre) + '** — ' + pd[q].map(function (x) { return x.contrato + ' (' + String(x.estado || '').toLowerCase() + ')'; }).join(', ');
        }, 6);
      case 'comoVa':
        d = IN() && IN()._datos();
        if (!d || !K.piezas.informeCuentas) return 'Abre el **Informe** de un contrato y vuelve a preguntarme.';
        o = K.piezas.informeCuentas.cifras(d);
        return '**' + o.cuentas + '** cuentas' + (o.total ? ' de ' + o.total : '') + ': cobrado **' + pesos(o.cobrado) + '** (' + o.avance + '% del contrato), pagado **' + pesos(o.pagado) + '**, en trámite ' + pesos(o.enTramite) + '. Saldo por ejecutar **' + pesos(o.saldo) + '**.';
      case 'saldos':
        d = IN() && IN()._datos();
        if (!d) return 'Abre el **Informe** de un contrato y vuelve a preguntarme.';
        if (!d.cuentas || !d.cuentas.length) return 'Este contrato todavía no tiene cuentas.';
        var mal = [];
        d.cuentas.forEach(function (x, i) {
          if (Math.abs((x.saldo - x.cobro) - x.nuevo) > 1) mal.push('cuenta ' + x.informe + ': ' + pesos(x.saldo) + ' − ' + pesos(x.cobro) + ' ≠ ' + pesos(x.nuevo));
          var a = d.cuentas[i - 1];
          if (a && Math.abs(a.nuevo - x.saldo) > 1) mal.push('la ' + a.informe + ' dejó ' + pesos(a.nuevo) + ' y la ' + x.informe + ' arrancó en ' + pesos(x.saldo));
        });
        return mal.length ? '⚠ ' + mal.join('\n⚠ ') : 'Sí: cada saldo menos su cobro da el nuevo saldo y cada cuenta arranca donde terminó la anterior. ✓';
      case 'reqAbiertos':
        d = RQ() && RQ()._datos();
        if (!d) return 'Abre **REQUERIMIENTOS** y vuelve a preguntarme: ahí se trae el historial.';
        if (!d.lista || !d.lista.length) return 'Todavía no hay requerimientos hechos desde Contabilidad.';
        c = d.lista.filter(function (r) { return r.estado !== 'ATENDIDO'; });
        return c.length ? '**' + c.length + '** abiertos de ' + d.lista.length + ':\n' + lista(c, function (r) { return '· **' + nombre(r.nombre) + '**' + (r.fecha ? ' (' + (window.OFICINA && OFICINA.fecha ? OFICINA.fecha(r.fecha) : r.fecha) + ')' : ''); }, 6)
                        : 'Ninguno: los ' + d.lista.length + ' están atendidos. ✓';
      case 'retenciones':
        o = CF() && CF()._cfg();
        if (!o) return 'Abre **CONFIGURACIÓN** y vuelve a preguntarme: ahí se trae la configuración.';
        return (o.motor.retenciones || []).map(function (r) {
          return '· **' + r.nombre + '** ' + String(r.porcentaje).replace('.', ',') + ' %' + (r.activa === false ? ' (apagada)' : '') + (r.automatica ? ' · automática' : '') + (r.soloPrimeraCuenta ? ' · solo primera cuenta' : '') + (!r.codigo ? ' · ⚠ sin código' : '');
        }).join('\n');
      case 'faltaConfig':
        o = CF() && CF()._cfg();
        if (!o) return 'Abre **CONFIGURACIÓN** y vuelve a preguntarme: ahí se trae la configuración.';
        f = [];
        (o.motor.retenciones || []).forEach(function (r) {
          if (!r.codigo) f.push('el código contable de ' + r.nombre);
          if (r.activa !== false && !Number(r.porcentaje)) f.push('el porcentaje de ' + r.nombre);
          if (r.activa === false) f.push(r.nombre + ' está apagada');
        });
        return f.length ? '· ' + f.join('\n· ') : 'Nada: todas tienen código y porcentaje. ✓';
      case 'permisos': return textoPermisos();
      case 'avisosTelefono':
        var e = K.piezas.avisos ? K.piezas.avisos.estado() : '';
        if (e === 'listo') return 'Este teléfono **ya recibe avisos** de Contabilidad, aunque tengas la app cerrada.';
        if (e === 'ios-sin-instalar') return 'En iPhone los avisos solo llegan con la app **instalada** en la pantalla de inicio: menú de tu perfil → Instalar la app.';
        if (e === 'bloqueado') return 'Los avisos están **bloqueados** en este navegador: actívalos en los permisos del sitio (el candado junto a la dirección) y vuelve a abrir la app.';
        return 'Los avisos se activan solos al entrar: acepta el permiso de notificaciones cuando el teléfono lo pida.';
      case 'nombre': return nombre(String(yo().nombre || '').split(/\s+/)[0] || '');
      default: return '';
    }
  }

  function vista() {
    try { var cl = (K.piezas.insights.configuracion() || {}).clave; if (cl) return cl; } catch (e) {}
    return rutaActual().split('/')[0] || 'inicio';
  }

  var ADAPTADOR = {
    vista: vista,
    estado: function () { return 'ACTIVO'; },
    dato: dato, urgente: urgente, destino: destino, puerta: puerta, accion: accion
  };

  /* ══════════════ la pantalla de entrada ══════════════ */

  function campo(n) { return document.querySelector('.kit-sesion [name="' + n + '"]'); }
  function resaltar(el) {
    if (!el) return;
    el.classList.add('kit-as-resalta');
    try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
    setTimeout(function () { el.classList.remove('kit-as-resalta'); }, 3600);
  }

  var ENTRADA = {
    vista: function () { return 'entrada'; },
    estado: function () { return ''; },
    dato: function () { return ''; },
    urgente: function () { return null; },
    destino: function () { return null; },
    puerta: function () { return null; },
    accion: function (a) {
      if (a === 'olvide') return { etiqueta: 'Mostrarme el botón', icono: 'llave', hacer: function () {
        var d = campo('documento');
        if (d && !String(d.value || '').trim()) { d.focus(); resaltar(d); }
        /* NO se toca: pedir la contraseña lo decide la persona */
        resaltar(document.querySelector('.kit-sesion__olvide'));
      } };
      if (a === 'documento') return { etiqueta: 'Ir a la entrada', icono: 'persona', hacer: function () {
        var d = campo('documento'), cl = campo('clave');
        var el = d && !String(d.value || '').trim() ? d : (cl || d);
        if (el) { el.focus(); resaltar(el); }
      } };
      if (a === 'instalar') return { etiqueta: 'Cómo instalarla', icono: 'descargar', hacer: function () { if (K.piezas.instalar) K.piezas.instalar.abrir(); } };
      return null;
    }
  };

  K.piezas.asistente.configurar({
    app: 'CONTABILIDAD',
    base: window.ASISTENTE_BASE || [],
    adaptador: ADAPTADOR
  });

  window.CONTABILIDAD_ASISTENTE = {
    adaptador: ADAPTADOR,
    entrada: ENTRADA,
    /* para las pruebas */
    _urgente: urgente, _dato: dato
  };
}());
