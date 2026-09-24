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
       ctx = { tipo, simple, cobro, base, primera }
       sel = { marcadas:{clave:bool}, publicidad:bool, valores:{clave:n},
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

  function liquidar(ctx, sel, cfg) {
    sel = sel || {};
    var tipo = tipoLiquida(ctx.tipo, cfg);
    var paso = (cfg.reglas && Number(cfg.reglas.redondeo)) || 1;
    var excluirSimple = (ctx.simple && cfg.reglas && cfg.reglas.regimenSimple && cfg.reglas.regimenSimple.excluir) || [];
    var cobro = Math.round(Number(ctx.cobro) || 0);
    var iva = (cfg.reglas && Number(cfg.reglas.iva)) || 19;
    var opciones = [], aplicadas = [], total = 0;

    (cfg.retenciones || []).forEach(function (r, i) {
      var clave = String(r.codigo || '').trim() || ('R' + i);
      if (!aplicaATipo(r, tipo)) return;
      var o = { clave: clave, codigo: String(r.codigo || '').trim(), nombre: String(r.nombre || ''), tipo: String(r.tipo || ''),
                porcentaje: Number(r.porcentaje) || 0, baseTipo: r.base === 'TRAMO' ? 'TRAMO' : (r.base === 'IVA' ? 'IVA' : 'COBRO'),
                excluye: r.excluye instanceof Array ? r.excluye.map(String) : [],
                automatica: !!r.automatica, disponible: true, motivo: '', marcada: false, nota: r.nota || '' };
      o.base = o.baseTipo === 'TRAMO' ? Math.round(Number(ctx.base) || 0) : (o.baseTipo === 'IVA' ? Math.round(cobro - cobro / (1 + iva / 100)) : cobro);
      if (r.activa === false) { o.disponible = false; o.motivo = 'Apagada en Configuración'; }
      else if (!o.porcentaje) { o.disponible = false; o.motivo = 'Sin porcentaje en Configuración'; }
      else if (r.soloPrimeraCuenta && !ctx.primera) { o.disponible = false; o.motivo = 'Solo en la primera cuenta del tramo'; }
      else if (excluirSimple.indexOf(o.codigo) >= 0 || excluirSimple.indexOf(o.nombre) >= 0) { o.disponible = false; o.motivo = 'No aplica a Régimen Simple'; }
      else if (o.baseTipo === 'TRAMO' && !o.base) { o.disponible = false; o.motivo = 'El contrato no tiene el valor de este tramo'; }

      var pedida = sel.marcadas && Object.prototype.hasOwnProperty.call(sel.marcadas, clave) ? !!sel.marcadas[clave] : null;
      if (o.disponible) {
        if (o.automatica) o.marcada = true;
        else if (pedida !== null) o.marcada = pedida;
        else o.marcada = r.soloPrimeraCuenta ? !!ctx.primera && r.porDefecto !== false : !!r.porDefecto;
      }
      o.calculado = redondear(o.base * o.porcentaje / 100, paso);
      o.valor = o.calculado;
      if (sel.valores && Object.prototype.hasOwnProperty.call(sel.valores, clave)) {
        var ed = Math.round(Number(sel.valores[clave]));
        if (isFinite(ed) && ed >= 0) { o.valor = ed; o.editado = ed !== o.calculado; }
      }
      opciones.push(o);
    });
    var fuera = {};
    opciones.forEach(function (o) { if (o.marcada) o.excluye.forEach(function (k) { fuera[k] = o.nombre; }); });
    opciones.forEach(function (o) {
      if (o.marcada && fuera[o.clave] && fuera[o.clave] !== o.nombre) { o.marcada = false; o.reemplazada = fuera[o.clave]; }
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
      opciones: opciones, aplicadas: aplicadas, retenido: total, neto: neto
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

  raiz.MOTOR = { liquidar: liquidar, numeroOrden: numeroOrden, norm: norm };
}(typeof window !== 'undefined' ? window : this));
