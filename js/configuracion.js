/* ============================================================
   CONTABILIDAD-FLANDES · CONFIGURACIÓN
   Fase 7

   UNA llamada ('configuracion') trae todo lo de esta vista:
     · MI FIRMA Y MI FOTO: la firma que sale en la orden de pago
       (Elaboró; la del usuario OFICINA va como CONTADOR). Se sube con
       foto, arrastrándola o pegándola (Ctrl+V), y se le quita el fondo.
     · RETENCIONES: nombre, código, tipo (EST, I.C.A., Fuente, IVA),
       porcentaje, sobre qué base (el cobro, el valor del tramo o el IVA),
       si es solo de la primera cuenta del tramo, si va marcada por
       defecto o es automática, a qué tipos de contrato aplica y si
       reemplaza a otra (ReteIVA reemplaza al ReteICA).
     · CUENTAS CONTABLES por tipo de contrato (débito y crédito) y la
       opción Publicidad y propaganda.
     · CATÁLOGO: cuentas que se agregan para escogerlas en la orden.
     · REGLAS: Régimen Simple, Convenio de Cooperación e IVA.
   Todo vive en la hoja CONFIG del CORE. Guardar es una llamada por
   bloque ('configGuardar') y la respuesta trae la configuración nueva.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var C = {};
  var CFG = null;

  var TIPOS_BASE = [{ v: 'COBRO', t: 'El cobro de la cuenta' }, { v: 'TRAMO', t: 'El valor del tramo (contrato o adición)' }, { v: 'IVA', t: 'El IVA incluido en el cobro' }];

  function O() { return window.OFICINA; }
  function nombre(s) { return K.piezas.personas ? K.piezas.personas.nombrePropio(s) : String(s || ''); }
  function tipoCorto(t) { return window.ORDENES ? window.ORDENES.tipoCorto(t) : t; }
  function copia(x) { return JSON.parse(JSON.stringify(x || null)); }

  var SOLO_FIRMA = false;

  /** sub = 'firma' → solo MI FIRMA Y MI FOTO (el acceso del inicio y del menú). */
  function vista(sub) {
    SOLO_FIRMA = sub === 'firma';
    var caja = K.nodo('<div class="kit-ancho vista cf"></div>');
    C.app.appendChild(caja);
    if (SOLO_FIRMA) O().cabecera(caja, 'lapiz', 'MI FIRMA Y MI FOTO', 'La firma que sale en tus órdenes de pago y tu foto de perfil.');
    else O().cabecera(caja, 'herramienta', 'CONFIGURACIÓN',
      'Tu firma y tu foto, y las reglas con las que se liquida cada orden de pago: retenciones, porcentajes y cuentas contables. ' +
      'Lo que cambies aquí vale para todo Contabilidad desde la próxima orden.');
    var zona = K.nodo('<div class="cf-zona"></div>');
    caja.appendChild(zona);
    K.piezas.esqueletos.mientras(zona, O().leer('configuracion'), { forma: 'ficha', cuantos: 2, espera: 'Cargando la configuración' })
      .then(function (d) { CFG = d; pintar(zona); })
      ['catch'](function (e) { zona.appendChild(C.errorCaja(e)); });
    K.piezas.creditos.montar(caja);
  }

  function pintar(zona) {
    zona.innerHTML = '';
    zona.appendChild(bloqueFirma());
    if (SOLO_FIRMA) return;
    zona.appendChild(bloqueRetenciones());
    zona.appendChild(bloqueCuentas());
    zona.appendChild(bloqueCatalogo());
    zona.appendChild(bloqueReglas());
  }

  function guardar(que, valor, boton, zona) {
    var datos = {}; datos[que] = valor;
    boton.disabled = true;
    return K.piezas.guardado.mientras(K.pedir('configGuardar', datos, { ms: 60000 }), {
      titulo: 'Guardando la configuración', sub: 'Vale desde la próxima orden de pago.',
      pasos: ['Revisando los valores…', 'Guardando en CONFIG…'], listo: { titulo: 'Configuración guardada', paso: 'Lista para la próxima orden' }
    }).then(function (r) {
      CFG = r.config;
      if (window.ORDENES) window.ORDENES.soltar();   /* la lista trae el motor: se vuelve a pedir con lo nuevo */
      pintar(boton.closest('.cf-zona') || zona);
    }, function (e) { boton.disabled = false; K.aviso((e && e.message) || 'No se pudo guardar.', 'malo', 7000); });
  }

  function seccion(icono, titulo, texto) {
    var s = K.nodo('<section class="kit-tarjeta grupo cf-bloque"><h3 class="grupo__t">' + K.icono(icono, 16) + ' ' + K.esc(titulo) + '</h3>' +
      (texto ? '<p class="formulario__nota">' + texto + '</p>' : '') + '</section>');
    return s;
  }

  /* ══════════════ FIRMA Y FOTO ══════════════ */

  function bloqueFirma() {
    var f = (CFG && CFG.firma) || {};
    var est = (CFG && CFG.firmas) || {};
    var s = seccion('lapiz', 'MI FIRMA Y MI FOTO', 'La firma va en la orden de pago: en <b>Elaboró</b> la de quien la crea y en <b>CONTADOR</b> la del usuario OFICINA' +
      (est.contador ? ' (hoy ' + K.esc(nombre(est.contador.nombre)) + ')' : '') + '. Si la crea el usuario OFICINA, su firma va en los dos lugares.');
    var yo = (C.yo && C.yo()) || {};
    var fila = K.nodo('<div class="cf-firma"></div>');
    if (K.piezas.perfil) {
      var gf = K.nodo('<div class="cf-foto"></div>');
      gf.appendChild(K.piezas.perfil.cara(yo.nombre || '', C.miFoto ? C.miFoto(200) : '', { tam: 88, fotoActual: function () { return C.miFoto ? C.miFoto(512) : ''; } }));
      var bf = K.nodo('<button type="button" class="kit-btn kit-btn--plano">' + K.icono('camara', 16) + ' Cambiar mi foto</button>');
      bf.addEventListener('click', function () { if (C.abrirFoto) C.abrirFoto(); });
      gf.appendChild(bf);
      fila.appendChild(gf);
    }
    var gd = K.nodo('<div class="cf-firma__zona"></div>');
    var marco = K.nodo('<div class="pf-marco cf-soltar" tabindex="0" aria-label="Firma: arrastra o pega aquí la imagen"></div>');
    function pintarMarco(src) {
      marco.innerHTML = '';
      if (src) { var img = K.nodo('<img class="pf-img" alt="Tu firma">'); img.src = src; marco.appendChild(img); }
      else marco.appendChild(K.nodo('<p class="formulario__nota formulario__nota--fuerte">No tienes firma cargada: no podrás crear órdenes de pago.</p>'));
      marco.appendChild(K.nodo('<p class="cf-soltar__t">' + K.icono('arrastrar', 14) + ' Arrastra aquí la foto de tu firma o pégala (Ctrl+V)</p>'));
    }
    pintarMarco(f.mini || '');
    gd.appendChild(marco);
    var inp = K.nodo('<input type="file" accept="image/png,image/jpeg,image/webp" hidden>');
    var elegir = K.nodo('<button type="button" class="kit-btn kit-btn--marca">' + K.icono('camara', 16) + ' ' + (f.mini ? 'Cambiar mi firma' : 'Subir mi firma') + '</button>');
    elegir.addEventListener('click', function () { inp.click(); });
    gd.appendChild(inp); gd.appendChild(elegir);
    var prev = K.nodo('<div class="pf-prev" hidden></div>');
    gd.appendChild(prev);
    function tomar(file) {
      if (!file || !/^image\//.test(file.type)) { K.aviso('Elige una imagen (la foto de la firma).', 'aviso', 4000); return; }
      limpiarFirma(file).then(function (png) { previa(png); }, function (e) { K.aviso((e && e.message) || 'No se pudo leer la imagen.', 'malo', 5000); });
    }
    inp.addEventListener('change', function () { var file = inp.files && inp.files[0]; inp.value = ''; tomar(file); });
    ['dragenter', 'dragover'].forEach(function (ev) { marco.addEventListener(ev, function (e) { e.preventDefault(); marco.classList.add('cf-soltar--sobre'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { marco.addEventListener(ev, function () { marco.classList.remove('cf-soltar--sobre'); }); });
    marco.addEventListener('drop', function (e) { e.preventDefault(); var fl = e.dataTransfer && e.dataTransfer.files; if (fl && fl[0]) tomar(fl[0]); });
    marco.addEventListener('paste', function (e) { pegar(e); });
    s.addEventListener('paste', function (e) { pegar(e); });
    function pegar(e) {
      var it = (e.clipboardData && e.clipboardData.items) || [];
      for (var i = 0; i < it.length; i++) if (/^image\//.test(it[i].type)) { e.preventDefault(); tomar(it[i].getAsFile()); return; }
    }
    function previa(png) {
      prev.hidden = false; prev.innerHTML = '';
      prev.appendChild(K.nodo('<p class="grupo__t">Así va a quedar</p>'));
      var m = K.nodo('<div class="pf-marco pf-marco--previa"><img class="pf-img" alt="Vista previa de la firma"></div>');
      m.querySelector('img').src = png;
      prev.appendChild(m);
      var a = K.nodo('<div class="ct-acc"></div>');
      var no = K.nodo('<button type="button" class="kit-btn kit-btn--plano">Cancelar</button>');
      var si = K.nodo('<button type="button" class="kit-btn kit-btn--marca">' + K.icono('check', 16) + ' Guardar firma</button>');
      no.addEventListener('click', function () { prev.hidden = true; prev.innerHTML = ''; });
      si.addEventListener('click', function () {
        si.disabled = true; no.disabled = true;
        K.piezas.guardado.mientras(K.pedir('firmaGuardar', { imagen: png }, { ms: 90000 }), {
          titulo: 'Guardando tu firma', sub: 'No cierres la app.',
          pasos: ['Subiendo la firma…', 'Poniéndola en tus órdenes…', 'Listo'],
          listo: { titulo: 'Firma guardada', paso: 'Tus próximas órdenes salen con esta firma' }
        }).then(function (r) {
          pintarMarco(png);
          prev.hidden = true; prev.innerHTML = '';
          elegir.innerHTML = K.icono('camara', 16) + ' Cambiar mi firma';
          if (CFG) CFG.firmas = r.firmas;
          if (window.ORDENES) window.ORDENES.soltar();
          if (C.alFirma) C.alFirma(r);
        }, function (e) { si.disabled = false; no.disabled = false; K.aviso((e && e.message) || 'No se pudo guardar la firma.', 'malo', 7000); });
      });
      a.appendChild(no); a.appendChild(si);
      prev.appendChild(a);
    }
    fila.appendChild(gd);
    s.appendChild(fila);
    if (est.faltan && est.faltan.length) s.appendChild(K.nodo('<p class="op-nota op-nota--aviso">' + K.icono('aviso', 14) + ' Para crear órdenes falta ' + K.esc(est.faltan.join(' y ')) + '.</p>'));
    return s;
  }

  /** La foto de la firma → PNG transparente y recortado (igual que en Supervisión). */
  function limpiarFirma(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        try {
          var escala = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
          var w = Math.max(1, Math.round(img.naturalWidth * escala)), h = Math.max(1, Math.round(img.naturalHeight * escala));
          var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          var cx = cv.getContext('2d');
          cx.drawImage(img, 0, 0, w, h);
          var d = cx.getImageData(0, 0, w, h), p = d.data;
          var x0 = w, y0 = h, x1 = -1, y1 = -1;
          for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
              var i = (y * w + x) * 4;
              var luz = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
              var alfa = luz >= 200 ? 0 : (luz <= 140 ? 255 : Math.round((200 - luz) * 255 / 60));
              p[i + 3] = Math.min(p[i + 3], alfa);
              if (p[i + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
            }
          }
          URL.revokeObjectURL(url);
          if (x1 < 0) { rej(new Error('No se ve ningún trazo: toma la foto con más luz y la firma en tinta oscura.')); return; }
          cx.putImageData(d, 0, 0);
          var m = Math.round(Math.max(w, h) * 0.02);
          x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m); x1 = Math.min(w - 1, x1 + m); y1 = Math.min(h - 1, y1 + m);
          var cw = x1 - x0 + 1, ch = y1 - y0 + 1;
          var f = Math.min(1, 900 / cw);
          var out = document.createElement('canvas'); out.width = Math.round(cw * f); out.height = Math.round(ch * f);
          out.getContext('2d').drawImage(cv, x0, y0, cw, ch, 0, 0, out.width, out.height);
          res(out.toDataURL('image/png'));
        } catch (e) { rej(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('No se pudo leer la imagen.')); };
      img.src = url;
    });
  }

  /* ══════════════ RETENCIONES ══════════════ */

  function campo(etq, input, clase) {
    var l = K.nodo('<label class="op-campo' + (clase ? ' ' + clase : '') + '"><span>' + K.esc(etq) + '</span></label>');
    l.appendChild(input);
    return l;
  }
  function entrada(v, extra) { var i = K.nodo('<input' + (extra || '') + '>'); i.value = v === undefined || v === null ? '' : v; return i; }
  function selector(ops, v) {
    var s = K.nodo('<select class="op-select"></select>');
    ops.forEach(function (o) { var x = document.createElement('option'); x.value = o.v; x.textContent = o.t; if (o.v === v) x.selected = true; s.appendChild(x); });
    return s;
  }
  function interruptor(texto, v) {
    var l = K.nodo('<label class="op-check cf-sw"><input type="checkbox"><span></span></label>');
    l.querySelector('span').textContent = texto;
    l.querySelector('input').checked = !!v;
    return l;
  }

  function bloqueRetenciones() {
    var mot = (CFG && CFG.motor) || {};
    var lista = copia(mot.retenciones || []);
    var tipos = mot.tipos || [];
    var s = seccion('check', 'RETENCIONES Y DESCUENTOS',
      'Cada fila es un check de la orden de pago. <b>Automática</b>: se aplica siempre y no se desmarca (ReteICA). ' +
      '<b>Solo primera cuenta</b>: únicamente en la primera cuenta del contrato primario, de la 1ª o de la 2ª adición (las estampillas).');
    var zona = K.nodo('<div class="cf-ret"></div>');
    s.appendChild(zona);

    function tarjetaRet(r, idx) {
      var t = K.nodo('<article class="cf-item' + (r.activa === false ? ' cf-item--off' : '') + '"></article>');
      var cab = K.nodo('<div class="cf-item__cab"><b></b><button type="button" class="kit-btn kit-btn--plano op-mini cf-quitar" title="Quitar">' + K.icono('basura', 14) + '</button></div>');
      cab.querySelector('b').textContent = r.nombre || 'Nueva retención';
      cab.querySelector('.cf-quitar').addEventListener('click', function () {
        K.piezas.confirmar.preguntar({ titulo: 'Quitar ' + (r.nombre || 'esta retención'), texto: 'Deja de salir en las órdenes nuevas. Las ya creadas no cambian.', si: 'Quitar', peligro: true })
          .then(function (si) { if (si) { lista.splice(idx, 1); dibujar(); } });
      });
      t.appendChild(cab);
      var g = K.nodo('<div class="cf-item__campos"></div>');
      var nom = entrada(r.nombre, ' maxlength="80"'); nom.addEventListener('input', function () { r.nombre = nom.value; cab.querySelector('b').textContent = nom.value; });
      var cod = entrada(r.codigo, ' inputmode="numeric" maxlength="12" placeholder="Código contable"'); cod.addEventListener('input', function () { r.codigo = cod.value.replace(/\D/g, ''); cod.value = r.codigo; });
      var tip = entrada(r.tipo, ' maxlength="12" placeholder="EST, I.C.A., Fuente"'); tip.addEventListener('input', function () { r.tipo = tip.value; });
      var pct = entrada(String(r.porcentaje === undefined ? '' : r.porcentaje).replace('.', ','), ' inputmode="decimal" maxlength="6"');
      pct.addEventListener('input', function () { r.porcentaje = Number(pct.value.replace(',', '.')) || 0; });
      var base = selector(TIPOS_BASE, r.base || 'COBRO'); base.addEventListener('change', function () { r.base = base.value; });
      g.appendChild(campo('Nombre', nom, 'cf-ancho'));
      g.appendChild(campo('Código', cod));
      g.appendChild(campo('Tipo (columna del PDF)', tip));
      g.appendChild(campo('Porcentaje %', pct));
      g.appendChild(campo('Se calcula sobre', base, 'cf-ancho'));
      t.appendChild(g);
      var sws = K.nodo('<div class="cf-item__sw"></div>');
      [['activa', 'Encendida', r.activa !== false], ['automatica', 'Automática', r.automatica], ['soloPrimeraCuenta', 'Solo primera cuenta del tramo', r.soloPrimeraCuenta],
       ['porDefecto', 'Marcada por defecto', r.porDefecto]].forEach(function (x) {
        var sw = interruptor(x[1], x[2]);
        sw.querySelector('input').addEventListener('change', function (e) { r[x[0]] = e.target.checked; if (x[0] === 'activa') t.classList.toggle('cf-item--off', !e.target.checked); });
        sws.appendChild(sw);
      });
      t.appendChild(sws);
      /* a qué tipos de contrato aplica */
      var zt = K.nodo('<div class="cf-tipos"><span class="kit-exp__et">Aplica a</span></div>');
      var todos = (r.tipos || []).indexOf('*') >= 0;
      var chTodos = interruptor('Todos los tipos', todos);
      zt.appendChild(chTodos);
      var chs = [];
      tipos.forEach(function (tp) {
        var ch = interruptor(tipoCorto(tp), todos || (r.tipos || []).some(function (x) { return MOTOR.norm(x) === MOTOR.norm(tp); }));
        ch.querySelector('input').disabled = todos;
        ch.querySelector('input').addEventListener('change', function () { r.tipos = chs.filter(function (c) { return c.el.querySelector('input').checked; }).map(function (c) { return c.tipo; }); });
        chs.push({ el: ch, tipo: tp });
        zt.appendChild(ch);
      });
      chTodos.querySelector('input').addEventListener('change', function (e) {
        chs.forEach(function (c) { c.el.querySelector('input').disabled = e.target.checked; c.el.querySelector('input').checked = e.target.checked || c.el.querySelector('input').checked; });
        r.tipos = e.target.checked ? ['*'] : chs.filter(function (c) { return c.el.querySelector('input').checked; }).map(function (c) { return c.tipo; });
      });
      t.appendChild(zt);
      /* a cuál reemplaza */
      var otras = lista.filter(function (x) { return x !== r && x.codigo; });
      if (otras.length) {
        var zr = K.nodo('<div class="cf-tipos"><span class="kit-exp__et">Cuando se marca, quita</span></div>');
        otras.forEach(function (x) {
          var ch = interruptor(x.nombre, (r.excluye || []).indexOf(x.codigo) >= 0);
          ch.querySelector('input').addEventListener('change', function (e) {
            r.excluye = (r.excluye || []).filter(function (k) { return k !== x.codigo; });
            if (e.target.checked) r.excluye.push(x.codigo);
          });
          zr.appendChild(ch);
        });
        t.appendChild(zr);
      }
      if (r.nota) t.appendChild(K.nodo('<p class="op-nota">' + K.icono('info', 13) + ' ' + K.esc(r.nota) + '</p>'));
      return t;
    }

    function dibujar() {
      zona.innerHTML = '';
      lista.forEach(function (r, i) { zona.appendChild(tarjetaRet(r, i)); });
    }
    dibujar();
    var acc = K.nodo('<div class="ct-acc"></div>');
    var mas = K.nodo('<button type="button" class="kit-btn kit-btn--plano">' + K.icono('mas', 16) + ' Agregar retención</button>');
    mas.addEventListener('click', function () {
      lista.push({ codigo: '', nombre: '', tipo: 'Fuente', porcentaje: 0, base: 'COBRO', soloPrimeraCuenta: false, automatica: false, porDefecto: false, activa: true, tipos: ['*'] });
      dibujar();
    });
    var g = K.nodo('<button type="button" class="kit-btn kit-btn--marca">' + K.icono('check', 16) + ' Guardar retenciones</button>');
    g.addEventListener('click', function () {
      var mal = lista.filter(function (r) { return !String(r.nombre || '').trim(); });
      if (mal.length) { K.aviso('Hay una retención sin nombre.', 'aviso', 4000); return; }
      guardar('retenciones', lista, g);
    });
    acc.appendChild(mas); acc.appendChild(g);
    s.appendChild(acc);
    return s;
  }

  /* ══════════════ CUENTAS CONTABLES POR TIPO ══════════════ */

  function bloqueCuentas() {
    var mot = (CFG && CFG.motor) || {};
    var lista = copia(mot.cuentas || []);
    var s = seccion('hoja', 'CUENTAS CONTABLES POR TIPO DE CONTRATO',
      'La cuenta débito y la crédito (la del beneficiario, que recibe el valor a girar) que salen en la orden según el tipo de contrato. ' +
      'La fila con <b>opción</b> se usa cuando en la orden se marca esa opción (Publicidad y propaganda).');
    var zona = K.nodo('<div class="cf-ret"></div>');
    s.appendChild(zona);
    function par(obj, clave, etq) {
      obj[clave] = obj[clave] || { codigo: '', nombre: '' };
      var w = K.nodo('<div class="cf-par"></div>');
      var c = entrada(obj[clave].codigo, ' inputmode="numeric" maxlength="12"');
      var n = entrada(obj[clave].nombre, ' maxlength="80"');
      c.addEventListener('input', function () { obj[clave].codigo = c.value.replace(/\D/g, ''); c.value = obj[clave].codigo; });
      n.addEventListener('input', function () { obj[clave].nombre = n.value; });
      w.appendChild(campo(etq + ' · código', c));
      w.appendChild(campo(etq + ' · nombre', n, 'cf-ancho'));
      return w;
    }
    function dibujar() {
      zona.innerHTML = '';
      lista.forEach(function (x, i) {
        var t = K.nodo('<article class="cf-item"><div class="cf-item__cab"><b></b><button type="button" class="kit-btn kit-btn--plano op-mini" title="Quitar">' + K.icono('basura', 14) + '</button></div></article>');
        t.querySelector('b').textContent = tipoCorto(x.tipo) + (x.opcion ? ' · con ' + x.opcion : '');
        t.querySelector('button').addEventListener('click', function () { lista.splice(i, 1); dibujar(); });
        var tp = selector(((mot.tipos) || []).map(function (y) { return { v: y, t: tipoCorto(y) }; }), x.tipo);
        tp.addEventListener('change', function () { x.tipo = tp.value; t.querySelector('b').textContent = tipoCorto(x.tipo) + (x.opcion ? ' · con ' + x.opcion : ''); });
        var op = entrada(x.opcion || '', ' maxlength="60" placeholder="(sin opción)"');
        op.addEventListener('input', function () { x.opcion = op.value.trim(); if (!x.opcion) delete x.opcion; });
        var g = K.nodo('<div class="cf-item__campos"></div>');
        g.appendChild(campo('Tipo de contrato', tp, 'cf-ancho'));
        g.appendChild(campo('Opción que la activa', op, 'cf-ancho'));
        t.appendChild(g);
        t.appendChild(par(x, 'debito', 'Débito'));
        t.appendChild(par(x, 'credito', 'Crédito'));
        zona.appendChild(t);
      });
    }
    dibujar();
    var acc = K.nodo('<div class="ct-acc"></div>');
    var mas = K.nodo('<button type="button" class="kit-btn kit-btn--plano">' + K.icono('mas', 16) + ' Agregar regla</button>');
    mas.addEventListener('click', function () { lista.push({ tipo: (mot.tipos || [''])[0], debito: { codigo: '', nombre: '' }, credito: { codigo: '', nombre: '' } }); dibujar(); });
    var g = K.nodo('<button type="button" class="kit-btn kit-btn--marca">' + K.icono('check', 16) + ' Guardar cuentas</button>');
    g.addEventListener('click', function () { guardar('cuentas', lista, g); });
    acc.appendChild(mas); acc.appendChild(g);
    s.appendChild(acc);
    return s;
  }

  /* ══════════════ CATÁLOGO ══════════════ */

  function bloqueCatalogo() {
    var extra = copia((CFG && CFG.extra) || []);
    var todas = ((CFG && CFG.motor && CFG.motor.catalogo) || []);
    var s = seccion('documento', 'CATÁLOGO DE CUENTAS',
      'Las cuentas que se pueden escoger a mano en la orden (el nombre de la cuenta y su número). Las de las reglas de arriba ya están; aquí agregas otras.');
    var ya = K.nodo('<div class="cf-chips"></div>');
    todas.forEach(function (c) { ya.appendChild(K.nodo('<span class="ct-marca">' + K.esc(c.codigo) + ' · ' + K.esc(c.nombre) + ' <small>' + K.esc(c.clase.toLowerCase()) + '</small></span>')); });
    s.appendChild(ya);
    var zona = K.nodo('<div class="cf-ret"></div>');
    s.appendChild(zona);
    function dibujar() {
      zona.innerHTML = '';
      extra.forEach(function (x, i) {
        var t = K.nodo('<article class="cf-item cf-item--fila"></article>');
        var c = entrada(x.codigo, ' inputmode="numeric" maxlength="12"'), n = entrada(x.nombre, ' maxlength="80"');
        var cl = selector([{ v: 'DEBITO', t: 'Débito' }, { v: 'CREDITO', t: 'Crédito' }, { v: 'RETENCION', t: 'Retención' }], x.clase || 'CREDITO');
        c.addEventListener('input', function () { x.codigo = c.value.replace(/\D/g, ''); c.value = x.codigo; });
        n.addEventListener('input', function () { x.nombre = n.value; });
        cl.addEventListener('change', function () { x.clase = cl.value; });
        var q = K.nodo('<button type="button" class="kit-btn kit-btn--plano op-mini" title="Quitar">' + K.icono('basura', 14) + '</button>');
        q.addEventListener('click', function () { extra.splice(i, 1); dibujar(); });
        t.appendChild(campo('Número', c)); t.appendChild(campo('Nombre de la cuenta', n, 'cf-ancho')); t.appendChild(campo('Clase', cl)); t.appendChild(q);
        zona.appendChild(t);
      });
    }
    dibujar();
    var acc = K.nodo('<div class="ct-acc"></div>');
    var mas = K.nodo('<button type="button" class="kit-btn kit-btn--plano">' + K.icono('mas', 16) + ' Agregar cuenta</button>');
    mas.addEventListener('click', function () { extra.push({ codigo: '', nombre: '', clase: 'CREDITO' }); dibujar(); });
    var g = K.nodo('<button type="button" class="kit-btn kit-btn--marca">' + K.icono('check', 16) + ' Guardar catálogo</button>');
    g.addEventListener('click', function () { guardar('catalogo', extra, g); });
    acc.appendChild(mas); acc.appendChild(g);
    s.appendChild(acc);
    return s;
  }

  /* ══════════════ REGLAS ══════════════ */

  function bloqueReglas() {
    var mot = (CFG && CFG.motor) || {};
    var r = copia(mot.reglas || {});
    r.regimenSimple = r.regimenSimple || { excluir: [] };
    r.convenio = r.convenio || {};
    var s = seccion('info', 'RÉGIMEN SIMPLE, CONVENIO E IVA',
      'Así quedó sembrado a partir de lo que ya se giró: a los contratistas de <b>Régimen Simple</b> se les descontó lo mismo que a los demás (42 cuentas pagadas lo confirman).' +
      'El <b>Convenio de Cooperación</b> no tiene cuentas giradas todavía: liquida como el tipo que escojas.');
    var zs = K.nodo('<div class="cf-tipos"><span class="kit-exp__et">A Régimen Simple NO se le aplica</span></div>');
    (mot.retenciones || []).forEach(function (x, i) {
      var k = String(x.codigo || '').trim() || x.nombre;
      var ch = interruptor(x.nombre, (r.regimenSimple.excluir || []).indexOf(k) >= 0 || (r.regimenSimple.excluir || []).indexOf(x.nombre) >= 0);
      ch.querySelector('input').addEventListener('change', function (e) {
        r.regimenSimple.excluir = (r.regimenSimple.excluir || []).filter(function (y) { return y !== k && y !== x.nombre; });
        if (e.target.checked) r.regimenSimple.excluir.push(k);
      });
      zs.appendChild(ch);
    });
    s.appendChild(zs);
    var g = K.nodo('<div class="cf-item__campos"></div>');
    var cv = selector((mot.tipos || []).filter(function (t) { return MOTOR.norm(t) !== MOTOR.norm(r.convenio.tipo || 'CONVENIO DE COOPERACION'); })
      .map(function (t) { return { v: t, t: tipoCorto(t) }; }), r.convenio.comoTipo);
    cv.addEventListener('change', function () { r.convenio.comoTipo = cv.value; });
    var iva = entrada(r.iva || 19, ' inputmode="numeric" maxlength="2"');
    iva.addEventListener('input', function () { r.iva = Number(iva.value) || 19; });
    g.appendChild(campo('El Convenio de Cooperación liquida como', cv, 'cf-ancho'));
    g.appendChild(campo('IVA % (para el ReteIVA)', iva));
    s.appendChild(g);
    var acc = K.nodo('<div class="ct-acc"></div>');
    var b = K.nodo('<button type="button" class="kit-btn kit-btn--marca">' + K.icono('check', 16) + ' Guardar reglas</button>');
    b.addEventListener('click', function () { guardar('reglas', { regimenSimple: r.regimenSimple, convenio: r.convenio, iva: r.iva || 19 }, b); });
    acc.appendChild(b);
    s.appendChild(acc);
    return s;
  }

  window.CONFIGURACION = {
    configurar: function (c) { C = c || {}; },
    vista: vista,
    olvidar: function () { CFG = null; },
    _cfg: function () { return CFG; },
    _limpiarFirma: limpiarFirma
  };
}());
