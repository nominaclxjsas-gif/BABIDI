// ══════════════════════════════════════════════
//  PDF — Desprendibles y generación de PDF
// ══════════════════════════════════════════════

// ──────────────────────────────────────────────
//  TARIFAS 2026
// ──────────────────────────────────────────────
const TARIFA_2026 = {
  smlv:    1750905,
  at_mes:  249095,
  at_dia:  8303,
  jt:      58364,
  ht:      7959,
  f:       102136,
  hf:      13991,
  hed:     9949,
  hedf:    17112,
  hen:     13928,
  henf:    21091,
  rn:      2822,
  rnf:     9152,
};

// ──────────────────────────────────────────────
//  CARPETA DESTINO (File System Access API)
// ──────────────────────────────────────────────

let _pdfFolderHandle = null;

async function selectPdfFolder() {
  if (!window.showDirectoryPicker) {
    showToast('Tu navegador no soporta esta función. Usa Chrome o Edge.', 'error', 5000);
    return false;
  }
  try {
    _pdfFolderHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    const name = _pdfFolderHandle.name;
    showToast(`✅ Carpeta seleccionada: "${name}"`, 'success', 4000);
    const el = document.getElementById('pdfFolderName');
    if (el) el.textContent = name;
    return true;
  } catch (err) {
    if (err.name !== 'AbortError') {
      showToast('Error al seleccionar carpeta: ' + err.message, 'error');
    }
    return false;
  }
}

async function savePdfToFolder(b64, nombre) {
  if (!_pdfFolderHandle) {
    _triggerDownload(b64, nombre);
    return;
  }
  try {
    const fileName = `Desprendible_${nombre}.pdf`;
    const fileHandle = await _pdfFolderHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    const byteStr = atob(b64);
    const bytes = new Uint8Array(byteStr.length);
    for (let i = 0; i < byteStr.length; i++) bytes[i] = byteStr.charCodeAt(i);
    await writable.write(bytes);
    await writable.close();
    showToast(`✅ Guardado: ${fileName}`, 'success');
  } catch (err) {
    console.warn('savePdfToFolder falló, descargando:', err.message);
    _triggerDownload(b64, nombre);
    showToast('⚠️ No se pudo guardar en carpeta, se descargó normalmente', 'error', 4000);
  }
}

function _triggerDownload(b64, nombre) {
  const link = document.createElement('a');
  link.href = 'data:application/pdf;base64,' + b64;
  link.download = `Desprendible_${nombre}.pdf`;
  link.click();
}

function _safeFileName(nombre) {
  return (nombre || 'empleado')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
}

