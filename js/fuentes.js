/* ============================================================
   CONTABILIDAD-FLANDES · FUENTES DE FINANCIACIÓN (27/10/2026)

   El buscador de la orden de pago: la persona escribe un código o una
   palabra del nombre y la lista se filtra al instante, sin viajar al
   servidor (las fuentes llegan con la lista de órdenes). Se maneja
   con el teclado:
     ↓ / ↑   mueve la opción resaltada (abre la lista si está cerrada)
     Enter   escoge la resaltada (o la única que queda)
     Esc     cierra y vuelve a lo que estaba escogido
     Tab     sigue de largo; lo escrito sin escoger no queda (vuelve lo escogido)
   Sin tildes ni mayúsculas: "proposito", "PROPÓSITOS" y "110206" valen.
   ============================================================ */
(function () {
  'use strict';

  var K = window.KIT;
  var N = 0;

  function texto(f) { return f ? f.codigo + ' - ' + f.nombre : ''; }
  function partes(q) { return K.norm(q).split(/\s+/).filter(Boolean); }

  /** Las que pasan el filtro, con las de código que empieza igual primero. */
  function filtrar(lista, q) {
    var ps = partes(q);
    if (!ps.length) return lista.slice();
    var out = [];
    lista.forEach(function (f, i) {
      var t = K.norm(f.codigo + ' ' + f.nombre);
      for (var k = 0; k < ps.length; k++) if (t.indexOf(ps[k]) < 0) return;
      var peso = f.codigo.indexOf(ps[0]) === 0 ? 0 : (K.norm(f.nombre).indexOf(ps[0]) === 0 ? 1 : 2);
      out.push({ f: f, p: peso, i: i });
    });
    out.sort(function (a, b) { return a.p - b.p || a.i - b.i; });
    return out.map(function (x) { return x.f; });
  }

  /** Resalta lo buscado sin romper el escape del HTML. */
  function marcar(s, q) {
    var ps = partes(q);
    var base = String(s), n = K.norm(base);
    if (!ps.length || n.length !== base.length) return K.esc(base);
    var on = new Array(base.length);
    ps.forEach(function (p) {
      var i = n.indexOf(p);
      while (i >= 0) { for (var k = i; k < i + p.length; k++) on[k] = 1; i = n.indexOf(p, i + p.length); }
    });
    var h = '', abierto = false;
    for (var j = 0; j < base.length; j++) {
      if (on[j] && !abierto) { h += '<mark>'; abierto = true; }
      if (!on[j] && abierto) { h += '</mark>'; abierto = false; }
      h += K.esc(base[j]);
    }
    return h + (abierto ? '</mark>' : '');
  }

  /**
   * op = { lista: [{codigo, nombre}], valor: 'codigo', excluir: function () { return 'codigo' | ['codigo', …] },
   *        alCambiar: function (codigo|''), etiqueta, ayuda, placeholder, falta: bool }
   * Devuelve { caja, input, enfocar, valor, falta(bool) }.
   */
  function buscador(op) {
    var id = 'ff' + (++N);
    var lista = op.lista || [];
    var actual = lista.filter(function (f) { return f.codigo === op.valor; })[0] || null;
    var caja = K.nodo(
      '<div class="ff' + (op.falta ? ' ff--falta' : '') + '">' +
      '  <label class="ff__et" for="' + id + '">' + K.esc(op.etiqueta || 'Fuente de financiación') + '</label>' +
      '  <div class="ff__fila">' +
      '    <input id="' + id + '" class="ff__in" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="' + id + '-l" ' +
      '           autocomplete="off" spellcheck="false" enterkeyhint="done" placeholder="' + K.esc(op.placeholder || 'Código o palabra del nombre') + '">' +
      '    <button type="button" class="ff__x" title="Quitar" aria-label="Quitar la fuente" hidden>' + K.icono('cerrar', 14) + '</button>' +
      '    <ul class="ff__lista" id="' + id + '-l" role="listbox" hidden></ul>' +
      '  </div>' +
      (op.ayuda ? '  <small class="ff__ayuda">' + op.ayuda + '</small>' : '') +
      '</div>');
    var inp = caja.querySelector('input'), ul = caja.querySelector('ul'), x = caja.querySelector('.ff__x');
    var vistas = [], activa = -1, abierta = false;

    function pintarValor() {
      inp.value = texto(actual);
      inp.title = texto(actual);
      x.hidden = !actual;
      caja.classList.toggle('ff--lista', !!actual);
    }

    function opciones() {
      var fuera = op.excluir ? op.excluir() : '';
      var q = inp.value;
      if (actual && q === texto(actual)) q = '';     /* abrir sobre lo escogido muestra todo */
      /* 30/10 · excluir puede devolver un código o una lista (las otras líneas del débito) */
      vistas = filtrar(lista.filter(function (f) { return fuera instanceof Array ? fuera.indexOf(f.codigo) < 0 : f.codigo !== fuera; }), q);
      ul.innerHTML = '';
      if (!vistas.length) {
        ul.appendChild(K.nodo('<li class="ff__nada" role="option" aria-disabled="true">Ninguna fuente tiene "' + K.esc(inp.value) + '"</li>'));
        activa = -1;
      } else {
        vistas.forEach(function (f, i) {
          var li = K.nodo('<li class="ff__op" role="option" id="' + id + '-o' + i + '"><b>' + marcar(f.codigo, q) + '</b><span>' + marcar(f.nombre, q) + '</span></li>');
          if (actual && f.codigo === actual.codigo) li.setAttribute('aria-selected', 'true');
          /* mousedown: escoge antes de que el campo pierda el foco */
          li.addEventListener('mousedown', function (e) { e.preventDefault(); escoger(f); });
          ul.appendChild(li);
        });
        activa = Math.min(Math.max(activa, 0), vistas.length - 1);
        if (q === '' && actual) activa = Math.max(0, vistas.indexOf(actual));
      }
      resaltar();
    }

    function resaltar() {
      var lis = ul.querySelectorAll('.ff__op');
      lis.forEach(function (li, i) { li.classList.toggle('ff__op--act', i === activa); });
      if (activa >= 0 && lis[activa]) {
        inp.setAttribute('aria-activedescendant', lis[activa].id);
        var li = lis[activa];
        if (li.offsetTop < ul.scrollTop) ul.scrollTop = li.offsetTop;
        else if (li.offsetTop + li.offsetHeight > ul.scrollTop + ul.clientHeight) ul.scrollTop = li.offsetTop + li.offsetHeight - ul.clientHeight;
      } else inp.removeAttribute('aria-activedescendant');
    }

    function abrir() {
      if (!abierta) { abierta = true; ul.hidden = false; inp.setAttribute('aria-expanded', 'true'); caja.classList.add('ff--abierta'); }
      opciones();
    }
    function cerrar(volver) {
      abierta = false; ul.hidden = true; inp.setAttribute('aria-expanded', 'false'); caja.classList.remove('ff--abierta');
      inp.removeAttribute('aria-activedescendant');
      if (volver) pintarValor();
    }

    function escoger(f) {
      var antes = actual ? actual.codigo : '';
      actual = f || null;
      pintarValor();
      cerrar(false);
      caja.classList.remove('ff--falta');
      if ((actual ? actual.codigo : '') !== antes && op.alCambiar) op.alCambiar(actual ? actual.codigo : '');
    }

    inp.addEventListener('focus', function () { if (actual) inp.select(); abrir(); });
    inp.addEventListener('click', function () { if (!abierta) abrir(); });
    inp.addEventListener('input', function () { activa = 0; abrir(); });
    inp.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowDown' || k === 'ArrowUp') {
        e.preventDefault();
        if (!abierta) { abrir(); return; }
        if (!vistas.length) return;
        activa = (activa + (k === 'ArrowDown' ? 1 : -1) + vistas.length) % vistas.length;
        resaltar();
      } else if (k === 'Enter') {
        if (!abierta) return;
        e.preventDefault();
        if (vistas[activa]) escoger(vistas[activa]);
      } else if (k === 'Escape') {
        if (abierta) { e.preventDefault(); e.stopPropagation(); cerrar(true); }
      } else if (k === 'Home' && abierta && vistas.length) {
        e.preventDefault(); activa = 0; resaltar();
      } else if (k === 'End' && abierta && vistas.length) {
        e.preventDefault(); activa = vistas.length - 1; resaltar();
      }
    });
    inp.addEventListener('blur', function () {
      /* lo escrito sin escoger no queda: vuelve lo que había */
      if (abierta) cerrar(true); else pintarValor();
    });
    x.addEventListener('click', function () { escoger(null); inp.focus(); });

    pintarValor();
    return {
      caja: caja, input: inp,
      enfocar: function () { inp.focus(); },
      valor: function () { return actual ? actual.codigo : ''; },
      falta: function (si) { caja.classList.toggle('ff--falta', !!si); }
    };
  }

  window.FUENTES = { buscador: buscador, filtrar: filtrar, texto: texto };
}());
