/* ============================================================
   CONTABILIDAD-FLANDES · APP
   Ecosistema Flandes · Fase 7

   La misma cara de CONTRATISTA, CONTRATACIÓN y SUPERVISIÓN: franja con
   cielo, tu foto, los accesos por bloques y abajo el resumen de las
   órdenes por hacer (se toca y abre la lista ya filtrada).

   Roles: CONTABLE y OFICINA (el CONTADOR, su firma va en todas las
   órdenes). El DEV entra a todo. Cada vista con su permiso de PERMISOS:
     · ÓRDENES DE PAGO (ordenes.js + motor.js) ........ ordenesPago
     · REGISTROS (registros.js) ....................... registros
     · CONTRATISTAS y su INFORME ...................... contratistas
     · REQUERIMIENTOS y COMUNICADOS ................... requerimientos / comunicados
     · CONFIGURACIÓN y MI FIRMA Y MI FOTO ............. configuracion
     · Soporte en el menú del perfil.

   UN SOLO LLAMADO por pantalla o acción:
     · Entrar: el login trae el arranque ('inicio') en el mismo viaje.
     · El inicio pide 'ordenes' UNA vez (burbuja y resumen); al abrir la
       lista ya está en el teléfono. Refrescar la vuelve a pedir.
     · Cada vista: su lectura, una vez. Cada botón: una llamada.

   Reglas de siempre
     · Todo dato de la hoja pasa por K.esc antes de entrar al HTML.
     · La app no conoce ninguna URL: todo sale de marca.js.
     · Qué ve cada quien lo decide el CORE: esconder un botón es cortesía,
       no protección.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var M = window.MARCA || {};
  var app = K.id('app');

  var YO = null;          /* quién entró */
  var ARRANQUE = null;    /* lo que trajo 'inicio' */

  var MODULOS = ['ORDENES', 'REGISTROS', 'CONFIGURACION', 'CONTRATISTAS', 'REQS', 'COMUS', 'INFORME'];

  /* ══════════════ el arranque, en UNA sola llamada ══════════════ */

  function leer(accion, datos, veces) {
    return K.pedir(accion, datos || {}, { ms: 60000 })['catch'](function (e) {
      var red = e && (e.codigo === 'RESPUESTA_NO_JSON' || e.codigo === 'SIN_RED' || e.codigo === 'TIEMPO');
      if (red && (veces || 0) < 1) return leer(accion, datos, (veces || 0) + 1);
      throw e;
    });
  }

  /* el login trae el arranque (pre.arranque) en el mismo viaje */
  function arranque(conEsqueleto, pre) {
    var yaVino = pre && pre.arranque ? pre.arranque : null;
    /* 25/09 · al abrir con la sesión ya iniciada: se pinta YA con el último
       arranque guardado y el viaje al CORE se hace por detrás (igual que en
       las otras seis apps; a Contabilidad no le había llegado) */
    var recordado = (!yaVino && conEsqueleto && K.recuerdo) ? K.recuerdo.leer() : null;
    var quitar = (!yaVino && !recordado && conEsqueleto && K.piezas.esqueletos && app)
      ? K.piezas.esqueletos.poner(app, { forma: 'ficha', cuantos: 1, sitio: 'reemplaza', espera: 'Cargando Contabilidad' })
      : function () {};

    return (yaVino ? Promise.resolve(yaVino) : recordado ? Promise.resolve(recordado) : leer('inicio')).then(function (d) {
      ARRANQUE = d;
      YO = d.yo || YO;
      if (d.personas && K.piezas.personas) K.piezas.personas.cargar(d.personas);
      if (d.push && K.piezas.avisos && K.piezas.avisos.configurar) K.piezas.avisos.configurar(d.push);
      if (d.config && K.piezas.guia) K.piezas.guia.configurar(d.config);   /* guías rápidas: el id del PDF de cada app llega en la configuración pública */
      if (d.config && K.piezas.creditos && K.piezas.creditos.configurar) K.piezas.creditos.configurar(d.config);
      if (K.recuerdo) { if (recordado) setTimeout(refrescarArranque, 30); else K.recuerdo.guardar(d); }
      quitar();
      return d;
    }, function (e) {
      quitar();
      throw e;
    });
  }

  /* 25/09 · el 'inicio' de verdad, por detrás: se aplica, se guarda y, si la
     persona sigue en el inicio, se vuelve a pintar con lo nuevo. */
  function refrescarArranque() {
    leer('inicio').then(function (d) {
      return arranque(false, { arranque: d, refresco: true });
    }).then(function () {
      var v = String(location.hash || '').replace(/^#\/?/, '').split('/')[0] || 'inicio';
      if (v === 'inicio') enrutar();
    }, function (e) {
      var m = String((e && e.message) || '');
      if (/SESION|SIN_SESION/.test((e && e.codigo) || '') || (/sesi[oó]n/i.test(m) && /(venci|no valida|no válida|inicia)/i.test(m))) {
        try { K.piezas.sesion.salir(true); } catch (x) {}
      }
    });
  }

  K.listo(function () {
    registrarSW();
    if (K.piezas.instalar) K.piezas.instalar.vigilar();
    if (K.piezas.version) K.piezas.version.vigilar();

    var puerta = K.piezas.bienvenida
      ? K.piezas.bienvenida.abrir({
          titulo: 'Contabilidad',
          sub: M.MUNICIPIO || 'Alcaldía de Flandes',
          imagen: M.APP_ICON || 'img/icono-512.png'
        })
      : Promise.resolve('saltada');

    puerta.then(function () {
      K.piezas.sesion.entrar({
        titulo: 'CONTABILIDAD',
        sub: 'Ingresa con tu documento y contraseña',
        imagen: M.APP_ICON || 'img/icono-512.png',
        arranqueEnLogin: true,
        comprobar: function (login) { return arranque(true, login).then(function (d) { return d.yo; }); },
        alEntrar: arrancar
      });
    });
  });

  function registrarSW() {
    if (!('serviceWorker' in navigator)) return;
    /* 25/09 · updateViaCache 'none': sw.js toma su número de version.js y,
       sin esto, el navegador revisaba version.js en su caché de 10 minutos
       y no se enteraba de la publicación: el service worker nuevo no se
       instalaba y la app seguía con el armazón viejo. */
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })['catch'](function () {});
  }

  function arrancar(yo) {
    YO = yo || {};
    montarBanner();

    if (K.piezas.avisos) {
      K.piezas.avisos.autoActivar();
      K.piezas.avisos.alLlegar(function (a) {
        K.aviso(a.titulo ? (a.titulo + ': ' + a.cuerpo) : a.cuerpo, 'info', 6000);
      });
    }

    if (window.AYUDA) {
      window.AYUDA.configurar(function () {
        return { yo: YO, arranque: ARRANQUE, ordenes: window.ORDENES || null, registros: window.REGISTROS || null, vista: vistaActual() };
      });
    }

    var c = { app: app, puede: puede, irA: irA, errorCaja: errorCaja,
              esDev: function () { return K.norm((YO && YO.rol) || '') === 'DEV'; },
              yo: function () { return YO || {}; },
              alcance: function () { return {}; },
              config: function () { return (ARRANQUE && ARRANQUE.config) || {}; },
              miFoto: miFoto, abrirFoto: abrirFoto,
              /* la firma cambió: las órdenes se vuelven a pedir con el estado nuevo */
              alFirma: function (r) { if (YO && r) YO.firma = r.id; if (ARRANQUE && r) ARRANQUE.firmas = r.firmas; },
              /* los números del inicio siguen a la lista sin otro viaje */
              alCambiar: function (n) { if (ARRANQUE) ARRANQUE.ordenes = n; } };
    MODULOS.forEach(function (m) { if (window[m]) window[m].configurar(c); });

    K.cuando('kit:foto', function (r) {
      YO.imagen = r.url || '';
      K.piezas.banner.perfil({ foto: r.foto || '' });
      var cara = document.querySelector('.saludo .kit-perfil-cara');
      if (cara && K.piezas.perfil) cara.parentNode.replaceChild(caraPerfil(), cara);
    });

    window.addEventListener('hashchange', enrutar);
    enrutar();
  }

  /* ══════════════ permisos ══════════════ */
  function puede(vista) {
    var r = K.norm((YO && YO.rol) || '');
    if (r === 'DEV') return true;
    var v = (YO && YO.vistas) || [];
    for (var i = 0; i < v.length; i++) if (K.norm(v[i]) === K.norm(vista)) return true;
    return false;
  }

  function miFoto(ancho) {
    return K.miniDrive ? K.miniDrive(YO.imagen || '', ancho || 200) : (YO.imagen || '');
  }

  function abrirFoto() {
    if (!K.piezas.perfil) return;
    K.piezas.perfil.abrir({ nombre: YO.nombre || '', foto: miFoto(512) });
  }

  function caraPerfil() {
    return K.piezas.perfil.cara(YO.nombre || '', miFoto(200), {
      tam: 66, fotoActual: function () { return miFoto(512); }
    });
  }

  function montarBanner() {
    var menu = [{ texto: 'Foto de perfil', al: abrirFoto }];
    if (puede('configuracion')) {
      menu.push({ texto: 'Mi firma y mi foto', al: function () { irA('perfil'); } });
      menu.push({ texto: 'Configuración', al: function () { irA('configuracion'); } });
    }
    menu.push({ texto: 'Actualizar contraseña', al: function () { K.piezas.sesion.cambiarClave(); } });
    menu.push({ texto: 'Instalar la app', al: function () { K.piezas.instalar.abrir(); } });
    /* soporte en TODAS las apps: hoja SOPORTE + grupo de desarrollo */
    if (K.piezas.guia) menu.push(K.piezas.guia.opcion('CONTABILIDAD'));
    menu.push({ texto: 'Soporte', al: function () { if (K.piezas.soporte) K.piezas.soporte.abrir({ vista: vistaActual() }); } });
    menu.push({ texto: 'Cerrar sesión', al: salir, peligro: true });
    K.piezas.banner.montar({
      titulo: 'Contabilidad',
      nombre: YO.nombre || '',
      rol: rolLegible(YO.rol),
      foto: miFoto(200),
      menu: menu
    });
    if (K.piezas.cielo) K.piezas.cielo.soloFondo(document.querySelector('.kit-banner'));
  }

  function rolLegible(r) {
    var n = K.norm(r || '');
    if (n === 'CONTABLE') return 'CONTABLE · Contabilidad';
    if (n === 'OFICINA') return 'CONTADOR · Contabilidad';
    if (n === 'DEV') return 'DEV · Desarrollo';
    return r || 'Contabilidad';
  }

  function salir() {
    if (K.piezas.avisos) K.piezas.avisos.olvidar();
    if (K.piezas.insights) K.piezas.insights.quitar();
    MODULOS.forEach(function (m) { if (window[m] && window[m].olvidar) window[m].olvidar(); });
    if (window.OFICINA && window.OFICINA.olvidarDocs) window.OFICINA.olvidarDocs();
    K.piezas.sesion.salir();
    location.hash = '';
  }

  /* ══════════════ vistas ══════════════ */

  var VISTAS = {
    inicio: vistaInicio,
    ordenes: function () { window.ORDENES.lista(); },
    orden: function (sub) { window.ORDENES.detalle(sub); },
    registros: function () { window.REGISTROS.vista(); },
    contratistas: function (sub) { window.CONTRATISTAS.lista(sub); },
    contratista: function (sub) { window.CONTRATISTAS.detalle(sub); },
    informe: function (sub) { window.INFORME.vista(sub); },
    requerimientos: function () { window.REQS.vista(); },
    comunicados: function () { window.COMUS.vista(); },
    configuracion: function () { window.CONFIGURACION.vista(); },
    perfil: function () { window.CONFIGURACION.vista('firma'); }
  };

  var titulos = {
    inicio: 'Contabilidad',
    ordenes: 'ÓRDENES DE PAGO',
    orden: 'ORDEN DE PAGO',
    registros: 'REGISTROS',
    contratistas: 'CONTRATISTAS',
    contratista: 'CONTRATISTA',
    informe: 'INFORME DE CUENTAS',
    requerimientos: 'REQUERIMIENTOS',
    comunicados: 'COMUNICADOS',
    configuracion: 'CONFIGURACIÓN',
    perfil: 'MI FIRMA Y MI FOTO'
  };

  var PERMISO = { ordenes: 'ordenesPago', orden: 'ordenesPago', registros: 'registros',
                  contratistas: 'contratistas', contratista: 'contratistas', informe: 'contratistas',
                  requerimientos: 'requerimientos', comunicados: 'comunicados',
                  configuracion: 'configuracion', perfil: 'configuracion' };

  function irA(v) { location.hash = '#/' + v; }

  function vistaActual() {
    var v = String(location.hash || '').replace(/^#\/?/, '').split('/')[0] || 'inicio';
    return titulos[v] || v;
  }

  function enrutar() {
    var partes = String(location.hash || '').replace(/^#\/?/, '').split('/');
    var v = partes[0] || 'inicio';
    if (!VISTAS[v]) v = 'inicio';
    if (v !== 'inicio' && !puede(PERMISO[v] || v)) v = 'inicio';

    K.piezas.banner.vista(titulos[v]);
    var resto = partes.slice(1).join('/');
    K.piezas.banner.atras(v === 'inicio' ? null : function () {
      if (v === 'orden') irA('ordenes');
      else if (v === 'contratista' || v === 'informe') irA('contratistas');
      else irA('inicio');
    });

    app.innerHTML = '';
    if (window.AYUDA) window.AYUDA.montar(v);
    window.scrollTo(0, 0);
    VISTAS[v](resto);
  }

  /* ---------- inicio ---------- */

  function vistaInicio() {
    var caja = K.nodo('<div class="kit-ancho vista"></div>');
    var saludo = K.nodo(
      '<section class="saludo">' +
      '  <div class="saludo__txt">' +
      '    <p class="saludo__hola">' + K.esc(saludoDelDia()) + ',</p>' +
      '    <h2 class="saludo__nombre">' + K.esc(nombreCorto(YO.nombre)) + '</h2>' +
      '    <p class="saludo__doc">' + K.esc(rolLegible(YO.rol)) + ' · ' + K.esc(fechaHumana(new Date())) + '</p>' +
      '  </div>' +
      '</section>'
    );
    if (K.piezas.perfil && K.piezas.personas) saludo.appendChild(caraPerfil());
    if (K.piezas.cielo) K.piezas.cielo.poner(saludo, { burbujas: 3 });
    caja.appendChild(saludo);

    /* la firma: sin ella no sale la orden (el aviso llega con el arranque, sin otro viaje) */
    var fi = ARRANQUE && ARRANQUE.firmas;
    if (fi && !fi.listo && fi.faltan && fi.faltan.length && puede('ordenesPago')) {
      var av = K.nodo('<section class="kit-tarjeta rv-aviso op-firmas">' + K.icono('lapiz', 18) +
        '<span>Para crear órdenes de pago falta ' + K.esc(fi.faltan.join(' y ')) + '.</span></section>');
      if (puede('configuracion') && fi.yo && !fi.yo.firma) {
        var bf = K.nodo('<button type="button" class="kit-btn kit-btn--marca op-mini">Subir mi firma</button>');
        bf.addEventListener('click', function () { irA('perfil'); });
        av.appendChild(bf);
      }
      caja.appendChild(av);
    }

    function bloque(titulo, tarjetas) {
      var s = K.nodo('<section class="bloque" aria-label="' + K.esc(titulo) + '">' +
        '<h3 class="bloque__t">' + K.esc(titulo) + '</h3></section>');
      var r = K.nodo('<div class="kit-rejilla kit-rejilla--auto accesos"></div>');
      tarjetas.forEach(function (t) { r.appendChild(t); });
      s.appendChild(r);
      caja.appendChild(s);
      return s;
    }

    var accOrd = null;
    var tOrd = [];
    if (puede('ordenesPago')) {
      accOrd = acceso('ÓRDENES DE PAGO', 'Las cuentas cerradas por Supervisión: descuentos, orden en PDF y aviso a Tesorería',
        'img/procesos_de_cuenta.webp', function () { abrirLista({}); });
      tOrd.push(accOrd);
    }
    if (puede('registros')) tOrd.push(acceso('REGISTROS', esOficina() ? 'Todas las órdenes creadas, por contable y por periodo, en PDF o Excel' : 'Las órdenes que elaboraste, todas o por periodo, en PDF o Excel',
      'img/pdf.webp', function () { irA('registros'); }));
    if (tOrd.length) bloque('ÓRDENES DE PAGO', tOrd);

    var tGente = [];
    if (puede('contratistas')) {
      tGente.push(acceso('CONTRATISTAS', 'Todos los contratos: ficha, adiciones, cesiones, WhatsApp y Drive',
        'img/contratista.webp', function () { irA('contratistas'); }));
      tGente.push(acceso('DESCARGAR INFORME', 'Las cuentas de un contratista en PDF (informe) o Excel (todas las columnas)',
        'img/datos_de_procesos.webp', function () { K.aviso('Toca Informe en la tarjeta del contratista.', 'info', 3500); irA('contratistas'); }));
    }
    if (puede('requerimientos')) tGente.push(acceso('REQUERIMIENTOS', 'Pídele algo a uno o a varios contratistas y sigue si ya lo atendieron',
      'img/notificacion.webp', function () { irA('requerimientos'); }));
    if (tGente.length) bloque('CONTRATISTAS', tGente);

    var tOf = [];
    if (puede('comunicados')) tOf.push(acceso('COMUNICADOS', 'Publica avisos con documentos: llegan como notificación al teléfono de los contratistas',
      'img/chat.webp', function () { irA('comunicados'); }));
    if (puede('configuracion')) {
      tOf.push(accesoIcono('CONFIGURACIÓN', 'Retenciones, porcentajes y cuentas contables de la orden de pago', 'herramienta', function () { irA('configuracion'); }));
      tOf.push(acceso('MI FIRMA Y MI FOTO', 'La firma que sale en tus órdenes de pago y tu foto de perfil',
        'img/imagen.webp', function () { irA('perfil'); }));
    }
    if (tOf.length) bloque('OFICINA', tOf);

    var destino = K.nodo('<section class="resumen"></section>');
    if (accOrd) {
      var sRes = K.nodo('<section class="bloque" aria-label="Resumen de órdenes"><h3 class="bloque__t">RESUMEN DE ÓRDENES POR HACER</h3></section>');
      sRes.appendChild(destino);
      caja.appendChild(sRes);
    }

    app.appendChild(caja);
    K.piezas.creditos.montar(caja);

    if (accOrd && window.ORDENES) {
      K.piezas.esqueletos.mientras(destino, window.ORDENES.cargar(false), { forma: 'ficha', cuantos: 1, espera: 'Cargando las cuentas cerradas' })
        .then(function () {
          var n = window.ORDENES.contar();
          burbuja(accOrd, n.total, 'por hacer', 'Estás al día: no hay cuentas esperando orden de pago');
          pintarResumen(destino, n);
        })
        ['catch'](function (e) { destino.appendChild(errorCaja(e)); });
    }
  }

  function esOficina() { var r = K.norm((YO && YO.rol) || ''); return r === 'OFICINA' || r === 'DEV'; }

  function burbuja(acc, n, que, vacio) {
    if (!acc) return;
    var p = acc.querySelector('.acceso__p');
    if (n) acc.insertAdjacentHTML('beforeend', '<b class="acceso__burbuja rv-burbuja" aria-label="' + n + ' ' + que + '">' + (n > 99 ? '99+' : n) + '</b>');
    else if (p) p.textContent = vacio;
  }

  function abrirLista(f) {
    if (window.ORDENES && window.ORDENES.filtrar) window.ORDENES.filtrar(f || {});
    irA('ordenes');
  }

  function pintarResumen(destino, n) {
    destino.innerHTML = '';
    var caja = K.nodo('<div class="kit-tarjeta resumen__caja ct-resumen"></div>');
    var ref = K.nodo('<button type="button" class="kit-btn kit-btn--plano ct-recargar ct-recargar--mini" aria-label="Refrescar las cifras">' +
      K.icono('recargar', 16) + '<span>Refrescar</span></button>');
    ref.addEventListener('click', function () {
      ref.disabled = true; ref.classList.add('kit-ocupado');
      window.ORDENES.cargar(true).then(function () {
        var m = window.ORDENES.contar();
        pintarResumen(destino, m);
        var acc = document.querySelector('.acceso[data-clave="ordenes"]');
        if (acc) { var bb = acc.querySelector('.acceso__burbuja'); if (bb) bb.parentNode.removeChild(bb); burbuja(acc, m.total, 'por hacer', 'Estás al día: no hay cuentas esperando orden de pago'); }
        K.aviso('Cifras al día.', 'ok', 2000);
      }, function (e) { K.aviso((e && e.message) || 'No se pudo refrescar.', 'malo', 5000); ref.disabled = false; ref.classList.remove('kit-ocupado'); });
    });
    caja.appendChild(ref);
    var cifras = K.nodo('<div class="ct-cifras sp-cifras"></div>');
    [
      ['', n.total, 'Por hacer'],
      ['primera', n.primeras, 'Primeras del tramo'],
      ['resto', Math.max(0, (n.total || 0) - (n.primeras || 0)), 'Las demás'],
      ['cesion', n.cesion, 'Con RP de cesión'],
      ['pdf', n.conPdf, 'Orden generada']
    ].forEach(function (c) {
      var b = K.nodo('<button type="button" class="ct-cifra"><b>' + K.numero(c[1] || 0) + '</b><span>' + K.esc(c[2]) + '</span></button>');
      b.addEventListener('click', function () { K.vibrar(6); abrirLista({ tramo: c[0] }); });
      cifras.appendChild(b);
    });
    caja.appendChild(cifras);
    caja.appendChild(K.nodo('<p class="ct-resumen__t sp-total">' + K.numero(n.total || 0) + ' cuentas cerradas esperando orden de pago' +
      (n.primeras ? ' · ' + K.numero(n.primeras) + ' llevan estampillas (primera cuenta del tramo)' : '') + '</p>'));
    destino.appendChild(caja);
  }

  function acceso(titulo, texto, medio, al) {
    var b = K.nodo(
      '<button type="button" class="kit-tarjeta acceso">' +
      '  <img class="acceso__img" src="' + K.esc(K.medio(medio)) + '" alt="" loading="lazy">' +
      '  <span class="acceso__txt">' +
      '    <span class="acceso__t">' + K.esc(titulo) + '</span>' +
      '    <span class="acceso__p">' + K.esc(texto) + '</span>' +
      '  </span>' +
      '</button>'
    );
    if (titulo === 'ÓRDENES DE PAGO') b.setAttribute('data-clave', 'ordenes');
    b.addEventListener('click', function () { K.vibrar(8); al(); });
    return b;
  }

  /** Sin imagen en ALCALDIA-MEDIOS para Configuración: el icono del kit, del mismo tamaño. */
  function accesoIcono(titulo, texto, icono, al) {
    var b = K.nodo(
      '<button type="button" class="kit-tarjeta acceso">' +
      '  <span class="acceso__img acceso__img--icono" aria-hidden="true">' + K.icono(icono, 40) + '</span>' +
      '  <span class="acceso__txt">' +
      '    <span class="acceso__t">' + K.esc(titulo) + '</span>' +
      '    <span class="acceso__p">' + K.esc(texto) + '</span>' +
      '  </span>' +
      '</button>'
    );
    b.addEventListener('click', function () { K.vibrar(8); al(); });
    return b;
  }

  /* ══════════════ auxiliares ══════════════ */

  function saludoDelDia() {
    var h = new Date().getHours();
    return h < 12 ? 'Buenos días' : (h < 19 ? 'Buenas tardes' : 'Buenas noches');
  }

  function fechaHumana(d) {
    var dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    var meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
                 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return dias[d.getDay()] + ' ' + d.getDate() + ' de ' + meses[d.getMonth()];
  }

  function nombreCorto(n) {
    var p = String(n || '').trim().split(/\s+/);
    if (!p[0]) return '';
    return p.length > 1 ? (p[0] + ' ' + p[1]) : p[0];
  }

  function errorCaja(e, alReintentar) {
    var msg = (e && e.message) ? e.message : 'No se pudo cargar.';
    var c = K.nodo(
      '<section class="kit-tarjeta error">' +
      '  <p class="error__t">' + K.esc(msg) + '</p>' +
      '  <button type="button" class="kit-btn kit-btn--plano">Reintentar</button>' +
      '</section>'
    );
    c.querySelector('button').addEventListener('click', function () {
      if (alReintentar) alReintentar(); else enrutar();
    });
    return c;
  }
}());
