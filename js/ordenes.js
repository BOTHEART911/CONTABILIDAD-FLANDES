/* ============================================================
   CONTABILIDAD-FLANDES · ÓRDENES DE PAGO
   Fase 7 · "la gran hazaña de esta app" (plan de trabajo)

   LA LISTA
     Las cuentas CERRADAS (el supervisor aceptó el plan de pagos) llegan
     en UN viaje ('ordenes') con todo lo que la orden necesita: el tramo
     de la cuenta (primario, 1ª o 2ª adición) y si es la PRIMERA de su
     tramo, la base de las estampillas, el CDP y el RP del tramo, el RP de
     la cesión y los descuentos sugeridos. Va de primero OSCAR MAURICIO
     POLANIA GUERRA y luego por fecha de radicación (plan).

   LA ORDEN (#/orden/<fila>/<contrato>/<cuenta>)
     Todo se calcula en el teléfono con js/motor.js, la misma cuenta del
     CORE: marcar un check, cambiar un valor a mano o escoger otra cuenta
     contable se ve al instante y sin gastar datos. Solo dos botones van
     al servidor, uno por acción:
       · CREAR ORDEN: el CORE vuelve a cuadrar, arma el PDF con la
         plantilla, lo guarda en la carpeta de la cuenta y lo devuelve en
         la misma respuesta (se descarga y se abre en el visor).
       · ORDEN CREADA: pasa la cuenta a ORDEN DE PAGO y avisa al
         contratista y al grupo de Tesorería. No manda el enlace del PDF.
     El botón marcar/desmarcar PENDIENTE de la app vieja ya no existe.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var C = {};
  var FILTRO_K = 'ordenes.filtro.v1';
  var LISTA = null, HORA = null, CARGANDO = null;
  var SEL = {};                       /* lo que se escogió en cada cuenta, por fila */
  var ACTUAL = null;                  /* la cuenta abierta en el detalle (para Insights) */
  var F = leerFiltro();

  var TRAMO_TXT = { 'PRIMARIO': 'Primario', '1RA ADICION': '1ª adición', '2DA ADICION': '2ª adición' };
  var TIPO_CORTO = {
    'PRESTACION DE SERVICIOS PROFESIONALES': 'Profesionales',
    'PRESTACION DE SERVICIOS DE APOYO A LA GESTION': 'Apoyo a la gestión',
    'PRESTACION DE SERVICIOS': 'Prestación de servicios',
    'CONVENIO DE COOPERACION': 'Convenio de cooperación'
  };

  function leerFiltro() {
    var g = K.guardar.leer(FILTRO_K, null) || {};
    return { tramo: g.tramo || '', tipo: g.tipo || '', sec: g.sec || '', busca: g.busca || '' };
  }
  function guardarFiltro() { K.guardar.escribir(FILTRO_K, F); }

  function nombre(s) { return K.piezas.personas ? K.piezas.personas.nombrePropio(s) : String(s || ''); }
  function titulo(s) {
    return nombre(s).replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); })
                    .replace(/ (De|Del|La|Las|Los|Y|E|En) /g, function (m) { return m.toLowerCase(); });
  }
  function tipoCorto(t) { return TIPO_CORTO[MOTOR.norm(t)] || titulo(t) || '—'; }
  function pesos(v) { return K.pesos(v || 0); }
  function horaCorta(d) {
    if (!d) return '';
    var h = d.getHours(), mi = ('0' + d.getMinutes()).slice(-2);
    return (h % 12 || 12) + ':' + mi + (h < 12 ? ' a. m.' : ' p. m.');
  }
  function diasDesde(ddmmyyyy) {
    var m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(String(ddmmyyyy || ''));
    if (!m) return null;
    var d = new Date(+m[3], +m[2] - 1, +m[1]);
    var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    return Math.round((hoy - d) / 864e5);
  }

  /* ══════════════ los datos ══════════════ */

  function leer(accion, datos, veces) {
    return K.pedir(accion, datos, { ms: 60000 })['catch'](function (e) {
      var red = e && (e.codigo === 'RESPUESTA_NO_JSON' || e.codigo === 'SIN_RED' || e.codigo === 'TIEMPO');
      if (red && (veces || 0) < 1) return leer(accion, datos, (veces || 0) + 1);
      throw e;
    });
  }

  function recibir(d) {
    LISTA = d || { cuentas: [] };
    (LISTA.cuentas || []).forEach(function (c) {
      c._t = K.norm([c.nombre, c.doc, c.contrato, c.sec, c.sup, c.tipo, c.informe, c.orden].join(' '));
    });
    HORA = new Date();
    if (C.alCambiar) C.alCambiar(contar());
  }

  function cargar(fresco) {
    if (LISTA && !fresco) return Promise.resolve(LISTA);
    if (CARGANDO && !fresco) return CARGANDO;       /* el inicio y la vista a la vez: un solo viaje */
    CARGANDO = leer('ordenes', { fresco: !!fresco }).then(function (d) { CARGANDO = null; recibir(d); return LISTA; },
      function (e) { CARGANDO = null; throw e; });
    return CARGANDO;
  }

  function cuentas() { return (LISTA && LISTA.cuentas) || []; }
  function motor() { return (LISTA && LISTA.motor) || { retenciones: [], cuentas: [], reglas: {} }; }
  function firmas() { return (LISTA && LISTA.firmas) || null; }

  function contar() {
    var n = { total: 0, primeras: 0, cesion: 0, conPdf: 0, prioridad: 0 };
    cuentas().forEach(function (c) {
      if (c.error) return;
      n.total++;
      if (c.primera) n.primeras++;
      if (c.cedido && c.rpCesion && !c.rpCesionUsado) n.cesion++;
      if (c.urlOrden) n.conPdf++;
      if (c.prioridad) n.prioridad++;
    });
    return n;
  }

  function olvidar() { LISTA = null; SEL = {}; CARGANDO = null; K.guardar.borrar(FILTRO_K); F = leerFiltro(); }

  /* ══════════════ la selección de cada cuenta ══════════════ */

  function ctxDe(c) { return { tipo: c.tipo, simple: !!c.simple, cobro: c.cobro, base: c.base, primera: !!c.primera }; }

  function selDe(c) {
    if (SEL[c.fila]) return SEL[c.fila];
    var s = { marcadas: {}, publicidad: false, valores: {}, debito: null, credito: null, numero: '', usarRp: false };
    var sug = c.sugerida || {};
    (sug.opciones || []).forEach(function (o) { if (o.disponible && !o.automatica) s.marcadas[o.clave] = !!o.marcada; });
    s.publicidad = !!(sug.publicidad && sug.publicidad.marcada);
    if (c.orden) s.numero = String(parseInt(String(c.orden).slice(4), 10) || '');
    s.usarRp = !!(c.cedido && c.rpCesion && !c.rpCesionUsado);
    SEL[c.fila] = s;
    return s;
  }

  function liquidar(c) { return MOTOR.liquidar(ctxDe(c), selDe(c), motor()); }

  /* ══════════════ filtro ══════════════ */

  function pasa(c, sin) {
    sin = sin || {};
    if (c.error) return !F.tramo && !F.tipo && !F.sec;
    if (!sin.tramo && F.tramo === 'primera' && !c.primera) return false;
    if (!sin.tramo && F.tramo === 'resto' && c.primera) return false;
    if (!sin.tramo && F.tramo === 'cesion' && !(c.cedido && c.rpCesion)) return false;
    if (!sin.tramo && F.tramo === 'pdf' && !c.urlOrden) return false;
    if (!sin.tipo && F.tipo && tipoCorto(c.tipo) !== F.tipo) return false;
    if (!sin.sec && F.sec && c.sec !== F.sec) return false;
    var q = K.norm(F.busca || '');
    if (q) {
      var p = q.split(' ').filter(Boolean);
      for (var i = 0; i < p.length; i++) if ((c._t || '').indexOf(p[i]) < 0) return false;
    }
    return true;
  }

  /* ══════════════ la lista ══════════════ */

  function avisoFirmas(caja) {
    var f = firmas();
    if (!f || f.listo) return;
    var a = K.nodo('<section class="kit-tarjeta op-firmas">' + K.icono('lapiz', 18) +
      '<div><p><b>Antes de crear órdenes falta ' + K.esc(f.faltan.join(' y ')) + '.</b> ' +
      'La orden sale con la firma de quien la elabora y la del CONTADOR (usuario OFICINA).</p></div></section>');
    if (C.puede && C.puede('configuracion')) {
      var b = K.nodo('<button type="button" class="kit-btn kit-btn--plano">Subir mi firma</button>');
      b.addEventListener('click', function () { C.irA('configuracion'); });
      a.appendChild(b);
    }
    caja.appendChild(a);
  }

  function lista() {
    var caja = K.nodo('<div class="kit-ancho vista ct op"></div>');
    C.app.appendChild(caja);
    window.OFICINA.cabecera(caja, 'moneda', 'ÓRDENES DE PAGO',
      'Las cuentas con plan de pagos aceptado. Toca <b>Liquidar</b> para ver los descuentos, ajustarlos y crear la orden. ' +
      'Primero va Oscar Polania y luego las más antiguas.');
    var zFirmas = K.nodo('<div></div>');
    caja.appendChild(zFirmas);

    var barra = window.OFICINA.barra({
      placeholder: 'Nombre, documento, contrato o N° de orden', valor: F.busca,
      alBuscar: function (q) { F.busca = q; cambio(); },
      alRefrescar: function () { return cargar(true).then(function () { zFirmas.innerHTML = ''; avisoFirmas(zFirmas); pintar(); }); }
    });
    caja.appendChild(barra.caja);

    var zTramo = K.nodo('<div></div>'), zTipo = K.nodo('<div></div>'), zSec = K.nodo('<div></div>');
    caja.appendChild(zTramo); caja.appendChild(zTipo); caja.appendChild(zSec);
    var conteo = K.nodo('<p class="ct-conteo" aria-live="polite"></p>');
    caja.appendChild(conteo);
    var rej = K.nodo('<div class="kit-rejilla ct-lista"></div>');
    caja.appendChild(rej);

    var pTramo, pTipo, pSec;
    function montar() {
      pTramo = K.piezas.pastillas.montar(zTramo, {
        etiqueta: 'Qué cuentas',
        opciones: [
          { valor: '', texto: 'Todas' },
          { valor: 'primera', texto: 'Primeras del tramo', tono: 'aviso' },
          { valor: 'resto', texto: 'Las demás' },
          { valor: 'cesion', texto: 'Con RP de cesión' },
          { valor: 'pdf', texto: 'Orden ya generada', tono: 'ok' }
        ],
        valor: F.tramo, alCambiar: function (v) { F.tramo = v; cambio(); }
      });
      pTipo = K.piezas.pastillas.montar(zTipo, { etiqueta: 'Tipo de contrato', opciones: [{ valor: '', texto: 'Todos' }], valor: F.tipo,
        alCambiar: function (v) { F.tipo = v; cambio(); } });
      pSec = K.piezas.pastillas.montar(zSec, { etiqueta: 'Secretaría', opciones: [{ valor: '', texto: 'Todas las secretarías' }], valor: F.sec,
        alCambiar: function (v) { F.sec = v; cambio(); } });
    }

    function opciones(campo, sin, todos, fmt) {
      var bs = cuentas().filter(function (c) { return !c.error && pasa(c, sin); });
      var m = {};
      bs.forEach(function (c) { var k = fmt(c); if (k) m[k] = (m[k] || 0) + 1; });
      var cl = Object.keys(m).sort(function (a, b) { return a.localeCompare(b, 'es'); });
      var cs = { '': bs.length };
      cl.forEach(function (k) { cs[k] = m[k]; });
      return { ops: [{ valor: '', texto: todos }].concat(cl.map(function (k) { return { valor: k, texto: campo === 'sec' ? titulo(k) : k }; })), cs: cs, n: cl.length };
    }

    function marcar(zona, valor) {
      zona.querySelectorAll('.kit-pastilla').forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-valor') === (valor || '') ? 'true' : 'false');
      });
    }

    function repintarPastillas() {
      var bT = cuentas().filter(function (c) { return !c.error && pasa(c, { tramo: true }); });
      pTramo.conteos({ '': bT.length, primera: bT.filter(function (c) { return c.primera; }).length,
        resto: bT.filter(function (c) { return !c.primera; }).length,
        cesion: bT.filter(function (c) { return c.cedido && c.rpCesion; }).length,
        pdf: bT.filter(function (c) { return c.urlOrden; }).length });
      marcar(zTramo, F.tramo);
      var t = opciones('tipo', { tipo: true }, 'Todos', function (c) { return tipoCorto(c.tipo); });
      pTipo.opciones(t.ops); pTipo.conteos(t.cs); marcar(zTipo, F.tipo);
      zTipo.hidden = t.n < 2 && !F.tipo;
      var s = opciones('sec', { sec: true }, 'Todas las secretarías', function (c) { return c.sec; });
      pSec.opciones(s.ops); pSec.conteos(s.cs); marcar(zSec, F.sec);
      zSec.hidden = s.n < 2 && !F.sec;
    }

    function cambio() { guardarFiltro(); pintar(); }

    function pintar() {
      repintarPastillas();
      var filas = cuentas().filter(function (c) { return pasa(c); });
      var tot = cuentas().length;
      conteo.innerHTML = '<b>' + K.numero(filas.length) + '</b> ' + (filas.length === 1 ? 'cuenta' : 'cuentas') +
        (filas.length !== tot ? ' <span>de ' + tot + '</span>' : '') +
        (HORA ? '<span class="ct-sello">' + K.icono('reloj', 13) + ' Al día a las ' + K.esc(horaCorta(HORA)) + '</span>' : '');
      rej.innerHTML = '';
      if (!tot) {
        rej.appendChild(K.nodo('<div class="kit-tarjeta ct-vacio op-aldia">' + K.icono('check', 30) +
          '<p><b>¡Estás al día!</b><br>No hay cuentas esperando orden de pago. Toca Refrescar para mirar de nuevo.</p></div>'));
        return;
      }
      if (!filas.length) {
        rej.appendChild(window.OFICINA.vacio('No hay cuentas con estos filtros.', function () {
          F = { tramo: '', tipo: '', sec: '', busca: '' }; barra.inp.value = ''; cambio();
        }));
        return;
      }
      filas.forEach(function (c) { rej.appendChild(c.error ? tarjetaError(c) : tarjeta(c)); });
    }

    K.piezas.esqueletos.mientras(rej, cargar(false), { forma: 'tarjetas', cuantos: 4, espera: 'Cargando las órdenes de pago' })
      .then(function () { avisoFirmas(zFirmas); montar(); pintar(); })
      ['catch'](function (e) { caja.appendChild(C.errorCaja(e)); });

    K.piezas.creditos.montar(caja);
  }

  function tarjetaError(c) {
    return K.nodo('<article class="kit-tarjeta ct-t op-t op-t--error"><h3 class="ct-t__n">' + K.esc(nombre(c.nombre) || 'Cuenta ' + c.informe) +
      '</h3><p class="op-aviso">' + K.icono('aviso', 14) + ' No se pudo armar esta cuenta: ' + K.esc(c.error) + '</p></article>');
  }

  function marcasDe(c) {
    var m = [];
    if (c.prioridad) m.push('<span class="ct-marca op-marca--prio">' + K.icono('corazon', 11) + ' PRIORIDAD</span>');
    m.push('<span class="ct-marca' + (c.primera ? ' op-marca--primera' : '') + '">' +
      (c.primera ? K.icono('bombilla', 11) + ' PRIMERA · ' : '') + K.esc((TRAMO_TXT[c.tramo] || c.tramo).toUpperCase()) +
      (c.primera ? '' : ' · CUENTA ' + c.nTramo) + '</span>');
    if (c.cedido) m.push('<span class="ct-marca' + (c.rpCesion && !c.rpCesionUsado ? ' op-marca--rp' : '') + '">' +
      K.icono('llave', 11) + (c.rpCesion ? (c.rpCesionUsado ? ' RP CESIÓN YA USADO' : ' RP DE CESIÓN') : ' CEDIDO · SIN RP') + '</span>');
    if (c.simple) m.push('<span class="ct-marca">RÉGIMEN SIMPLE</span>');
    if (c.urlOrden) m.push('<span class="ct-marca op-marca--ok">' + K.icono('check', 11) + ' ORDEN ' + K.esc(c.orden) + '</span>');
    if (c.ultimo) m.push('<span class="ct-marca">ÚLTIMA CUENTA</span>');
    return m.join('');
  }

  function tarjeta(c) {
    var liq = liquidar(c);
    var t = K.nodo('<article class="kit-tarjeta ct-t op-t' + (c.primera ? ' op-t--primera' : '') + '"></article>');
    var cab = K.nodo('<div class="ct-t__cab"></div>');
    if (K.piezas.personas) cab.appendChild(K.piezas.personas.avatar(c.nombre, { tam: 48, foto: c.img || '' }));
    cab.appendChild(K.nodo('<div class="ct-t__quien"><h3 class="ct-t__n">' + K.esc(nombre(c.nombre)) + '</h3>' +
      '<p class="ct-t__doc">CC/NIT ' + K.esc(c.doc) + '</p></div>'));
    cab.appendChild(K.nodo('<span class="rv-t__cuenta"><b>' + K.esc(c.informe) + '</b><small>de ' + K.esc(c.total || '—') + '</small></span>'));
    t.appendChild(cab);
    var dias = diasDesde(c.radicada);
    t.appendChild(K.nodo(
      '<dl class="ct-t__datos">' +
      '  <div><dt>Contrato</dt><dd>' + K.esc(c.contrato || '—') + ' <small>' + K.esc(tipoCorto(c.tipo)) + '</small></dd></div>' +
      '  <div><dt>Secretaría</dt><dd>' + K.esc(titulo(c.sec) || '—') + '</dd></div>' +
      '  <div><dt>Cobra</dt><dd>' + K.esc(pesos(c.cobro)) + '</dd></div>' +
      '  <div><dt>Valor del contrato</dt><dd>' + K.esc(pesos(c.valorInicial)) + '</dd></div>' +
      (c.adicion1 ? '  <div><dt>1ª adición</dt><dd>' + K.esc(pesos(c.adicion1)) + '</dd></div>' : '') +
      (c.adicion2 ? '  <div><dt>2ª adición</dt><dd>' + K.esc(pesos(c.adicion2)) + '</dd></div>' : '') +
      '  <div><dt>Radicada</dt><dd' + (dias !== null && dias >= 5 ? ' class="rv-t__tarde"' : '') + '>' + K.esc(c.radicada || '—') +
      (dias !== null ? ' <small>· hace ' + dias + (dias === 1 ? ' día' : ' días') + '</small>' : '') + '</dd></div>' +
      '</dl>'));
    t.appendChild(K.nodo('<div class="op-neto"><span>Descuentos <b>' + K.esc(pesos(liq.retenido)) + '</b></span>' +
      '<span class="op-neto__v">A girar <b>' + K.esc(pesos(liq.neto)) + '</b></span></div>'));
    t.appendChild(K.nodo('<div class="ct-t__marcas">' + marcasDe(c) + '</div>'));

    var a = K.nodo('<div class="ct-acc"></div>');
    var liqB = K.nodo('<button type="button" class="kit-btn kit-btn--marca ct-acc__ver">' + K.icono('moneda', 16) + (c.urlOrden ? ' Revisar la orden' : ' Liquidar') + '</button>');
    liqB.addEventListener('click', function () { K.vibrar(8); C.irA('orden/' + c.fila + '/' + encodeURIComponent(c.id) + '/' + c.informe); });
    a.appendChild(liqB);
    if (c.tInforme) {
      var ver = K.nodo('<button type="button" class="kit-btn kit-btn--plano">' + K.icono('documento', 16) + ' Ver informe</button>');
      ver.addEventListener('click', function () { verInforme(c); });
      a.appendChild(ver);
    }
    t.appendChild(a);
    return t;
  }

  /* ══════════════ documentos ══════════════ */

  function verInforme(c) {
    var docs = [];
    if (c.tInforme) docs.push({ titulo: 'Informe de supervisión · cuenta ' + c.informe, t: c.tInforme, nombre: 'INFORME_SUPERVISION_' + c.informe + '.pdf' });
    if (c.tActa) docs.push({ titulo: 'Acta final de cumplimiento', t: c.tActa, nombre: 'ACTA_' + c.informe + '.pdf' });
    if (c.tOrden) docs.push({ titulo: 'Orden de pago ' + (c.orden || ''), t: c.tOrden, nombre: 'OP_' + c.informe + '.pdf' });
    if (!docs.length) { K.aviso('Esta cuenta no tiene el informe de supervisión en la hoja.', 'aviso', 4000); return; }
    window.OFICINA.verDocs(docs, 0);
  }

  function bytesDe(b64) {
    var bin = atob(b64), n = bin.length, u = new Uint8Array(n);
    for (var i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
    return u;
  }

  function bajarPdf(bytes, nombreArchivo) {
    try {
      var blob = new Blob([bytes], { type: 'application/pdf' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = nombreArchivo || 'orden_de_pago.pdf';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      return true;
    } catch (e) { return false; }
  }

  /* ══════════════ el detalle: la liquidación ══════════════ */

  function llaveDe(sub) {
    var p = String(sub || '').split('/');
    return { fila: parseInt(p[0], 10) || 0, id: decodeURIComponent(p[1] || ''), informe: parseInt(p[2], 10) || 0 };
  }

  function buscar(q) {
    return cuentas().filter(function (c) { return c.fila === q.fila && (!q.id || K.norm(c.id) === K.norm(q.id)); })[0] || null;
  }

  function detalle(sub) {
    var q = llaveDe(sub);
    var caja = K.nodo('<div class="kit-ancho vista op-det"></div>');
    C.app.appendChild(caja);
    var zona = K.nodo('<div></div>');
    caja.appendChild(zona);
    K.piezas.esqueletos.mientras(zona, cargar(false), { forma: 'ficha', cuantos: 1, espera: 'Cargando la cuenta' })
      .then(function () {
        var c = buscar(q);
        ACTUAL = c || null;
        if (!c) {
          zona.appendChild(K.nodo('<div class="kit-tarjeta ct-vacio"><p>Esta cuenta ya no está esperando orden de pago (puede que otra persona la haya pasado a ORDEN DE PAGO). Vuelve a la lista.</p></div>'));
          return;
        }
        pintarDetalle(zona, c);
      })
      ['catch'](function (e) { zona.appendChild(C.errorCaja(e)); });
    K.piezas.creditos.montar(caja);
  }

  function pintarDetalle(zona, c) {
    zona.innerHTML = '';
    var s = selDe(c);
    var mot = motor();
    var vig = mot.vigencia || new Date().getFullYear();

    /* ---- quién y qué cuenta ---- */
    var ficha = K.nodo('<section class="kit-tarjeta op-ficha"></section>');
    var cab = K.nodo('<div class="ct-t__cab"></div>');
    if (K.piezas.personas) cab.appendChild(K.piezas.personas.avatar(c.nombre, { tam: 60, foto: c.img || '' }));
    var quien = K.nodo('<div class="ct-t__quien"><h2 class="ct-t__n op-ficha__n">' + K.esc(nombre(c.nombre)) + '</h2>' +
      '<p class="ct-t__doc">CC/NIT <button type="button" class="op-copiar" title="Copiar">' + K.esc(c.doc) + ' ' + K.icono('copiar', 12) + '</button></p></div>');
    quien.querySelector('.op-copiar').addEventListener('click', function () {
      try { navigator.clipboard.writeText(c.doc); K.aviso('Documento copiado.', 'ok', 1600); } catch (e) {}
    });
    cab.appendChild(quien);
    cab.appendChild(K.nodo('<span class="rv-t__cuenta"><b>' + K.esc(c.informe) + '</b><small>de ' + K.esc(c.total || '—') + '</small></span>'));
    ficha.appendChild(cab);
    ficha.appendChild(K.nodo('<div class="ct-t__marcas">' + marcasDe(c) + '</div>'));
    ficha.appendChild(K.nodo(
      '<dl class="ct-t__datos op-datos">' +
      '<div><dt>Contrato</dt><dd>' + K.esc(c.contrato) + '</dd></div>' +
      '<div><dt>Tipo de contrato</dt><dd>' + K.esc(tipoCorto(c.tipo)) + '</dd></div>' +
      '<div><dt>Secretaría</dt><dd>' + K.esc(titulo(c.sec) || '—') + '</dd></div>' +
      '<div><dt>Supervisor(a)</dt><dd>' + K.esc(nombre(c.sup) || '—') + '</dd></div>' +
      '<div><dt>Periodo</dt><dd>' + K.esc((c.desde || '—') + ' al ' + (c.hasta || '—')) + '</dd></div>' +
      '<div><dt>Radicada</dt><dd>' + K.esc(c.radicada || '—') + '</dd></div>' +
      (c.factura ? '<div><dt>Factura electrónica</dt><dd>' + K.esc(c.factura) + '</dd></div>' : '') +
      '<div><dt>Régimen</dt><dd>' + (c.simple ? 'Régimen Simple' : 'Ordinario') + '</dd></div>' +
      '</dl>'));
    var accF = K.nodo('<div class="ct-acc"></div>');
    if (c.tInforme || c.tActa || c.tOrden) {
      var vi = K.nodo('<button type="button" class="kit-btn kit-btn--plano">' + K.icono('documento', 16) + ' Ver informe</button>');
      vi.addEventListener('click', function () { verInforme(c); });
      accF.appendChild(vi);
    }
    if (c.grupoSup) {
      var av = K.nodo('<button type="button" class="kit-btn kit-btn--plano" title="Avisar al supervisor que vence por cierre de mes">' + K.icono('reloj', 16) + ' Avisar vencimiento</button>');
      av.addEventListener('click', function () { avisarVencimiento(c, av); });
      accF.appendChild(av);
    }
    ficha.appendChild(accF);
    zona.appendChild(ficha);

    var rej = K.nodo('<div class="op-rej"></div>');
    zona.appendChild(rej);
    var col1 = K.nodo('<div class="op-col"></div>'), col2 = K.nodo('<div class="op-col"></div>');
    rej.appendChild(col1); rej.appendChild(col2);

    /* ---- el valor del contrato y el tramo ---- */
    col1.appendChild(K.nodo(
      '<section class="kit-tarjeta grupo op-grupo"><h3 class="grupo__t">' + K.icono('moneda', 16) + ' Valor del contrato</h3>' +
      '<dl class="op-valores">' +
      '<div><dt>Valor inicial</dt><dd>' + K.esc(pesos(c.valorInicial)) + '</dd></div>' +
      (c.adicion1 ? '<div><dt>1ª adición</dt><dd>' + K.esc(pesos(c.adicion1)) + '</dd></div>' : '') +
      (c.adicion2 ? '<div><dt>2ª adición</dt><dd>' + K.esc(pesos(c.adicion2)) + '</dd></div>' : '') +
      '<div><dt>Valor final</dt><dd>' + K.esc(pesos(c.valorFinal)) + '</dd></div>' +
      '<div class="op-valores__cobro"><dt>Esta cuenta cobra</dt><dd>' + K.esc(pesos(c.cobro)) + '</dd></div>' +
      '</dl>' +
      '<p class="op-tramo' + (c.primera ? ' op-tramo--primera' : '') + '">' + K.icono(c.primera ? 'bombilla' : 'info', 16) + '<span>' +
      (c.primera
        ? '<b>Primera cuenta del ' + K.esc(TRAMO_TXT[c.tramo] ? (c.tramo === 'PRIMARIO' ? 'contrato primario' : 'tramo de la ' + TRAMO_TXT[c.tramo]) : c.tramo) + '.</b> Lleva las estampillas sobre ' + K.esc(pesos(c.base)) + '.'
        : 'Cuenta <b>' + K.esc(c.nTramo) + '</b> del tramo <b>' + K.esc(TRAMO_TXT[c.tramo] || c.tramo) + '</b>: solo lleva los descuentos de cada cuenta.') +
      '</span></p></section>'));

    /* ---- presupuesto: CDP, RP y el RP de la cesión ---- */
    var pres = K.nodo('<section class="kit-tarjeta grupo op-grupo"><h3 class="grupo__t">' + K.icono('documento', 16) + ' Presupuesto de este tramo</h3>' +
      '<dl class="op-valores"><div><dt>Disponibilidad (CDP)</dt><dd>' + K.esc(c.cdp || '—') + '</dd></div>' +
      '<div><dt>Registro (RP)</dt><dd class="op-rp">' + K.esc(c.rp || '—') + '</dd></div></dl></section>');
    if (c.cedido) {
      if (c.rpCesion && !c.rpCesionUsado) {
        var rpc = K.nodo('<label class="op-check op-check--rp"><input type="checkbox"><span><b>Usar RP Cesión</b> ' + K.esc(c.rpCesion) +
          '<small>Reemplaza el RP del tramo (' + K.esc(c.tramo === 'PRIMARIO' ? 'AQ' : (c.tramo === '1RA ADICION' ? 'AS' : 'CG')) + ') en la orden y en la hoja, y queda sellado como usado.</small></span></label>');
        var ch = rpc.querySelector('input');
        ch.checked = !!s.usarRp;
        ch.addEventListener('change', function () { s.usarRp = ch.checked; refrescar(); });
        pres.appendChild(rpc);
      } else if (c.rpCesionUsado) {
        pres.appendChild(K.nodo('<p class="op-nota">' + K.icono('check', 14) + ' El RP de la cesión ya se usó: ' + K.esc(String(c.rpCesionUsado).split('|').pop()) + '</p>'));
      } else {
        pres.appendChild(K.nodo('<p class="op-nota op-nota--aviso">' + K.icono('aviso', 14) + ' Contrato cedido: el contratista todavía no registró el RP de la cesión. La orden sale con el RP del tramo.</p>'));
      }
    }
    col1.appendChild(pres);

    /* ---- descuentos ---- */
    var desc = K.nodo('<section class="kit-tarjeta grupo op-grupo op-desc"><h3 class="grupo__t">' + K.icono('check', 16) + ' Descuentos</h3>' +
      (c.previo && c.previo.inferido ? '<p class="op-nota">' + K.icono('info', 14) + ' Se sugiere lo que se le descontó en la cuenta ' + K.esc(c.previo.informe) + ' (sale de lo que se le giró).</p>' : '') +
      '<div class="op-lista"></div></section>');
    var zOps = desc.querySelector('.op-lista');
    col2.appendChild(desc);

    /* ---- cuentas contables ---- */
    var cc = K.nodo('<section class="kit-tarjeta grupo op-grupo"><h3 class="grupo__t">' + K.icono('hoja', 16) + ' Cuentas contables</h3>' +
      '<div class="op-cuentas"></div></section>');
    var zCc = cc.querySelector('.op-cuentas');
    col2.appendChild(cc);

    /* ---- el total, el movimiento y el número ---- */
    var tot = K.nodo('<section class="kit-tarjeta op-total"></section>');
    col2.appendChild(tot);
    var mov = K.nodo('<section class="kit-tarjeta grupo op-grupo"><h3 class="grupo__t">' + K.icono('hoja', 16) + ' Movimiento financiero y contable</h3><div class="op-mov"></div>' +
      '<p class="op-nota">Así sale en el PDF. Débitos y créditos siempre cuadran: el crédito de la cuenta del beneficiario es el valor a girar.</p></section>');
    zona.appendChild(mov);

    var fin = K.nodo('<section class="kit-tarjeta op-fin"></section>');
    zona.appendChild(fin);

    function selectCuenta(clase, actual, alCambiar) {
      var cat = (mot.catalogo || []).filter(function (x) { return x.clase === clase || (clase === 'CREDITO' && x.clase === 'CREDITO'); });
      var sel = K.nodo('<select class="op-select"></select>');
      var hay = false;
      cat.forEach(function (x) {
        var o = document.createElement('option');
        o.value = x.codigo; o.textContent = x.codigo + ' · ' + x.nombre;
        if (actual && x.codigo === actual.codigo) { o.selected = true; hay = true; }
        sel.appendChild(o);
      });
      if (actual && !hay) {
        var o2 = document.createElement('option');
        o2.value = actual.codigo; o2.textContent = actual.codigo + ' · ' + actual.nombre; o2.selected = true;
        sel.insertBefore(o2, sel.firstChild);
      }
      sel.addEventListener('change', function () {
        var x = cat.filter(function (y) { return y.codigo === sel.value; })[0];
        alCambiar(x ? { codigo: x.codigo, nombre: x.nombre } : null);
      });
      return sel;
    }

    function refrescar() {
      var liq = MOTOR.liquidar(ctxDe(c), s, mot);
      /* descuentos */
      zOps.innerHTML = '';
      liq.opciones.forEach(function (o) {
        var fila = K.nodo('<div class="op-op' + (o.marcada ? ' op-op--si' : '') + (o.disponible ? '' : ' op-op--no') + '"></div>');
        var lab = K.nodo('<label class="op-check"><input type="checkbox"><span><b></b><small></small></span></label>');
        var ch = lab.querySelector('input');
        ch.checked = !!o.marcada;
        ch.disabled = !o.disponible || o.automatica;
        lab.querySelector('b').textContent = o.nombre;
        lab.querySelector('small').textContent = o.disponible
          ? (o.automatica ? 'Automático · ' : '') + o.porcentaje.toString().replace('.', ',') + ' % sobre ' + pesos(o.base) +
            (o.baseTipo === 'TRAMO' ? ' (valor del tramo)' : (o.baseTipo === 'IVA' ? ' (IVA incluido en el cobro)' : ' (el cobro)')) +
            (o.reemplazada ? ' · lo reemplaza ' + o.reemplazada : '')
          : o.motivo;
        ch.addEventListener('change', function () { s.marcadas[o.clave] = ch.checked; K.vibrar(5); refrescar(); });
        fila.appendChild(lab);
        var val = K.nodo('<button type="button" class="op-valor" title="Tocar para cambiar el valor">' + K.esc(pesos(o.marcada ? o.valor : o.calculado)) +
          (o.editado ? ' <small>editado</small>' : '') + '</button>');
        val.disabled = !o.marcada;
        val.addEventListener('click', function () { editarValor(o, fila, val); });
        fila.appendChild(val);
        zOps.appendChild(fila);
      });
      if (liq.publicidad.existe) {
        var pub = K.nodo('<div class="op-op' + (liq.publicidad.marcada ? ' op-op--si' : '') + '"><label class="op-check"><input type="checkbox"><span><b></b>' +
          '<small>No descuenta: cambia las cuentas contables (débito y crédito).</small></span></label></div>');
        pub.querySelector('b').textContent = liq.publicidad.nombre;
        var pc = pub.querySelector('input');
        pc.checked = !!liq.publicidad.marcada;
        pc.addEventListener('change', function () { s.publicidad = pc.checked; s.debito = null; s.credito = null; refrescar(); });
        zOps.appendChild(pub);
      }

      /* cuentas contables */
      zCc.innerHTML = '';
      var fd = K.nodo('<label class="op-campo"><span>Débito</span></label>');
      fd.appendChild(selectCuenta('DEBITO', liq.debito, function (x) { s.debito = x; refrescar(); }));
      var fc = K.nodo('<label class="op-campo"><span>Crédito (beneficiario)</span></label>');
      fc.appendChild(selectCuenta('CREDITO', liq.credito, function (x) { s.credito = x; refrescar(); }));
      zCc.appendChild(fd); zCc.appendChild(fc);
      if (s.debito || s.credito) {
        var rest = K.nodo('<button type="button" class="kit-btn kit-btn--plano op-mini">' + K.icono('recargar', 14) + ' Volver a las del tipo de contrato</button>');
        rest.addEventListener('click', function () { s.debito = null; s.credito = null; refrescar(); });
        zCc.appendChild(rest);
      }

      /* total */
      /* K.nodo devuelve un solo elemento: las tres filas van directo por innerHTML */
      tot.innerHTML = '<div class="op-total__fila"><span>Cobra</span><b>' + K.esc(pesos(liq.cobro)) + '</b></div>' +
        '<div class="op-total__fila"><span>Descuentos</span><b>− ' + K.esc(pesos(liq.retenido)) + '</b></div>' +
        '<div class="op-total__fila op-total__neto"><span>Valor a girar</span><b>' + K.esc(pesos(liq.neto)) + '</b></div>';
      if (liq.neto < 0) tot.appendChild(K.nodo('<p class="op-nota op-nota--malo">' + K.icono('aviso', 14) + ' Los descuentos pasan el valor de la cuenta.</p>'));

      /* movimiento */
      var mz = mov.querySelector('.op-mov');
      var lineas = [];
      if (liq.debito) lineas.push([liq.debito.codigo, liq.debito.nombre, liq.cobro, 0, '', '', '']);
      if (liq.credito) lineas.push([liq.credito.codigo, liq.credito.nombre, 0, liq.neto, '', '', '']);
      var peso = function (o) { return o.tipo === 'Fuente' ? 0 : (o.tipo === 'I.C.A.' ? 1 : (/PROCULTURA/i.test(o.nombre) ? 2 : 3)); };
      liq.aplicadas.slice().sort(function (a, b) { return peso(a) - peso(b); }).forEach(function (o) {
        lineas.push([o.codigo || '—', o.nombre, 0, o.valor, o.tipo, o.base, String(o.porcentaje).replace('.', ',')]);
      });
      mz.innerHTML = '<div class="op-tabla" role="table"><div class="op-tabla__f op-tabla__cab" role="row"><span>Cuenta</span><span>Nombre de la cuenta</span><span>Débito</span><span>Crédito</span><span>Tipo</span><span>Base</span><span>%</span></div>' +
        lineas.map(function (l) {
          return '<div class="op-tabla__f" role="row"><span>' + K.esc(l[0]) + '</span><span>' + K.esc(l[1]) + '</span><span>' + K.esc(K.numero(l[2])) +
            '</span><span>' + K.esc(K.numero(l[3])) + '</span><span>' + K.esc(l[4]) + '</span><span>' + (l[5] ? K.esc(K.numero(l[5])) : '') + '</span><span>' + K.esc(l[6]) + '</span></div>';
        }).join('') +
        '<div class="op-tabla__f op-tabla__tot" role="row"><span></span><span>Totales</span><span>' + K.esc(K.numero(liq.cobro)) + '</span><span>' + K.esc(K.numero(liq.cobro)) +
        '</span><span class="op-tabla__girar">A girar <b>' + K.esc(pesos(liq.neto)) + '</b></span></div></div>';
      c._liq = liq;
      pintarFin();
    }

    function editarValor(o, fila, boton) {
      var inp = K.nodo('<input class="op-valor-inp" inputmode="numeric" aria-label="Nuevo valor de ' + K.esc(o.nombre) + '">');
      inp.value = K.numero(o.valor);
      boton.replaceWith(inp);
      var leerV = K.pesosEnVivo(inp);
      inp.focus(); inp.select();
      function listo() {
        var v = leerV();
        if (v === o.calculado) delete s.valores[o.clave]; else s.valores[o.clave] = v;
        refrescar();
      }
      inp.addEventListener('blur', listo);
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') inp.blur(); if (e.key === 'Escape') { delete s.valores[o.clave]; refrescar(); } });
    }

    function pintarFin() {
      fin.innerHTML = '';
      var f = firmas() || {};
      var num = K.nodo('<label class="op-campo op-num"><span>N° de orden de pago <small>los dígitos finales</small></span>' +
        '<div class="op-num__fila"><input inputmode="numeric" maxlength="10" placeholder="Ej: 1023"><b class="op-num__ver"></b></div></label>');
      var inp = num.querySelector('input'), ver = num.querySelector('.op-num__ver');
      inp.value = s.numero || '';
      function pintarNum() {
        s.numero = inp.value.replace(/\D/g, '');
        if (inp.value !== s.numero) inp.value = s.numero;
        var n = MOTOR.numeroOrden(s.numero, vig);
        ver.textContent = n ? '→ ' + n : (s.numero ? 'Máximo 6 dígitos' : '→ ' + vig + '000000');
        ver.classList.toggle('op-num__ver--malo', !!s.numero && !n);
      }
      inp.addEventListener('input', pintarNum);
      pintarNum();
      fin.appendChild(num);

      if (!f.listo && f.faltan) fin.appendChild(K.nodo('<p class="op-nota op-nota--aviso">' + K.icono('lapiz', 14) + ' Falta ' + K.esc(f.faltan.join(' y ')) + ' para crear la orden.</p>'));
      else if (f.contador) fin.appendChild(K.nodo('<p class="op-nota">' + K.icono('lapiz', 14) + ' Firman: <b>' + K.esc(nombre(f.yo && f.yo.nombre)) + '</b> (Elaboró) y <b>' +
        K.esc(nombre(f.contador.nombre)) + '</b> (Contador)' + (f.contador.mismo ? ' — eres tú en los dos lugares' : '') + '.</p>'));

      var acc = K.nodo('<div class="op-fin__acc"></div>');
      var crearB = K.nodo('<button type="button" class="kit-btn kit-btn--marca op-crear">' + K.icono('documento', 18) + (c.urlOrden ? ' Crear de nuevo' : ' Crear orden') + '</button>');
      crearB.addEventListener('click', function () { crear(c, crearB); });
      acc.appendChild(crearB);
      if (c.tOrden || c._pdf) {
        var verO = K.nodo('<button type="button" class="kit-btn kit-btn--plano">' + K.icono('ojo', 18) + ' Ver orden</button>');
        verO.addEventListener('click', function () { verOrden(c); });
        acc.appendChild(verO);
      }
      var hecha = K.nodo('<button type="button" class="kit-btn op-creada">' + K.icono('enviar', 18) + ' Orden creada</button>');
      hecha.disabled = !c.urlOrden;
      hecha.title = c.urlOrden ? 'Pasa la cuenta a ORDEN DE PAGO y avisa al contratista y a Tesorería' : 'Primero crea la orden';
      hecha.addEventListener('click', function () { ordenCreada(c, hecha); });
      acc.appendChild(hecha);
      fin.appendChild(acc);
      fin.appendChild(K.nodo('<p class="op-nota">' + (c.urlOrden
        ? 'La orden <b>' + K.esc(c.orden) + '</b> ya está en la carpeta de la cuenta. <b>Orden creada</b> la pasa a Tesorería y le avisa al contratista.'
        : '<b>Crear orden</b> arma el PDF con la plantilla, lo guarda en la carpeta de la cuenta y lo descarga en este equipo.') + '</p>'));
    }

    refrescar();
    if (C.alDetalle) C.alDetalle(c);
  }

  /* ══════════════ las acciones (una llamada cada una) ══════════════ */

  function crear(c, boton) {
    var s = selDe(c), liq = c._liq || liquidar(c), mot = motor(), f = firmas() || {};
    var numero = MOTOR.numeroOrden(s.numero, mot.vigencia);
    if (!numero) { K.aviso('Escribe el N° de la orden de pago (los dígitos finales, hasta 6).', 'aviso', 4500); var i = document.querySelector('.op-num input'); if (i) i.focus(); return; }
    if (!f.listo) {
      K.piezas.confirmar.avisar({ titulo: 'Faltan firmas', texto: 'Antes de crear la orden falta ' + (f.faltan || []).join(' y ') + '. Súbela en Configuración.' });
      return;
    }
    if (!liq.debito || !liq.credito) { K.aviso('Faltan las cuentas contables de este tipo de contrato. Revísalas en Configuración.', 'malo', 6000); return; }
    if (liq.neto < 0) { K.aviso('Los descuentos pasan el valor de la cuenta.', 'malo', 5000); return; }
    /* la capa de confirmar recibe pares [etiqueta, valor] */
    var lista = [['Contratista', nombre(c.nombre) + ' · cuenta ' + c.informe + ' de ' + (c.total || '—')], ['Cobro', pesos(liq.cobro)]];
    liq.aplicadas.forEach(function (o) { lista.push([o.nombre + (o.editado ? ' (editado)' : ''), '− ' + pesos(o.valor)]); });
    lista.push(['Valor a girar', pesos(liq.neto)]);
    if (s.usarRp) lista.push(['RP de la cesión', c.rpCesion]);
    K.piezas.confirmar.preguntar({
      titulo: 'Crear la orden ' + numero,
      lista: lista, si: 'Crear orden', no: 'Revisar'
    }).then(function (si) {
      if (!si) return;
      boton.disabled = true;
      var datos = { fila: c.fila, id: c.id, informe: c.informe, numero: numero, marcadas: s.marcadas, publicidad: !!s.publicidad,
                    valores: s.valores, debito: s.debito, credito: s.credito, usarRpCesion: !!s.usarRp };
      return K.piezas.guardado.mientras(K.pedir('crearOrden', datos, { ms: 120000 }), {
        titulo: 'Creando la orden de pago', sub: 'No cierres esta ventana hasta que termine.',
        pasos: ['Cuadrando los descuentos…', 'Llenando la plantilla…', 'Guardando el PDF en la carpeta de la cuenta…', 'Casi listo…'],
        listo: { titulo: 'Orden ' + numero + ' creada', paso: 'Guardada en la carpeta de la cuenta' }
      }).then(function (r) {
        var bytes = bytesDe(r.pdf);
        c._pdf = { bytes: bytes, nombre: r.nombre };
        c.urlOrden = r.url; c.orden = r.numero; c.tOrden = r.tOrden || c.tOrden;
        if (r.rpUsado) { c.rpCesionUsado = 'recién usado | ' + r.rpUsado; c.rp = r.rpUsado; }
        bajarPdf(bytes, r.nombre);
        if (Math.abs(r.neto - liq.neto) > 0) K.aviso('Ojo: el servidor calculó ' + pesos(r.neto) + ' a girar.', 'aviso', 7000);
        /* misma ruta: el hash no cambia y no habría repintado; se repinta aquí (sin viajar) */
        var sub = c.fila + '/' + encodeURIComponent(c.id) + '/' + c.informe;
        if (String(location.hash || '').replace(/^#\/?/, '') === 'orden/' + sub) { C.app.innerHTML = ''; detalle(sub); }
        else C.irA('orden/' + sub);
        setTimeout(function () { verOrden(c); }, 400);
      });
    })['catch'](function (e) { K.aviso((e && e.message) || 'No se pudo crear la orden.', 'malo', 8000); })
      .then(function () { boton.disabled = false; });
  }

  function verOrden(c) {
    if (c._pdf) {
      K.piezas.visor.abrir([{ titulo: 'Orden de pago ' + (c.orden || ''), tipo: 'pdf',
        cargar: function () { return Promise.resolve({ bytes: c._pdf.bytes, mime: 'application/pdf', tipo: 'pdf', nombre: c._pdf.nombre }); } }]);
      return;
    }
    if (c.tOrden) window.OFICINA.verDocs([{ titulo: 'Orden de pago ' + (c.orden || ''), t: c.tOrden, nombre: 'OP_' + c.informe + '.pdf' }], 0);
  }

  function ordenCreada(c, boton) {
    K.piezas.confirmar.preguntar({
      titulo: 'Orden ' + (c.orden || '') + ' creada',
      texto: 'La cuenta ' + c.informe + ' de ' + nombre(c.nombre) + ' pasa a ORDEN DE PAGO. Se le avisa al contratista y al grupo de Tesorería.',
      si: 'Sí, pasar a Tesorería', no: 'Todavía no'
    }).then(function (si) {
      if (!si) return;
      boton.disabled = true;
      return K.piezas.guardado.mientras(K.pedir('ordenCreada', { fila: c.fila, id: c.id, informe: c.informe }, { ms: 90000 }), {
        titulo: 'Pasando la cuenta a Tesorería', sub: 'Estamos cambiando el estado y avisando.',
        pasos: ['Cambiando a ORDEN DE PAGO…', 'Avisando al contratista…', 'Avisando a Tesorería…'],
        listo: { titulo: 'Cuenta en Tesorería', paso: 'Orden de pago emitida' }
      }).then(function (r) {
        delete SEL[c.fila];
        recibir(r.lista);
        var malos = [];
        if (r.aviso && !r.aviso.ok) malos.push('al contratista (' + (r.aviso.error || 'no salió') + ')');
        if (r.grupo && !r.grupo.ok) malos.push('al grupo de Tesorería (' + (r.grupo.error || 'no salió') + ')');
        if (malos.length) K.aviso('La cuenta ya está en ORDEN DE PAGO, pero no se pudo avisar ' + malos.join(' ni ') + '.', 'aviso', 9000);
        else K.aviso('Listo: ORDEN DE PAGO. Avisados el contratista y Tesorería.', 'ok', 4000);
        C.irA('ordenes');
      });
    })['catch'](function (e) { K.aviso((e && e.message) || 'No se pudo cambiar el estado.', 'malo', 8000); boton.disabled = false; });
  }

  function avisarVencimiento(c, boton) {
    K.piezas.confirmar.preguntar({
      titulo: 'Avisar vencimiento', si: 'Avisar', no: 'Cancelar',
      texto: 'Se le escribe al grupo de ' + nombre(c.sup) + ' que la cuenta ' + c.informe + ' de ' + nombre(c.nombre) + ' vence por cierre de mes y debe radicar hoy los paquetes.'
    }).then(function (si) {
      if (!si) return;
      boton.disabled = true;
      return K.pedir('avisarVencimiento', { fila: c.fila, id: c.id, informe: c.informe }).then(function () {
        K.aviso('Supervisor notificado.', 'ok', 2500);
      });
    })['catch'](function (e) { K.aviso((e && e.message) || 'No se pudo avisar.', 'malo', 6000); })
      .then(function () { boton.disabled = false; });
  }

  window.ORDENES = {
    configurar: function (o) { C = o || {}; },
    lista: lista, detalle: detalle, cargar: cargar, contar: contar, olvidar: olvidar,
    /* la configuración o una firma cambió: la próxima vista vuelve a pedir la lista (sin tocar filtros) */
    soltar: function () { LISTA = null; CARGANDO = null; SEL = {}; },
    /* el resumen del inicio abre la lista ya filtrada */
    filtrar: function (f) { F.tramo = (f && f.tramo) || ''; F.tipo = ''; F.sec = ''; F.busca = ''; guardarFiltro(); },
    _cuentas: cuentas, _motor: motor,
    _filtradas: function () { return cuentas().filter(function (c) { return pasa(c); }); },
    _actual: function () { return ACTUAL; },
    _hora: function () { return HORA; }, _firmas: firmas, _liquidar: liquidar, _sel: selDe,
    tipoCorto: tipoCorto, TRAMO_TXT: TRAMO_TXT
  };
}());
