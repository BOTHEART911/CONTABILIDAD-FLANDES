/* ============================================================
   CONTABILIDAD-FLANDES · EL MOTOR DE DESCUENTOS (en el teléfono)
   Fase 7

   Es LA MISMA cuenta que hace el CORE (FC7_liquidar_ en
   Contabilidad7.gs), línea por línea. Aquí sirve para que la tarjeta
   responda al instante: marcar un check, cambiar un valor o escoger otra
   cuenta contable se recalcula sin viajar al servidor. Al CREAR ORDEN
   el CORE lo vuelve a calcular con la configuración de la hoja y, si
   algo no cuadra, no crea el PDF. Las pruebas del banco comparan este
   archivo contra los ejemplos del plan y contra lo que dio el CORE.

     MOTOR.liquidar(ctx, sel, cfg)
       ctx = { tipo, simple, cobro, base, primera, factura }
       sel = { marcadas:{clave:bool}, publicidad:bool, valores:{clave:n},
               bases:{clave:n} (las de base MANUAL, ej. el IVA de la factura),
               debito:{codigo,nombre}, credito:{codigo,nombre} }
       cfg = { retenciones, cuentas, reglas }   (la que trae 'ordenes')
   ============================================================ */
(function (raiz) {
  'use strict';

  /* igual que FC_norm del CORE: mayúsculas, sin tildes, Ñ -> N */
  function norm(v) {
    var s = (v === null || v === undefined) ? '' : String(v);
    s = s.replace(/ /g, ' ').trim().toUpperCase();
    s = s.replace(/[ÁÀÄÂÃ]/g, 'A').replace(/[ÉÈËÊ]/g, 'E').replace(/[ÍÌÏÎ]/g, 'I')
         .replace(/[ÓÒÖÔÕ]/g, 'O').replace(/[ÚÙÜÛ]/g, 'U').replace(/Ñ/g, 'N');
    return s.replace(/\s+/g, ' ');
  }

  function redondear(v, paso) { paso = paso || 1; return Math.round(v / paso) * paso; }

  /* 02/10 · base MANUAL (igual que FC7_baseManual_): la digita Contabilidad,
     con centavos ('798.319,33' o 798319.33); el descuento se redondea. */
  function baseManual(v) {
    var s = String(v === null || v === undefined ? '' : v).replace(/\s|\$/g, '');
    /* 23/10 · el campo pone solo el punto de miles: '4.621.848' (sin coma) es cuatro millones,
       no 4,6. La coma es la de los centavos. '798319.33' (punto decimal) sigue valiendo. */
    var n = typeof v === 'number' ? v : (s.indexOf(',') >= 0 ? Number(s.replace(/\./g, '').replace(',', '.')) :
            (/^\d{1,3}(\.\d{3})+$/.test(s) ? Number(s.replace(/\./g, '')) : Number(s)));
    if (!isFinite(n) || n < 0) return 0;
    return Math.round(n * 100) / 100;
  }

  function aplicaATipo(r, tipo) {
    var t = norm(tipo);
    var l = r.tipos || ['*'];
    for (var i = 0; i < l.length; i++) if (l[i] === '*' || norm(l[i]) === t) return true;
    return false;
  }

  function tipoLiquida(tipo, cfg) {
    var t = norm(tipo);
    var cv = cfg.reglas && cfg.reglas.convenio;
    if (cv && norm(cv.tipo) === t && cv.comoTipo) return String(cv.comoTipo);
    return String(tipo || '');
  }

  var CODIGO_ICA = '41050803';
  function esIca(r) { return String(r.codigo || '').trim() === CODIGO_ICA || norm(r.tipo).replace(/[.\s]/g, '') === 'ICA'; }

  function liquidar(ctx, sel, cfg) {
    sel = sel || {};
    var tipo = tipoLiquida(ctx.tipo, cfg);
    var paso = (cfg.reglas && Number(cfg.reglas.redondeo)) || 1;
    var excluirSimple = (ctx.simple && cfg.reglas && cfg.reglas.regimenSimple && cfg.reglas.regimenSimple.excluir) || [];
    var cobro = Math.round(Number(ctx.cobro) || 0);
    var iva = (cfg.reglas && Number(cfg.reglas.iva)) || 19;
    var opciones = [], aplicadas = [], total = 0;

    /* 23/10 · dos retenciones pueden compartir código contable (ReteIVA 15% del IVA e Imp. a las
       ventas 15%, ambas 24362502): con la llave = código, marcar una marcaba las dos y el 15 %
       salía doble. Si el código se repite, la llave es código|NOMBRE (igual que el CORE). */
    var usos = {};
    (cfg.retenciones || []).forEach(function (r) { var c0 = String(r.codigo || '').trim(); if (c0) usos[c0] = (usos[c0] || 0) + 1; });
    (cfg.retenciones || []).forEach(function (r, i) {
      var cod = String(r.codigo || '').trim();
      var clave = !cod ? ('R' + i) : (usos[cod] > 1 ? cod + '|' + norm(r.nombre) : cod);
      if (!aplicaATipo(r, tipo)) return;
      var o = { clave: clave, codigo: String(r.codigo || '').trim(), nombre: String(r.nombre || ''), tipo: String(r.tipo || ''),
                porcentaje: Number(r.porcentaje) || 0, baseTipo: r.base === 'TRAMO' ? 'TRAMO' : (r.base === 'IVA' ? 'IVA' : (r.base === 'MANUAL' ? 'MANUAL' : 'COBRO')),
                excluye: r.excluye instanceof Array ? r.excluye.map(String) : [],
                automatica: !!r.automatica, soloFactura: !!r.soloFactura, disponible: true, motivo: '', marcada: false, nota: r.nota || '' };
      /* 26/10 · el ReteICA se marca o desmarca A MANO con cualquier combinación: nunca automático
         (el check no se bloquea) y ninguna otra retención lo quita. Sale marcado por defecto. */
      var ica = esIca(r);
      if (ica) { o.automatica = false; o.excluye = []; }
      else o.excluye = o.excluye.filter(function (k) { return k !== CODIGO_ICA && k.split('|')[0] !== CODIGO_ICA; });
      o.base = o.baseTipo === 'TRAMO' ? Math.round(Number(ctx.base) || 0) : (o.baseTipo === 'IVA' ? Math.round(cobro - cobro / (1 + iva / 100)) :
               (o.baseTipo === 'MANUAL' ? baseManual(sel.bases && sel.bases[clave]) : cobro));
      if (r.activa === false) { o.disponible = false; o.motivo = 'Apagada en Configuración'; }
      else if (!o.porcentaje) { o.disponible = false; o.motivo = 'Sin porcentaje en Configuración'; }
      else if (r.soloFactura && !ctx.factura) { o.disponible = false; o.motivo = 'Solo para quien presenta factura electrónica'; }
      else if (r.soloPrimeraCuenta && ctx.cesionario) { o.disponible = false; o.motivo = 'El cesionario no paga estampillas en su primera cuenta'; }
      else if (r.soloPrimeraCuenta && !ctx.primera) { o.disponible = false; o.motivo = 'Solo en la primera cuenta del tramo'; }
      else if (excluirSimple.indexOf(o.codigo) >= 0 || excluirSimple.indexOf(o.nombre) >= 0) { o.disponible = false; o.motivo = 'No aplica a Régimen Simple'; }
      else if (o.baseTipo === 'TRAMO' && !o.base) { o.disponible = false; o.motivo = 'El contrato no tiene el valor de este tramo'; }

      var pedida = sel.marcadas && Object.prototype.hasOwnProperty.call(sel.marcadas, clave) ? !!sel.marcadas[clave] : null;
      if (o.disponible) {
        if (o.automatica) o.marcada = true;
        else if (pedida !== null) o.marcada = pedida;
        else if (ica) o.marcada = r.porDefecto !== false;
        else o.marcada = r.soloPrimeraCuenta ? !!ctx.primera && r.porDefecto !== false : !!r.porDefecto;
      }
      o.calculado = redondear(o.base * o.porcentaje / 100, paso);
      o.valor = o.calculado;
      if (o.baseTipo === 'MANUAL' && o.marcada && !(o.base > 0)) o.faltaBase = true;
      if (sel.valores && Object.prototype.hasOwnProperty.call(sel.valores, clave)) {
        var ed = Math.round(Number(sel.valores[clave]));
        if (isFinite(ed) && ed >= 0) { o.valor = ed; o.editado = ed !== o.calculado; }
      }
      opciones.push(o);
    });
    var fuera = {};
    opciones.forEach(function (o) { if (o.marcada) o.excluye.forEach(function (k) { fuera[k] = o.nombre; }); });
    opciones.forEach(function (o) {
      var quita = fuera[o.clave] || fuera[o.codigo];   /* 'excluye' trae códigos */
      if (o.marcada && quita && quita !== o.nombre) { o.marcada = false; o.reemplazada = quita; }
      if (o.marcada) { aplicadas.push(o); total += o.valor; }
    });

    var t = norm(tipo), base = null, conOpcion = null;
    (cfg.cuentas || []).forEach(function (c) {
      if (norm(c.tipo) !== t) return;
      if (c.opcion) { if (!conOpcion) conOpcion = c; }
      else if (!base) base = c;
    });
    var usar = (sel.publicidad && conOpcion) ? conOpcion : base;
    if (sel.debito && sel.debito.codigo) usar = { debito: sel.debito, credito: (sel.credito && sel.credito.codigo) ? sel.credito : (usar ? usar.credito : null) };
    else if (sel.credito && sel.credito.codigo && usar) usar = { debito: usar.debito, credito: sel.credito };

    var neto = cobro - total;
    return {
      tipo: String(ctx.tipo || ''), tipoLiquida: tipo, cobro: cobro, base: Math.round(Number(ctx.base) || 0), primera: !!ctx.primera,
      publicidad: { existe: !!conOpcion, marcada: !!(sel.publicidad && conOpcion), nombre: conOpcion ? conOpcion.opcion : '' },
      debito: usar && usar.debito ? { codigo: String(usar.debito.codigo), nombre: String(usar.debito.nombre || '') } : null,
      credito: usar && usar.credito ? { codigo: String(usar.credito.codigo), nombre: String(usar.credito.nombre || '') } : null,
      opciones: opciones, aplicadas: aplicadas, retenido: total, neto: neto,
      faltaBase: aplicadas.filter(function (o) { return o.faltaBase; }).map(function (o) { return o.nombre; })
    };
  }

  /** Los dígitos finales del N° de orden -> vigencia + ceros (1023 -> 2026001023). '' si no vale. */
  function numeroOrden(v, vigencia) {
    var d = String(v === null || v === undefined ? '' : v).replace(/\D/g, '');
    var anio = String(vigencia || new Date().getFullYear());
    if (!d) return '';
    if (d.length === 10 && d.indexOf(anio) === 0) return d;
    if (d.length > 6) return '';
    while (d.length < 6) d = '0' + d;
    return anio + d;
  }

  /* 798319.33 -> '798.319,33'; los centavos solo si los hay (igual que FC7_pesosDec_) */
  function pesosDec(v) {
    var n = Math.abs(Number(v) || 0), ent = Math.floor(n), cent = Math.round((n - ent) * 100);
    if (cent === 100) { ent++; cent = 0; }
    var s = String(ent), out = '';
    while (s.length > 3) { out = '.' + s.slice(-3) + out; s = s.slice(0, -3); }
    return ((Number(v) || 0) < 0 ? '-' : '') + s + out + (cent ? ',' + ('0' + cent).slice(-2) : '');
  }

  raiz.MOTOR = { liquidar: liquidar, numeroOrden: numeroOrden, norm: norm, baseManual: baseManual, pesosDec: pesosDec };
}(typeof window !== 'undefined' ? window : this));
