// ══════════════════════════════════════════════
//  PDF — Desprendibles y generación de PDF
// ══════════════════════════════════════════════

// ──────────────────────────────────────────────
//  DESPRENDIBLES
// ──────────────────────────────────────────────
function renderDesprendibles() {
  const q = (document.getElementById('despSearch')?.value||'').toLowerCase();
  const emps = allEmployees.filter(e => !q || e.nombre.toLowerCase().includes(q) || e.cedula.includes(q));
  const el = document.getElementById('desprendiblesPanel'); if (!el) return;
  if (!emps.length) {
    el.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;color:var(--text3);gap:10px"><div style="font-size:36px">📄</div><div style="font-family:var(--mono);font-size:13px">Sin resultados</div></div>'; return;
  }
  el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px">${emps.map((e,i) => {
    const idx = allEmployees.indexOf(e);
    return `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--r2);padding:14px 16px;display:flex;align-items:center;gap:12px;transition:border-color .2s;cursor:pointer" onclick="showSlip(${idx})" onmouseover="this.style.borderColor='rgba(245,197,24,.3)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.06)'"><div style="width:38px;height:38px;border-radius:9px;background:var(--gold3);border:1px solid rgba(245,197,24,.2);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">📄</div><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(e.nombre)}</div><div style="font-size:11px;color:var(--text3);font-family:var(--mono)">C.C. ${esc(e.cedula)} · ${esc(e.ciudad)}</div></div><div style="text-align:right;flex-shrink:0"><div style="font-family:var(--mono);font-size:13px;font-weight:700;color:var(--teal)">${fmtCOP(e.total_pagar)}</div><button class="btn-slip" style="margin-top:4px;font-size:10px" onclick="event.stopPropagation();showSlip(${idx})">PDF</button></div></div>`;
  }).join('')}</div>`;
}

async function downloadAllPdfs() {
  if (!allEmployees.length) { showToast('Sin empleados','error'); return; }
  if (!confirm('¿Generar ' + allEmployees.length + ' PDFs? Esto puede tardar.')) return;
  showToast('Generando PDFs uno a uno...','success');
  for (let i = 0; i < allEmployees.length; i++) {
    const e = applyContactEdits(allEmployees[i]);
    try { await downloadPdf(e, true); } catch(err) { console.error(err); }
  }
}

// ──────────────────────────────────────────────
//  HTML DEL SLIP
// ──────────────────────────────────────────────
function buildSlipHTML(emp) {
  const e = applyContactEdits(emp);
  const td = (e.deduc||0) + (e.desc_prest||0) + (e.incapacidad||0);
  const today = new Date().toLocaleDateString('es-CO',{day:'2-digit',month:'long',year:'numeric'});
  const logoSVG = `<svg viewBox="0 0 52 52" width="52" height="52" xmlns="http://www.w3.org/2000/svg"><rect width="52" height="52" rx="10" fill="#f5c518"/><path d="M10 40 L20 16 L26 28 L32 18 L42 40Z" fill="#0a0c12" opacity=".9"/><circle cx="26" cy="26" r="5" fill="#0a0c12"/><path d="M6 26 Q26 14 46 26" stroke="#0a0c12" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`;
  const ingRows = [];
  if(e.turno_dia_v>0)ingRows.push([`Turno Día`,e.turno_dia_c,e.turno_dia_v]);
  if(e.turno_noche_v>0)ingRows.push([`Turno Noche`,e.turno_noche_c,e.turno_noche_v]);
  if(e.fest_d_v>0)ingRows.push([`Festivo Diurno`,e.fest_d_c,e.fest_d_v]);
  if(e.fest_n_v>0)ingRows.push([`Festivo Nocturno`,e.fest_n_c,e.fest_n_v]);
  if(e.he_d_v>0)ingRows.push([`H.E. Diurna`,e.he_d_c,e.he_d_v]);
  if(e.he_n_v>0)ingRows.push([`H.E. Nocturna`,e.he_n_c,e.he_n_v]);
  if(e.he_fd_v>0)ingRows.push([`H.E. Fest. Diurna`,e.he_fd_c,e.he_fd_v]);
  if(e.he_fn_v>0)ingRows.push([`H.E. Fest. Nocturna`,e.he_fn_c,e.he_fn_v]);
  if(e.rec_n_v>0)ingRows.push([`Recargo Nocturno`,e.rec_n_c,e.rec_n_v]);
  if(e.rec_dom_v>0)ingRows.push([`Rec. Dom./Fest.`,e.rec_dom_c,e.rec_dom_v]);
  if(e.rec_nf_v>0)ingRows.push([`Rec. Noct. Fest.`,e.rec_nf_c,e.rec_nf_v]);
  if(e.aux_trans>0)ingRows.push([`Auxilio de Transporte`,1,e.aux_trans]);
  if(e.trans_inter>0)ingRows.push([`Trans. Intermunicipal`,1,e.trans_inter]);
  if(e.aux_lib>0)ingRows.push([`Aux. Mera Liberalidad`,1,e.aux_lib]);
  const dedRows = [];
  if(e.deduc>0)dedRows.push([`EPS y Pensión`,1,e.deduc]);
  if(e.desc_prest>0)dedRows.push([`Descuento Préstamos`,1,e.desc_prest]);
  if(e.incapacidad>0)dedRows.push([`Incapacidad`,1,e.incapacidad]);
  const ingTR=ingRows.map(([l,c,v])=>`<tr><td>${esc(l)}</td><td style="text-align:center">${c}.00</td><td>${fmtCOP(v)}</td></tr>`).join('')||`<tr><td colspan="3" style="color:#aaa;font-size:11px;padding:6px 18px">Sin ingresos registrados</td></tr>`;
  const dedTR=dedRows.map(([l,c,v])=>`<tr><td>${esc(l)}</td><td style="text-align:center">${c}.00</td><td style="color:#b91c1c">${fmtCOP(v)}</td></tr>`).join('')||`<tr><td colspan="3" style="color:#aaa;font-size:11px;padding:6px 18px">Sin deducciones</td></tr>`;
  return`<div style="background:#fff;color:#1a1a2e;font-family:'Barlow',Arial,sans-serif;border-radius:8px;overflow:hidden">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0f1a"><tr><td style="position:relative;padding:0">