// ──────────────────────────────────────────────
//  DESPRENDIBLES
// ──────────────────────────────────────────────
function renderDesprendibles() {
  const q = (document.getElementById('despSearch')?.value || '').toLowerCase();
  const emps = allEmployees.filter(e => !q || e.nombre.toLowerCase().includes(q) || e.cedula.includes(q));
  const el = document.getElementById('desprendiblesPanel'); if (!el) return;
  if (!emps.length) {
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;color:var(--text3);gap:10px"><div style="font-size:36px">📄</div><div style="font-family:var(--mono);font-size:13px">Sin resultados</div></div>'; return;
  }
  el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px">${emps.map((e, i) => {
    const idx = allEmployees.indexOf(e);
    return `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r2);padding:14px 16px;display:flex;align-items:center;gap:12px;transition:border-color .2s;cursor:pointer" onclick="showSlip(${idx})" onmouseover="this.style.borderColor='rgba(245,197,24,.3)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.06)'"><div style="width:38px;height:38px;border-radius:9px;background:var(--gold3);border:1px solid rgba(245,197,24,.2);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">📄</div><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(e.nombre)}</div><div style="font-size:11px;color:var(--text3);font-family:var(--mono)">C.C. ${esc(e.cedula)} · ${esc(e.ciudad)}</div></div><div style="text-align:right;flex-shrink:0"><div style="font-family:var(--mono);font-size:13px;font-weight:700;color:var(--teal)">${fmtCOP(e.total_pagar)}</div><button class="btn-slip" style="margin-top:4px;font-size:10px" onclick="event.stopPropagation();showSlip(${idx})">PDF</button></div></div>`;
  }).join('')}</div>`;
}

async function downloadAllPdfs() {
  if (!allEmployees.length) { showToast('Sin empleados', 'error'); return; }

  if (!_pdfFolderHandle) {
    const usar = confirm(
      '¿Deseas guardar los PDFs directamente en una carpeta de tu computador?\n\n' +
      'OK → Seleccionar carpeta (recomendado)\n' +
      'Cancelar → Descargar uno por uno al navegador'
    );
    if (usar) {
      const ok = await selectPdfFolder();
      if (!ok) return;
    }
  }

  if (!confirm(`¿Generar ${allEmployees.length} PDFs? Esto puede tardar.`)) return;

  showToast('Generando PDFs uno a uno...', 'success');
  for (let i = 0; i < allEmployees.length; i++) {
    const e = applyContactEdits(allEmployees[i]);
    try {
      await downloadPdf(e, true);
    } catch (err) {
      console.error(err);
    }
  }
  showToast(`✅ ${allEmployees.length} PDFs guardados`, 'success', 4000);
}

// ══════════════════════════════════════════════
//  ESTILOS GLOBALES DEL SLIP
// ══════════════════════════════════════════════
const SLIP_CSS = `
  .slip-wrap { font-family: 'Source Sans 3', 'Segoe UI', Arial, sans-serif; background:#f7fafc; width:980px; }
  .slip-wrap table { border-collapse:collapse; width:100%; }
  .slip-wrap td { font-size:11.5px; color:#000000; }
  .s-hdr-logo  { width:120px; padding:12px; text-align:center; background:#0d1b3e; border-right:1px solid #edf2f7; }
  .s-hdr-logo img { height:60px; width:auto; object-fit:contain; }
  .s-hdr-title { text-align:center; padding:12px 20px; background:#0d1b3e; }
  .s-hdr-title .t1 { font-family:'Merriweather',Georgia,serif; font-size:14px; font-weight:900; letter-spacing:2px; color:#d4a017; text-transform:uppercase; }
  .s-hdr-title .t2 { font-size:10.5px; color:#94a3c4; margin-top:5px; font-style:italic; }
  .lbl  { background:#edf2f7; color:#000000; font-weight:700; text-align:right; padding:6px 10px; white-space:nowrap; font-size:11px; letter-spacing:.3px; border:1px solid #cfd4da; }
  .lbl2 { background:#edf2f7; color:#ffffff; font-weight:700; text-align:center; padding:6px 8px; font-size:11px; }
  .val { background:#f7fafc; font-weight:600; padding:6px 10px; color:#000000; border:1px solid #cfd4da;}
  .sec-hdr { background:#edf2f7; color:#ffffff; text-align:center; font-family:'Merriweather',Georgia,serif; font-size:10.5px; font-weight:700; letter-spacing:2px; padding:6px; border:1px solid #1a2744; }
  .col-hdr { background:#edf2f7; color:#000000; text-align:center; font-size:10.5px; font-weight:700; padding:5px 8px; border:1px solid #cfd4da; font-family:'Merriweather',Georgia,serif; border-right: 1px solid #cfd4da; }
  .r-even td { background:#fff; }
  .r-odd td  { background:#f8fafc; }
  .r-even td, .r-odd td { padding:5px 9px; border:1px solid #ddd8ce; }
  .r-total td { background:#edf2f7; color:#000000; font-weight:700; padding:6px 9px; border:1px solid #cfd4da; text-align:right; font-size:11px; }
  .total-pagar-row { background:#0d1b3e; }
  .total-pagar-row .lbl-net { color:#d4a017; font-size:26px; letter-spacing:2px; text-transform:uppercase; text-align:center; padding:13px 18px; font-family:'Merriweather',Georgia,serif; }
  .total-pagar-row .val-net { color:#d4a017; font-size:26px; font-weight:900; text-align:right; padding:13px 20px; width:220px; font-family:'Merriweather',Georgia,serif; }
  .sign-label { font-family:'Merriweather',Georgia,serif; font-size:10px; font-weight:700; letter-spacing:1px; color:#000000; text-transform:uppercase; margin-bottom:28px; }
  .sign-line  { border-top:1px solid #304673; width:180px; margin:0 auto 5px; }
  .footer-legal { background:#f8fafc; font-size:9.5px; color:#000000; line-height:1.65; text-align:justify; padding:8px 14px; border-top:1px solid #cfd4da; }
`;

// ──────────────────────────────────────────────
//  CONSTRUCCIÓN DEL HTML DEL DESPRENDIBLE
// ──────────────────────────────────────────────
function buildSlipHTML(emp) {
  const e = applyContactEdits(emp);

  // Resolución segura de imágenes: busca en window, luego en el scope global
  const logoSrc  = (typeof LOGO_SRC  !== 'undefined' ? LOGO_SRC  : (window.LOGO_SRC  || 'data:image/png;base64,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'));
  const selloSrc = (typeof SELLO_SRC !== 'undefined' ? SELLO_SRC : (window.SELLO_SRC || 'data:image/png;base64,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'));

  const B  = '1px solid #1e3060';
  const BD = '1px solid #ddd8ce';

  const hoy        = new Date();
  const today      = hoy.toLocaleDateString('es-CO');
  const meses      = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  const mesStr     = meses[hoy.getMonth()];
  const anioStr    = hoy.getFullYear();
  const fechaPago  = today;
  const tipoNomina = e.tipo_nomina || 'PAGO QUINCENAL';
  const numComp    = e.cedula || Math.floor(Math.random() * 99999);

  const smlvEmp = e.smlv || TARIFA_2026.smlv;
  const vlrDia  = Math.round(smlvEmp / 30);

  /* ── INGRESOS ── */
  const ingRows = [];

  const diasTrab = e.dias_trabajados || e.dias || 0;
  if (diasTrab > 0) ingRows.push({ concepto:'SALARIO BÁSICO', cant:diasTrab+' días', vlrUnit:vlrDia, total:Math.round(vlrDia*diasTrab) });

  const turnosDiaC = e.turnos || 0;
  if (turnosDiaC > 0) ingRows.push({ concepto:'TURNO ORDINARIO DIURNO', cant:turnosDiaC, vlrUnit:vlrDia, total:Math.round(vlrDia*turnosDiaC) });

  const hedc = e.he_d_c || 0;
  if (hedc > 0) ingRows.push({ concepto:'HORA EXTRA DIURNA', cant:hedc, vlrUnit:TARIFA_2026.hed, total:Math.round(TARIFA_2026.hed*hedc) });

  const henc = e.he_n_c || 0;
  if (henc > 0) ingRows.push({ concepto:'HORA EXTRA NOCTURNA', cant:henc, vlrUnit:TARIFA_2026.hen, total:Math.round(TARIFA_2026.hen*henc) });

  const hefdc = e.he_fd_c || 0;
  if (hefdc > 0) ingRows.push({ concepto:'HORA EXTRA DIURNA FESTIVA', cant:hefdc, vlrUnit:TARIFA_2026.hedf, total:Math.round(TARIFA_2026.hedf*hefdc) });

  const hefnc = e.he_fn_c || 0;
  if (hefnc > 0) ingRows.push({ concepto:'HORA EXTRA NOCTURNA FESTIVA', cant:hefnc, vlrUnit:TARIFA_2026.henf, total:Math.round(TARIFA_2026.henf*hefnc) });

  const festDiaC = e.fest_d_c || 0;
  if (festDiaC > 0) ingRows.push({ concepto:'FESTIVO DIURNO', cant:festDiaC, vlrUnit:TARIFA_2026.f, total:Math.round(TARIFA_2026.f*festDiaC) });

  const festNocC = e.fest_n_c || 0;
  if (festNocC > 0) ingRows.push({ concepto:'FESTIVO NOCTURNO', cant:festNocC, vlrUnit:TARIFA_2026.hf, total:Math.round(TARIFA_2026.hf*festNocC) });

  const recnc = e.rec_n_c || 0;
  if (recnc > 0) ingRows.push({ concepto:'RECARGO NOCTURNO', cant:recnc, vlrUnit:TARIFA_2026.rn, total:Math.round(TARIFA_2026.rn*recnc) });

  const recnfc = (e.rec_dom_c || 0) + (e.rec_nf_c || 0);
  if (recnfc > 0) ingRows.push({ concepto:'RECARGO NOCTURNO FESTIVO', cant:recnfc, vlrUnit:TARIFA_2026.rnf, total:Math.round(TARIFA_2026.rnf*recnfc) });

  const diasAux = e.dias_aux_trans || 0;
  if (diasAux > 0) {
    ingRows.push({ concepto:'AUXILIO DE TRANSPORTE', cant:diasAux+' días', vlrUnit:TARIFA_2026.at_dia, total:Math.round(TARIFA_2026.at_dia*diasAux) });
  } else if (e.aux_trans > 0) {
    ingRows.push({ concepto:'AUXILIO DE TRANSPORTE', cant:'—', vlrUnit:TARIFA_2026.at_dia, total:e.aux_trans });
  }

  if (e.aux_lib     > 0) ingRows.push({ concepto:'AUXILIO LIBERALIDAD',       cant:'—', vlrUnit:'—', total:e.aux_lib });
  if (e.trans_inter > 0) ingRows.push({ concepto:'TRANSPORTE INTERMUNICIPAL', cant:'—', vlrUnit:'—', total:e.trans_inter });
  if (e.incapacidad > 0) ingRows.push({ concepto:'INCAPACIDAD EPS',           cant:'—', vlrUnit:'—', total:e.incapacidad });

  const totalIngresos = ingRows.reduce((s, r) => s + (r.total || 0), 0);

  const ingTR = ingRows.map((r, i) => `
    <tr class="${i % 2 === 0 ? 'r-even' : 'r-odd'}">
      <td style="padding:5px 9px;border:${BD};font-size:11px;font-weight:600;text-align:left">${r.concepto}</td>
      <td style="padding:5px 9px;border:${BD};font-size:11px;text-align:center">${r.cant !== undefined ? r.cant : '—'}</td>
      <td style="padding:5px 9px;border:${BD};font-size:11px;text-align:right">${typeof r.vlrUnit === 'number' ? fmtCOP(r.vlrUnit) : '—'}</td>
      <td style="padding:5px 9px;border:${BD};font-size:11px;text-align:right">${fmtCOP(r.total)}</td>
    </tr>`).join('');

  /* ── DEDUCCIONES ── */
  const salud    = e.deduc ? Math.round(e.deduc * 0.5) : 0;
  const pension  = e.deduc ? e.deduc - salud            : 0;
  const prest    = e.desc_prest || 0;
  const totalDed = salud + pension + prest;

  const dedTR = [
    ['SALUD (4%)',   salud],
    ['PENSIÓN (4%)', pension],
    ['DESCUENTO',    prest]
  ].map((r, i) => `
    <tr class="${i % 2 === 0 ? 'r-even' : 'r-odd'}">
      <td style="padding:5px 9px;border:${BD};font-size:11px;font-weight:600;text-align:left">${r[0]}</td>
      <td style="padding:5px 9px;border:${BD};font-size:11px;text-align:right">${r[1] > 0 ? fmtCOP(r[1]) : '$ 0'}</td>
    </tr>`).join('');

  return `
<style>
@import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&family=Source+Sans+3:wght@400;600;700&display=swap');
${SLIP_CSS}
</style>
<div class="slip-wrap">
  <table>
    <tr>
      <td class="s-hdr-logo" style="width:120px">${logoSrc ? `<img src="${logoSrc}" alt="CL">` : ''}</td>
      <td class="s-hdr-title">
        <div class="t1">Comprobante de Pago &mdash; ${esc(e.periodo)}</div>
        <div class="t2">¡Tu esfuerzo impulsa nuestra operación. Gracias por este corte de nómina!</div>
      </td>
      <td class="s-hdr-logo" style="width:120px;border-left:1px solid #1e3060;border-right:none">${logoSrc ? `<img src="${logoSrc}" alt="CL">` : ''}</td>
    </tr>
  </table>
  <table style="border:${B}">
    <tr>
      <td class="lbl" style="width:130px">PERIODO DE PAGO</td>
      <td class="val">${esc(e.periodo)}</td>
      <td class="lbl2" style="width:55px">MES</td>
      <td class="val" style="width:90px;text-align:center">${mesStr}</td>
      <td class="lbl2" style="width:45px">AÑO</td>
      <td class="val" style="width:70px;text-align:center">${anioStr}</td>
    </tr>
    <tr>
      <td class="lbl">COLABORADOR</td>
      <td class="val" style="font-weight:700">${esc(e.nombre)}</td>
      <td class="lbl2">DOC.</td>
      <td class="val" colspan="3" style="text-align:center">${esc(e.cedula)}</td>
    </tr>
    <tr>
      <td class="lbl">CARGO</td>
      <td class="val">${esc(e.cargo || '')}</td>
      <td class="lbl2">CIUDAD</td>
      <td class="val">${esc(e.ciudad)}</td>
      <td class="lbl" style="white-space:nowrap">SALARIO BASE</td>
      <td class="val" style="text-align:right;white-space:nowrap">$ ${Math.round(smlvEmp).toLocaleString('es-CO')}</td>
    </tr>
    <tr>
      <td class="lbl">FECHA DE PAGO</td>
      <td class="val">${esc(fechaPago)}</td>
      <td class="lbl2">TIPO</td>
      <td class="val" colspan="3">${esc(tipoNomina)}</td>
    </tr>
  </table>
  <table style="border:${B};border-top:none">
    <tr>
      <td class="sec-hdr" style="width:58%">INGRESOS</td>
      <td class="sec-hdr" style="width:42%;border-left:1px solid #cfd4da">DEDUCCIONES</td>
    </tr>
    <tr style="vertical-align:top">
      <td style="padding:0;width:58%">
        <table>
          <tr>
            <td class="col-hdr" style="width:220px">CONCEPTO</td>
            <td class="col-hdr" style="width:70px">CANT.</td>
            <td class="col-hdr" style="width:110px">VLR. UNITARIO</td>
            <td class="col-hdr" style="width:110px">TOTAL</td>
          </tr>
          ${ingTR}
          <tr class="r-total">
            <td colspan="3">TOTAL INGRESOS</td>
            <td>${fmtCOP(totalIngresos)}</td>
          </tr>
        </table>
      </td>
      <td style="padding:0;width:42%;border-left:2px solid #cfd4da">
        <table>
          <tr>
            <td class="col-hdr" style="width:220px">CONCEPTO</td>
            <td class="col-hdr" style="width:120px">VALOR</td>
          </tr>
          ${dedTR}
          <tr class="r-total">
            <td>TOTAL DEDUCCIONES</td>
            <td>${fmtCOP(totalDed)}</td>
          </tr>
          <tr><td colspan="2" class="sec-hdr" style="font-size:10px;letter-spacing:1.5px">OBSERVACIONES</td></tr>
          <tr>
            <td colspan="2" style="padding:8px 10px;border:1px solid #ddd8ce;font-size:11px;color:#444;font-style:italic;vertical-align:top;min-height:50px">
              ${esc(e.obs || '')}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  <table style="border:${B};border-top:none" class="total-pagar-row">
    <tr>
      <td class="lbl-net">NETO A PAGAR</td>
      <td class="val-net">$ ${Math.round(e.total_pagar || 0).toLocaleString('es-CO')}</td>
    </tr>
  </table>
  <table style="border:${B};border-top:2px solid #cfd4da">
    <tr>
      <td style="width:36%;text-align:center;padding:18px 14px;border:1px solid #d4cfc4">
        <div class="sign-label">Elaborado por</div>
        <div class="sign-line"></div>
        <div style="font-size:10px;color:#555;margin-top:4px">SISTEMA AUTOMÁTICO DE NÓMINA</div>
        <div style="font-size:10px;color:#777">Crecimiento Logístico XJ S.A.S</div>
      </td>
      <td style="width:28%;text-align:center;padding:10px;border:1px solid #d4cfc4">
        ${selloSrc ? `<img src="${selloSrc}" alt="Sello" style="height:90px;width:auto;object-fit:contain;opacity:.88">` : ''}
      </td>
      <td style="width:36%;text-align:center;padding:18px 14px;border:1px solid #d4cfc4">
        <div class="sign-label">Recibido por</div>
        <div class="sign-line"></div>
        <div style="font-size:11px;font-weight:700;color:#1a2744;margin-top:4px">${esc(e.nombre)}</div>
        <div style="font-size:10px;color:#777">C.C. ${esc(e.cedula)}</div>
      </td>
    </tr>
  </table>
  <table style="border:${B};border-top:none">
    <tr>
      <td class="footer-legal">
        El desprendible de nómina es un documento en el que constan los valores liquidados al empleado.
        Crecimiento Logístico XJ SAS lo entrega para que el colaborador conozca con detalle su
        liquidación, evitando así reclamaciones o malentendidos que puedan afectar el clima laboral.
        <strong> Dudas o aclaraciones: Tel. / WhatsApp 3143344475</strong>
      </td>
    </tr>
    <tr>
      <td style="text-align:right;font-size:9px;color:#aaa;padding:3px 10px 5px;font-style:italic">
        Comprobante N° ${numComp} &nbsp;&middot;&nbsp; Generado: ${today}
      </td>
    </tr>
  </table>
</div>`;
}

let currentSlipEmployee = null;

function showSlip(gi) {
  const r = allEmployees[gi] || filtered[gi]; if (!r) return;
  const e = applyContactEdits(r); currentSlipEmployee = e;
  const tipo = prompt('¿Tipo de cargo?\n1 → ADMINISTRATIVO\n2 → AUXILIAR OPERATIVO');
  e.cargo = tipo === '1' ? 'ADMINISTRATIVO' : tipo === '2' ? 'AUXILIAR OPERATIVO' : (e.cargo || '');
  document.getElementById('slipContent').innerHTML = buildSlipHTML(e);
  document.getElementById('slipOverlay').classList.add('open');
  document.getElementById('btnDownloadPdf').onclick = () => downloadPdf(e);
  const bs = document.getElementById('btnSendSingle');
  if (e.correo && e.correo.includes('@')) {
    bs.style.display = ''; bs.textContent = '✉️ Enviar'; bs.disabled = false;
    bs.onclick = () => sendSingleEmail(e);
  } else {
    bs.style.display = 'none';
  }
}

// ──────────────────────────────────────────────
//  GENERACIÓN Y DESCARGA DE PDF
// ──────────────────────────────────────────────
async function generateSlipPdfBase64(emp) {
  const { jsPDF } = window.jspdf;
  const c = document.createElement('div');
  c.style.cssText = 'position:fixed;left:-9999px;top:0;width:980px;background:#fff;z-index:-1';
  c.innerHTML = buildSlipHTML(emp);
  document.body.appendChild(c);
  try {
    const cv = await html2canvas(c, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false, windowWidth: 980 });
    const img = cv.toDataURL('image/jpeg', .95);
    const pw = 297, ph = 210;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const imgW = cv.width, imgH = cv.height;
    const ratio = Math.min(pw / imgW, ph / imgH);
    const drawW = imgW * ratio, drawH = imgH * ratio;
    const offX = (pw - drawW) / 2, offY = (ph - drawH) / 2;
    pdf.addImage(img, 'JPEG', offX, offY, drawW, drawH);
    return pdf.output('datauristring').split(',')[1];
  } finally {
    document.body.removeChild(c);
  }
}

async function downloadPdf(e, silent = false) {
  const btn = document.getElementById('btnDownloadPdf');
  if (!silent && btn) {
    const orig = btn.textContent;
    btn.textContent = '⏳...';
    btn.disabled = true;
    try {
      const b64 = await generateSlipPdfBase64(e);
      const sn = _safeFileName(e.nombre);
      await savePdfToFolder(b64, sn);
    } catch (err) {
      showToast('Error: ' + err.message, 'error', 5000);
    } finally {
      btn.textContent = orig;
      btn.disabled = false;
    }
  } else {
    try {
      const b64 = await generateSlipPdfBase64(e);
      const sn = _safeFileName(e.nombre);
      await savePdfToFolder(b64, sn);
    } catch (err) {
      console.error(err);
    }
  }
}