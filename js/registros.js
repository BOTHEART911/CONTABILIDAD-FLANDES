/* ============================================================
   CONTABILIDAD-FLANDES · REGISTROS (Fase 7)

   Las órdenes de pago creadas. Como lo pide el plan:
     · El CONTABLE ve y descarga SOLO las que él elaboró.
     · OFICINA (y DEV) ve todas y escoge: todos los contables o uno.
   Todas o por periodo (este mes, mes pasado, este año, otro rango), en
   PDF membretado por bloques o en Excel (una fila por orden).

   Carga única: UNA llamada ('registros') y filtrar, buscar y contar pasa
   en el teléfono. REFRESCAR la pide de nuevo. Quién ve qué lo decide el
   CORE, no esta pantalla.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var O = window.OFICINA;
  var C = {};
  var FILTRO_K = 'registros.filtro.v1';

  var DATA = null, META = null, HORA = null, CARGANDO = null;
  var F = leerFiltro();

  function leerFiltro() {
    var g = K.guardar.leer(FILTRO_K, null) || {};
    var r = rango(g.atajo || 'mes');
    return { atajo: g.atajo || 'mes', desde: g.atajo === 'otro' ? g.desde : r.desde, hasta: g.atajo === 'otro' ? g.hasta : r.hasta,
             quien: g.quien || '', sec: g.sec || '', busca: '' };
  }
  function guardarFiltro() { K.guardar.escribir(FILTRO_K, { atajo: F.atajo, desde: F.desde, hasta: F.hasta, quien: F.quien, sec: F.sec }); }

  function rango(atajo) {
    var hoy = new Date(); hoy.setHours(12, 0, 0, 0);
    var d = new Date(hoy), h = new Date(hoy);
    if (atajo === 'mes') d.setDate(1);
    else if (atajo === 'mesPasado') { d = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1, 12); h = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 12); }
    else if (atajo === 'anio') d = new Date(hoy.getFullYear(), 0, 1, 12);
    else if (atajo === 'todo') return { desde: '', hasta: '' };
    return { desde: O.isoDe(d), hasta: O.isoDe(h) };
  }

  function recibir(d) {
    var campos = (d && d.campos) || [];
    META = { todas: !!(d && d.todas), yo: (d && d.yo) || '', contables: (d && d.contables) || [] };
    DATA = ((d && d.filas) || []).map(function (a) {
      var o = {};
      campos.forEach(function (c, i) { o[c] = a[i]; });
      /* lo girado solo vale entre 1 y el cobro (en la hoja vieja hay fechas en DETALLES DE PAGO) */
      if (!(o.neto > 0) || (o.cobro > 0 && o.neto > o.cobro)) o.neto = 0;
      o._q = K.norm(o.elaboro || '');
      o._t = K.norm([o.nombre, o.doc, o.contrato, o.orden, o.sec, o.elaboro, o.id].join(' '));
      return o;
    });
    HORA = new Date();
  }

  function cargar(fresco) {
    if (DATA && !fresco) return Promise.resolve(DATA);
    if (CARGANDO && !fresco) return CARGANDO;
    CARGANDO = O.leer('registros', {}).then(function (d) { CARGANDO = null; recibir(d); return DATA; },
      function (e) { CARGANDO = null; throw e; });
    return CARGANDO;
  }

  function coincide(t, q) {
    q = K.norm(q || '');
    if (!q) return true;
    var p = q.split(' ').filter(Boolean);
    for (var i = 0; i < p.length; i++) if (t.indexOf(p[i]) < 0) return false;
    return true;
  }
  function pasa(x, sin) {
    sin = sin || {};
    if (F.desde && (!x.fecha || x.fecha < F.desde)) return false;
    if (F.hasta && (!x.fecha || x.fecha > F.hasta)) return false;
    if (!sin.quien && F.quien && x._q !== F.quien) return false;
    if (!sin.sec && F.sec && x.sec !== F.sec) return false;
    return coincide(x._t, F.busca);
  }
  function filtradas() { return (DATA || []).filter(function (x) { return pasa(x); }); }

  function textoRango() {
    if (!F.desde && !F.hasta) return 'Todas las órdenes';
    return 'Órdenes del ' + (F.desde ? O.fecha(F.desde) : 'inicio') + ' al ' + (F.hasta ? O.fecha(F.hasta) : 'hoy');
  }

  function sumas(filas) {
    /* descuentos y neto solo de las órdenes que tienen lo girado registrado (las viejas pueden no tenerlo) */
    var s = { cobro: 0, neto: 0, descuentos: 0, sinNeto: 0, gente: {} };
    filas.forEach(function (x) {
      var c = Number(x.cobro) || 0, n = Number(x.neto) || 0;
      s.cobro += c; s.gente[x.id] = 1;
      if (n > 0) { s.neto += n; s.descuentos += c - n; } else s.sinNeto++;
    });
    s.contratos = Object.keys(s.gente).length;
    return s;
  }

  function tonoEstado(e) { return e === 'PAGADA' ? 'ok' : (e === 'ORDEN DE PAGO' || e === 'EGRESO' ? 'info' : 'aviso'); }

  /* ══════════════ la vista ══════════════ */

  function vista() {
    var caja = K.nodo('<div class="kit-ancho vista ct of rp rg"></div>');
    C.app.appendChild(caja);
    var cabTexto = 'Las órdenes de pago que has elaborado. Elige el periodo y descárgalas en PDF o Excel.';
    O.cabecera(caja, 'pdf', 'REGISTROS', cabTexto);

    var zR = K.nodo('<section class="kit-tarjeta rp-rango"></section>');
    var zAt = K.nodo('<div></div>');
    zR.appendChild(zAt);
    var fechas = K.nodo('<div class="rp-fechas">' +
      '<label><span>Desde</span><input type="date" data-kit-fecha data-desde="2025" data-titulo="Desde"></label>' +
      '<label><span>Hasta</span><input type="date" data-kit-fecha data-desde="2025" data-titulo="Hasta"></label></div>');
    zR.appendChild(fechas);
    caja.appendChild(zR);
    var iD = fechas.querySelectorAll('input')[0], iH = fechas.querySelectorAll('input')[1];

    var b = O.barra({
      placeholder: 'Contratista, documento, contrato, N° de orden o quién la elaboró', valor: F.busca,
      alBuscar: function (q) { F.busca = q; VER = 50; pintar(); },
      alRefrescar: function () { return cargar(true).then(pintar); }
    });
    caja.appendChild(b.caja);
    var zQ = K.nodo('<div hidden></div>'), zS = K.nodo('<div></div>');
    caja.appendChild(zQ); caja.appendChild(zS);

    var resumen = K.nodo('<section class="kit-tarjeta rp-resumen"></section>');
    caja.appendChild(resumen);
    var descargas = K.nodo('<div class="rp-bajar">' +
      '<button type="button" class="kit-btn kit-btn--marca" data-f="pdf">' + K.icono('pdf', 16) + ' Descargar PDF</button>' +
      '<button type="button" class="kit-btn kit-btn--plano" data-f="xlsx">' + K.icono('hoja', 16) + ' Descargar Excel</button></div>');
    caja.appendChild(descargas);
    var conteo = K.nodo('<p class="ct-conteo" aria-live="polite"></p>');
    caja.appendChild(conteo);
    var lista = K.nodo('<div class="rp-lista"></div>');
    caja.appendChild(lista);
    var mas = K.nodo('<button type="button" class="kit-btn kit-btn--plano ct-mas" hidden>Ver más</button>');
    caja.appendChild(mas);
    var VER = 50;
    mas.addEventListener('click', function () { VER += 100; pintarLista(); });

    var pAt = K.piezas.pastillas.montar(zAt, {
      etiqueta: 'Periodo', valor: F.atajo,
      opciones: [{ valor: 'mes', texto: 'Este mes' }, { valor: 'mesPasado', texto: 'Mes pasado' }, { valor: 'anio', texto: 'Este año' },
                 { valor: 'todo', texto: 'Todas' }, { valor: 'otro', texto: 'Otro rango' }],
      alCambiar: function (v) {
        F.atajo = v;
        if (v !== 'otro') { var r = rango(v); F.desde = r.desde; F.hasta = r.hasta; ponerFechas(); }
        guardarFiltro(); VER = 50; pintar();
      }
    });
    function ponerFechas() { iD.value = F.desde || ''; iH.value = F.hasta || ''; }
    if (K.piezas.fechas) K.piezas.fechas.montar(fechas);
    ponerFechas();
    [iD, iH].forEach(function (inp) {
      inp.addEventListener('change', function () {
        F.desde = iD.value || ''; F.hasta = iH.value || '';
        if (F.desde && F.hasta && F.desde > F.hasta) { var x = F.desde; F.desde = F.hasta; F.hasta = x; ponerFechas(); }
        F.atajo = 'otro'; pAt.poner('otro'); guardarFiltro(); VER = 50; pintar();
      });
    });

    var pQ = K.piezas.pastillas.montar(zQ, { etiqueta: 'Elaboró', valor: F.quien, opciones: [{ valor: '', texto: 'Todos los contables' }],
      alCambiar: function (v) { F.quien = v; guardarFiltro(); VER = 50; pintar(); } });
    var pS = K.piezas.pastillas.montar(zS, { etiqueta: 'Secretaría', valor: F.sec, opciones: [{ valor: '', texto: 'Todas las secretarías' }],
      alCambiar: function (v) { F.sec = v; guardarFiltro(); VER = 50; pintar(); } });

    function repintarPastillas() {
      /* OFICINA / DEV: todos los contables o uno (los activos y los que ya elaboraron alguna) */
      if (META.todas) {
        zQ.hidden = false;
        var bQ = DATA.filter(function (x) { return pasa(x, { quien: true }); });
        var n = {}, nom = {};
        bQ.forEach(function (x) { if (x._q) { n[x._q] = (n[x._q] || 0) + 1; nom[x._q] = x.elaboro; } });
        META.contables.forEach(function (u) { var k = K.norm(u.nombre); if (u.estado === 'ACTIVO' && !nom[k]) { nom[k] = u.nombre; n[k] = 0; } });
        var ks = Object.keys(nom).sort(function (a, c) { return a.localeCompare(c, 'es'); });
        var cQ = { '': bQ.length };
        ks.forEach(function (k) { cQ[k] = n[k] || 0; });
        pQ.opciones([{ valor: '', texto: 'Todos los contables' }].concat(ks.map(function (k) { return { valor: k, texto: O.nombre(nom[k]) }; })));
        pQ.conteos(cQ); O.marcar(zQ, F.quien);
      } else { zQ.hidden = true; F.quien = ''; }
      var bS = DATA.filter(function (x) { return pasa(x, { sec: true }); });
      var m = {};
      bS.forEach(function (x) { if (x.sec) m[x.sec] = (m[x.sec] || 0) + 1; });
      var ss = Object.keys(m).sort(function (a, c) { return a.localeCompare(c, 'es'); });
      var cS = { '': bS.length };
      ss.forEach(function (k) { cS[k] = m[k]; });
      pS.opciones([{ valor: '', texto: 'Todas las secretarías' }].concat(ss.map(function (k) { return { valor: k, texto: O.titulo(k) }; })));
      pS.conteos(cS); O.marcar(zS, F.sec);
      zS.hidden = ss.length <= 1 && !F.sec;
    }

    function pintarResumen(filas) {
      var s = sumas(filas);
      resumen.innerHTML = '';
      resumen.appendChild(K.nodo('<p class="rp-resumen__rango">' + K.icono('reloj', 14) + ' ' + K.esc(textoRango()) +
        (F.quien ? ' · elaboradas por ' + K.esc(O.nombre(filas[0] ? filas[0].elaboro : F.quien)) : '') + '</p>'));
      resumen.appendChild(K.nodo('<div class="ct-cifras">' +
        '<div class="ct-cifra"><b>' + K.numero(filas.length) + '</b><span>Órdenes</span></div>' +
        '<div class="ct-cifra"><b>' + K.esc(K.pesos(s.cobro)) + '</b><span>Cobrado</span></div>' +
        '<div class="ct-cifra"><b>' + K.esc(K.pesos(s.descuentos)) + '</b><span>Descuentos</span></div>' +
        '<div class="ct-cifra rp-cifra--ok"><b>' + K.esc(K.pesos(s.neto)) + '</b><span>Neto a girar</span></div></div>'));
      if (s.sinNeto) resumen.appendChild(K.nodo('<p class="ct-resumen__t">' + K.numero(s.sinNeto) + ' de ' + K.numero(filas.length) +
        ' órdenes no tienen el valor girado en la hoja (las de la app anterior): descuentos y neto se suman solo con las demás.</p>'));
    }

    function fila(x) {
      var r = K.nodo('<article class="rp-fila"></article>');
      r.appendChild(K.nodo('<div class="rp-fila__f"><b>' + K.esc(O.fecha(x.fecha).slice(0, 5) || '—') + '</b><small>' + K.esc(String(x.fecha || '').slice(0, 4)) + '</small></div>'));
      var c = K.nodo('<div class="rp-fila__c"></div>');
      c.appendChild(K.nodo('<p class="rp-fila__n">' + K.esc(O.nombre(x.nombre)) + '</p>'));
      c.appendChild(K.nodo('<p class="rp-fila__d">Orden ' + K.esc(x.orden) + ' · contrato ' + K.esc(x.contrato || '—') + ' · cuenta ' + K.esc(x.informe || '?') +
        ' · cobro ' + K.esc(K.pesos(x.cobro)) + (x.neto ? ' · neto ' + K.esc(K.pesos(x.neto)) : '') + '</p>'));
      if (x.descuentos) c.appendChild(K.nodo('<p class="rp-fila__r">' + K.icono('moneda', 12) + ' ' + K.esc(x.descuentos) + '</p>'));
      if (META.todas && x.elaboro) c.appendChild(K.nodo('<p class="rp-fila__m">Elaboró: ' + K.esc(O.nombre(x.elaboro)) + '</p>'));
      r.appendChild(c);
      var der = K.nodo('<div class="rg-der"></div>');
      der.appendChild(K.nodo('<span class="kit-pastilla ct-t__estado of-estado ' +
        (tonoEstado(x.estado) === 'ok' ? 'of-estado--ok' : 'of-estado--abierto') + '">' + K.esc(x.estado) + '</span>'));
      if (x.url) {
        var ver = K.nodo('<button type="button" class="kit-btn kit-btn--plano op-mini">' + K.icono('ojo', 14) + ' Ver orden</button>');
        ver.addEventListener('click', function (e) {
          e.stopPropagation();
          K.piezas.visor.abrir([{ titulo: 'Orden de pago ' + x.orden + ' · ' + O.nombre(x.nombre), url: x.url, tipo: 'pdf' }]);
        });
        der.appendChild(ver);
      }
      r.appendChild(der);
      return r;
    }

    function pintarLista() {
      var filas = filtradas();
      lista.innerHTML = '';
      mas.hidden = true;
      if (!DATA.length) { lista.appendChild(O.vacio(META.todas ? 'Todavía no hay órdenes de pago creadas.' : 'Todavía no has elaborado órdenes de pago.')); return; }
      if (!filas.length) {
        lista.appendChild(O.vacio('No hay órdenes con estos filtros (' + textoRango().toLowerCase() + ').', function () {
          F.quien = ''; F.sec = ''; F.busca = ''; b.inp.value = ''; F.atajo = 'todo'; F.desde = ''; F.hasta = ''; pAt.poner('todo'); ponerFechas(); guardarFiltro(); pintar();
        }));
        return;
      }
      filas.slice(0, VER).forEach(function (x) { lista.appendChild(fila(x)); });
      if (filas.length > VER) { mas.hidden = false; mas.textContent = 'Ver ' + Math.min(100, filas.length - VER) + ' más de ' + K.numero(filas.length - VER); }
    }

    function pintar() {
      if (!DATA) return;
      var cp = caja.querySelector('.ct-cab__p');
      if (META.todas && cp) cp.textContent = 'Todas las órdenes de pago creadas. Escoge todos los contables o uno y el periodo, y descárgalas en PDF o Excel.';
      repintarPastillas();
      var filas = filtradas();
      pintarResumen(filas);
      conteo.innerHTML = '<b>' + K.numero(filas.length) + '</b> ' + (filas.length === 1 ? 'orden' : 'órdenes') +
        (HORA ? '<span class="ct-sello">' + K.icono('reloj', 13) + ' Al día a las ' + K.esc(O.horaCorta(HORA)) + '</span>' : '');
      descargas.querySelectorAll('button').forEach(function (x) { x.disabled = !filas.length; });
      pintarLista();
    }

    descargas.querySelectorAll('button').forEach(function (x) {
      x.addEventListener('click', function () { bajar(x.getAttribute('data-f'), x); });
    });

    K.piezas.esqueletos.mientras(lista, cargar(false), { forma: 'tarjetas', cuantos: 4, espera: 'Trayendo tus órdenes de pago' })
      .then(pintar)['catch'](function (e) { caja.appendChild(C.errorCaja(e)); });
    K.piezas.creditos.montar(caja);
  }

  /* ══════════════ descargar ══════════════ */

  var COLS = [
    { campo: function (x) { return O.fecha(x.fecha); }, titulo: 'Fecha' },
    { campo: 'orden', titulo: 'N° orden' },
    { campo: 'estado', titulo: 'Estado' },
    { campo: 'nombre', titulo: 'Contratista' },
    { campo: 'doc', titulo: 'CC/NIT' },
    { campo: 'contrato', titulo: 'Contrato' },
    { campo: 'informe', titulo: 'Cuenta' },
    { campo: 'sec', titulo: 'Secretaría' },
    { campo: 'cobro', titulo: 'Cobro', tipo: 'pesos' },
    { campo: function (x) { return x.neto ? (Number(x.cobro) || 0) - x.neto : null; }, titulo: 'Descuentos', tipo: 'pesos' },
    { campo: function (x) { return x.neto || null; }, titulo: 'Neto a girar', tipo: 'pesos' },
    { campo: function (x) { return O.nombre(x.elaboro); }, titulo: 'Elaboró' },
    { campo: 'descuentos', titulo: 'Detalle de descuentos', largo: true }
  ];
  var COLS_XLS = [
    { campo: 'orden', titulo: 'N° orden de pago' }, { campo: 'fecha', titulo: 'Fecha orden', tipo: 'fecha' },
    { campo: 'estado', titulo: 'Estado' }, { campo: 'id', titulo: 'ID contrato' }, { campo: 'doc', titulo: 'Documento' },
    { campo: 'nombre', titulo: 'Contratista' }, { campo: 'contrato', titulo: 'Contrato' }, { campo: 'informe', titulo: 'N° informe', tipo: 'numero' },
    { campo: 'tipo', titulo: 'Tipo de contrato' }, { campo: 'sec', titulo: 'Secretaría' },
    { campo: 'cobro', titulo: 'Cobro', tipo: 'pesos' },
    { campo: function (x) { return x.neto ? (Number(x.cobro) || 0) - x.neto : null; }, titulo: 'Total descuentos', tipo: 'pesos' },
    { campo: function (x) { return x.neto || null; }, titulo: 'Neto a girar', tipo: 'pesos' }, { campo: 'descuentos', titulo: 'Detalle de descuentos' },
    { campo: 'elaboro', titulo: 'Elaboró' }, { campo: 'url', titulo: 'PDF de la orden' }
  ];

  function informe(filas) {
    var s = sumas(filas);
    var t = [textoRango(), K.numero(filas.length) + ' órdenes'];
    if (F.quien && filas[0]) t.push('elaboró ' + O.nombre(filas[0].elaboro));
    else if (!META.todas && META.yo) t.push('elaboró ' + O.nombre(META.yo));
    if (F.sec) t.push(O.titulo(F.sec));
    if (F.busca) t.push('búsqueda: ' + F.busca);
    return {
      subtitulo: t.join(' · '),
      bloque: {
        titulo: function (x) { return 'Orden ' + x.orden + ' · ' + O.nombre(x.nombre); },
        sub: function (x) { return 'Contrato ' + (x.contrato || '?') + ' · cuenta ' + (x.informe || '?') + ' · ' + O.fecha(x.fecha); },
        marca: function (x) { return x.estado; },
        tono: function (x) { return tonoEstado(x.estado); },
        omitir: ['Fecha', 'N° orden', 'Estado', 'Contratista', 'Contrato', 'Cuenta']
      },
      grupo: META.todas && !F.quien ? function (x) { return 'Elaboró: ' + (O.nombre(x.elaboro) || 'sin registro'); } : null,
      resumen: [
        { etiqueta: 'Órdenes', valor: K.numero(filas.length) },
        { etiqueta: 'Cobrado', valor: K.pesos(s.cobro) },
        { etiqueta: 'Descuentos', valor: K.pesos(s.descuentos), tono: 'aviso' },
        { etiqueta: 'Neto a girar', valor: K.pesos(s.neto), tono: 'ok' }
      ]
    };
  }

  function bajar(formato, boton) {
    if (!K.piezas.exportar) { K.aviso('La descarga no está disponible en esta versión.', 'aviso'); return; }
    var filas = filtradas().slice().sort(function (a, c) {
      return String(a.elaboro).localeCompare(String(c.elaboro), 'es') || String(a.fecha).localeCompare(String(c.fecha)) || String(a.orden).localeCompare(String(c.orden));
    });
    if (!filas.length) return;
    var nombre = 'Ordenes de pago ' + (F.desde ? O.fecha(F.desde).replace(/\//g, '-') : '') + (F.hasta && F.hasta !== F.desde ? ' a ' + O.fecha(F.hasta).replace(/\//g, '-') : '');
    boton.disabled = true; boton.classList.add('kit-ocupado');
    var op = informe(filas);
    if (!op.grupo) delete op.grupo;
    var p = formato === 'pdf' ? K.piezas.exportar.aPDF(nombre.trim(), COLS, filas, op) : K.piezas.exportar.aExcel(nombre.trim(), COLS_XLS, filas);
    Promise.resolve(p).then(function (r) {
      K.aviso(r === 'csv' ? 'No cargó Excel: se descargó en CSV (Excel lo abre).' : (r === 'impresion' ? 'Guárdalo como PDF desde la ventana de impresión.' : 'Descargado.'), 'ok', 3500);
    }, function (e) { K.aviso((e && e.message) || 'No se pudo descargar.', 'malo', 6000); })
      .then(function () { boton.disabled = false; boton.classList.remove('kit-ocupado'); });
  }

  window.REGISTROS = {
    configurar: function (c) { C = c || {}; },
    vista: vista,
    cargar: cargar,
    soltar: function () { DATA = null; CARGANDO = null; },
    olvidar: function () { DATA = null; META = null; CARGANDO = null; K.guardar.borrar(FILTRO_K); F = leerFiltro(); },
    _datos: function () { return DATA; },
    _meta: function () { return META; },
    _filtradas: filtradas,
    _informe: informe,
    _filtro: function () { return F; }
  };
}());