<div style="position:absolute;top:0;left:0;right:0;height:3px;background:#f5c518"></div>
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="padding:16px 22px;border-right:1px solid rgba(255,255,255,.08);vertical-align:middle"><table cellpadding="0" cellspacing="0"><tr><td style="padding-right:14px;vertical-align:middle">${logoSVG}</td><td style="vertical-align:middle"><div style="font-family:'Barlow Condensed',Arial,sans-serif;font-size:22px;font-weight:900;color:#fff;letter-spacing:-.5px;line-height:1">BABIDI<span style="color:#f5c518">NÓMINA</span></div><div style="font-size:10px;color:rgba(255,255,255,.4);letter-spacing:1.5px;text-transform:uppercase;margin-top:3px">LOGÍSTICA · COMPROBANTE DE PAGO</div></td></tr></table></td>
<td style="padding:16px 22px;text-align:right;vertical-align:middle"><div style="font-size:11px;font-weight:800;color:rgba(255,255,255,.9);text-transform:uppercase;letter-spacing:.5px">Documento Soporte de Pago</div><div style="font-size:11px;color:rgba(255,255,255,.4);margin-top:3px">Comprobante No. ${Math.floor(Math.random()*9000)+1000}</div><div style="font-size:12px;color:#f5c518;font-weight:700;margin-top:5px">Período: ${esc(e.periodo)}</div><div style="font-size:11px;color:rgba(255,255,255,.4);margin-top:2px">${today}</div></td>
</tr></table></td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fc;border-bottom:2px solid #0d0f1a"><tr><td style="padding:14px 22px"><table width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="padding-right:24px;border-right:1px solid #e2e4ec;vertical-align:top;width:40%"><div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#888;font-weight:700;margin-bottom:3px">Nombre</div><div style="font-size:15px;font-weight:800;color:#1a1a2e">${esc(e.nombre)}</div></td>
<td style="padding:0 24px;border-right:1px solid #e2e4ec;vertical-align:top"><div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#888;font-weight:700;margin-bottom:3px">Identificación</div><div style="font-size:14px;font-weight:700;color:#1a1a2e;font-family:'JetBrains Mono',monospace">${esc(e.cedula)}</div></td>
<td style="padding:0 24px;border-right:1px solid #e2e4ec;vertical-align:top"><div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#888;font-weight:700;margin-bottom:3px">Ciudad</div><div style="font-size:13px;font-weight:700;color:#1a1a2e">${esc(e.ciudad)}</div></td>
<td style="padding:0 24px;border-right:1px solid #e2e4ec;vertical-align:top"><div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#888;font-weight:700;margin-bottom:3px">Salario Básico</div><div style="font-size:12px;font-weight:700;color:#1a1a2e;font-family:'JetBrains Mono',monospace">${fmtCOP(e.smlv)}</div></td>
<td style="padding-left:24px;vertical-align:top"><div style="font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#888;font-weight:700;margin-bottom:3px">Turnos / Horas</div><div style="font-size:13px;font-weight:700;color:#1a1a2e">${e.turnos} / ${e.horas}h</div></td>
</tr></table></td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e4ec"><tr style="vertical-align:top">
<td width="50%" style="border-right:1px solid #e2e4ec;padding:0">
<div style="padding:10px 18px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:#007a4d;background:#f0faf6;border-bottom:1px solid #e2e4ec">✅ INGRESOS</div>
<table width="100%" cellpadding="0" cellspacing="0" style="font-size:12px"><tr style="background:#f9fafb"><th style="padding:7px 18px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:#666;font-weight:700;border-bottom:1px solid #e2e4ec">Concepto</th><th style="padding:7px 12px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:#666;font-weight:700;border-bottom:1px solid #e2e4ec">Cant.</th><th style="padding:7px 18px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:#666;font-weight:700;border-bottom:1px solid #e2e4ec">Valor</th></tr>
${ingTR}
<tr style="border-top:2px solid #e2e4ec;background:#f9fafb"><td colspan="2" style="padding:9px 18px;font-size:12px;font-weight:800;color:#333">Total Ingresos</td><td style="padding:9px 18px;text-align:right;font-size:14px;font-weight:900;color:#007a4d;font-family:'JetBrains Mono',monospace">${fmtCOP(e.devengado)}</td></tr></table></td>
<td width="50%" style="padding:0">
<div style="padding:10px 18px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:#b91c1c;background:#fff5f5;border-bottom:1px solid #e2e4ec">❌ DEDUCCIONES</div>
<table width="100%" cellpadding="0" cellspacing="0" style="font-size:12px"><tr style="background:#f9fafb"><th style="padding:7px 18px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:#666;font-weight:700;border-bottom:1px solid #e2e4ec">Concepto</th><th style="padding:7px 12px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:#666;font-weight:700;border-bottom:1px solid #e2e4ec">Cant.</th><th style="padding:7px 18px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:#666;font-weight:700;border-bottom:1px solid #e2e4ec">Valor</th></tr>
${dedTR}
<tr style="border-top:2px solid #e2e4ec;background:#f9fafb"><td colspan="2" style="padding:9px 18px;font-size:12px;font-weight:800;color:#333">Total Deducciones</td><td style="padding:9px 18px;text-align:right;font-size:14px;font-weight:900;color:#b91c1c;font-family:'JetBrains Mono',monospace">-${fmtCOP(td)}</td></tr></table>
${e.cuenta?`<div style="padding:8px 18px 6px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#1e40af;border-top:1px solid #e2e4ec;background:#f0f4ff;border-bottom:1px solid #e2e4ec">🏦 MEDIO DE PAGO</div><div style="padding:8px 18px;font-size:12px;color:#333">${esc(e.cuenta)}</div>`:''}
${e.correo?`<div style="padding:4px 18px 8px;font-size:11px;color:#888">✉ ${esc(e.correo)}</div>`:''}
</td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0f1a"><tr><td style="position:relative;padding:0"><div style="position:absolute;top:0;left:0;right:0;height:3px;background:#f5c518"></div><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:18px 22px;vertical-align:middle"><div style="font-size:12px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:1.5px;font-weight:700">NETO A PAGAR</div><div style="font-family:'JetBrains Mono',monospace;font-size:34px;font-weight:700;color:#f5c518;letter-spacing:-1px;margin-top:2px">${fmtCOP(e.total_pagar)}</div></td><td style="padding:18px 22px;text-align:right;vertical-align:middle"><div style="font-size:10px;color:rgba(255,255,255,.35)">BABIDI LOGÍSTICA · ${today}</div><div style="font-size:10px;color:rgba(255,255,255,.35);margin-top:2px">C.C. ${esc(e.cedula)} · ${esc(e.nombre)}</div></td></tr></table></td></tr></table>
${e.obs?`<div style="background:#fffbeb;border-top:1px solid #fde68a;padding:9px 22px;font-size:12px;color:#78350f"><strong>Observaciones:</strong> ${esc(e.obs)}</div>`:''}
</div>`;
}

let currentSlipEmployee = null;

function showSlip(gi) {
  const r = allEmployees[gi] || filtered[gi]; if (!r) return;
  const e = applyContactEdits(r); currentSlipEmployee = e;
  document.getElementById('slipContent').innerHTML = buildSlipHTML(e);
  document.getElementById('slipOverlay').classList.add('open');
  document.getElementById('btnDownloadPdf').onclick = () => downloadPdf(e);
  const bs = document.getElementById('btnSendSingle');
  if (e.correo && e.correo.includes('@')) { bs.style.display=''; bs.textContent='✉️ Enviar'; bs.disabled=false; bs.onclick=()=>sendSingleEmail(e); }
  else bs.style.display = 'none';
}

// ──────────────────────────────────────────────
//  GENERACIÓN Y DESCARGA DE PDF
// ──────────────────────────────────────────────
async function generateSlipPdfBase64(emp) {
  const {jsPDF} = window.jspdf, c = document.createElement('div');
  c.style.cssText = 'position:fixed;left:-9999px;top:0;width:720px;background:#fff;z-index:-1';
  c.innerHTML = buildSlipHTML(emp); document.body.appendChild(c);
  try {
    const cv = await html2canvas(c, {scale:2, useCORS:true, backgroundColor:'#ffffff', logging:false, windowWidth:720}),
          img = cv.toDataURL('image/jpeg',.95), pw=210, ph=Math.round((cv.height/cv.width)*pw),
          pdf = new jsPDF({orientation:'portrait', unit:'mm', format:ph>297?[pw,ph]:'a4'});
    pdf.addImage(img,'JPEG',0,0,pw,Math.min(ph,297));
    return pdf.output('datauristring').split(',')[1];
  } finally { document.body.removeChild(c); }
}

async function downloadPdf(e, silent = false) {
  const btn = document.getElementById('btnDownloadPdf');
  if (!silent && btn) {
    const orig = btn.textContent; btn.textContent='⏳...'; btn.disabled=true;
    try {
      const b64 = await generateSlipPdfBase64(e);
      const sn = (e.nombre||'empleado').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9 _-]/g,'').replace(/\s+/g,'_').substring(0,50);
      const linkEl = document.createElement('a'); linkEl.href='data:application/pdf;base64,'+b64; linkEl.download=`Desprendible_${sn}.pdf`; linkEl.click();
      showToast('✅ PDF descargado','success');
    } catch(err) { showToast('Error: '+err.message,'error',5000); }
    finally { btn.textContent=orig; btn.disabled=false; }
  } else {
    try {
      const b64 = await generateSlipPdfBase64(e);
      const sn = (e.nombre||'empleado').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9 _-]/g,'').replace(/\s+/g,'_').substring(0,50);
      const l = document.createElement('a'); l.href='data:application/pdf;base64,'+b64; l.download=`Desprendible_${sn}.pdf`; l.click();
    } catch(err) { console.error(err); }
  }
}
