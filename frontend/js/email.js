// ══════════════════════════════════════════════
//  EMAIL — Brevo API: configuración y envío
// ══════════════════════════════════════════════

const BREVO_CFG_KEY = 'babidi_brevo_cfg_v1';

function getBrevoConfig() {
  try { return JSON.parse(localStorage.getItem(BREVO_CFG_KEY) || '{}'); } catch { return {}; }
}
function saveBrevoConfig() {
  const cfg = {
    apiKey:      document.getElementById('brevoApiKey')?.value?.trim()      || '',
    senderName:  document.getElementById('brevoSenderName')?.value?.trim()  || 'BABIDI NÓMINA',
    senderEmail: document.getElementById('brevoSenderEmail')?.value?.trim() || '',
    subject:     document.getElementById('brevoSubject')?.value             || 'Desprendible de Nómina — {{periodo}}',
    body:        document.getElementById('brevoBody')?.value                || ''
  };
  try { localStorage.setItem(BREVO_CFG_KEY, JSON.stringify(cfg)); } catch(e) {}
}
function loadBrevoConfigToUI() {
  const cfg = getBrevoConfig();
  const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
  set('brevoApiKey',      cfg.apiKey);
  set('brevoSenderName',  cfg.senderName);
  set('brevoSenderEmail', cfg.senderEmail);
  set('brevoSubject',     cfg.subject);
  set('brevoBody',        cfg.body);
}
function toggleBrevoKey() {
  const inp = document.getElementById('brevoApiKey'), btn = document.getElementById('btnShowKey');
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈 Ocultar'; }
  else { inp.type = 'password'; btn.textContent = '👁 Ver'; }
}

async function testBrevoConnection() {
  const cfg = getBrevoConfig(), badge = document.getElementById('brevoStatusBadge');
  if (!cfg.apiKey) { badge.className='status-badge error'; badge.textContent='❌ Falta la API Key'; showToast('Ingresa tu API Key de Brevo primero','error'); return; }
  badge.className = 'status-badge pending'; badge.textContent = '⚪ Verificando...';
  try {
    const res = await fetch('https://api.brevo.com/v3/account', { headers: {'api-key': cfg.apiKey, 'Accept':'application/json'} });
    if (res.ok) {
      const data = await res.json();
      badge.className='status-badge ok'; badge.textContent='✅ Conectado — '+(data.email||'Cuenta OK');
      showToast('✅ Brevo API conectada correctamente','success');
    } else { badge.className='status-badge error'; badge.textContent='❌ API Key inválida'; showToast('API Key inválida. Verifica en app.brevo.com','error'); }
  } catch(e) { badge.className='status-badge error'; badge.textContent='❌ Error de conexión'; showToast('Error de red: '+e.message,'error'); }
}

// ──────────────────────────────────────────────
//  FECHAS DE PAGO
// ──────────────────────────────────────────────
function getFechasPago(emp) {
  const lastDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const tipo = emp.tipo || emp.categoria || emp.area || '';
  if (tipo.toLowerCase() === 'operativo') {
    return {primera: 16, segunda: lastDayOfMonth};
  } else if (tipo.toLowerCase() === 'administrativo') {
    return {primera: 15, segunda: lastDayOfMonth};
  }
  return {primera: 15, segunda: lastDayOfMonth};
}

// ──────────────────────────────────────────────
//  CONSTRUCCIÓN DEL CUERPO DEL CORREO
// ──────────────────────────────────────────────
function buildBrevoHtmlBody(emp) {
  const cfg = getBrevoConfig();
  let body = cfg.body || 'Estimado(a) <strong>{{nombre}}</strong>,<br><br>Adjunto su desprendible del período <strong>{{periodo}}</strong>.<br><br>Atentamente,<br><strong>BABIDI LOGÍSTICA</strong>';
  body = body.replace(/\{\{nombre\}\}/g, esc(emp.nombre))
             .replace(/\{\{periodo\}\}/g, esc(emp.periodo || ''))
             .replace(/\{\{cedula\}\}/g, esc(emp.cedula))
             .replace(/\{\{ciudad\}\}/g, esc(emp.ciudad));
  const today = new Date().toLocaleDateString('es-CO',{day:'2-digit',month:'long',year:'numeric'});
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f4f4f8;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f8;padding:32px 16px"><tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.1)">
<tr><td style="background:#0d0f1a;padding:20px 28px;position:relative"><div style="position:absolute;top:0;left:0;right:0;height:3px;background:#f5c518"></div><div style="font-size:22px;font-weight:900;color:#fff;font-family:Arial,sans-serif">BABIDI<span style="color:#f5c518">NÓMINA</span></div><div style="font-size:10px;color:rgba(255,255,255,.5);letter-spacing:2px;text-transform:uppercase;margin-top:4px">Comprobante de Nómina</div></td></tr>
<tr><td style="padding:24px 28px;font-size:14px;color:#555;line-height:1.8">${body}</td></tr>
<tr><td style="background:#f7f8fc;border-top:1px solid #e2e4ec;padding:14px 28px;font-size:11px;color:#aaa">Este es un mensaje automático generado por BABIDI NÓMINA · ${today}</td></tr>
<tr><td style="background:#0d0f1a;padding:14px 28px"><div style="font-size:10px;color:rgba(255,255,255,.35)">C.C. ${esc(emp.cedula)} · ${esc(emp.nombre)}</div></td></tr>
</table></td></tr></table></body></html>`;
}

// ──────────────────────────────────────────────
//  ENVÍO VÍA BREVO API
// ──────────────────────────────────────────────
async function sendViaBrevoApi(emp, pdfBase64) {
  const cfg = getBrevoConfig();
  if (!cfg.apiKey) throw new Error('API Key de Brevo no configurada');
  if (!cfg.senderEmail) throw new Error('Correo remitente no configurado');
  const subject = (cfg.subject || 'Desprendible — {{periodo}}')
    .replace(/\{\{periodo\}\}/g, emp.periodo || '')
    .replace(/\{\{nombre\}\}/g, emp.nombre);
  const safeName = (emp.nombre||'empleado').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9 _-]/g,'').replace(/\s+/g,'_').substring(0,50);
  const payload = {
    sender: {name: cfg.senderName || 'BABIDI NÓMINA', email: cfg.senderEmail},
    to: [{email: emp.correo, name: emp.nombre}],
    subject: subject,
    htmlContent: buildBrevoHtmlBody(emp),
    attachment: [{content: pdfBase64, name: `Desprendible_${safeName}.pdf`}]
  };
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {'Content-Type':'application/json', 'api-key': cfg.apiKey},
    body: JSON.stringify(payload)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || json.code || `HTTP ${res.status}`);
  return json;
}

// ──────────────────────────────────────────────
//  ENVÍO INDIVIDUAL
// ──────────────────────────────────────────────
async function sendSingleEmail(emp) {
  const btn = document.getElementById('btnSendSingle');
  btn.textContent = '⏳...'; btn.disabled = true;
  try {
    const pb64 = await generateSlipPdfBase64(emp);
    await sendViaBrevoApi(emp, pb64);
    showToast(`✅ Enviado a ${emp.correo}`,'success');
    btn.textContent = '✓ Enviado';
    setTimeout(() => { btn.textContent='✉️ Enviar'; btn.disabled=false; }, 3000);
  } catch(err) { showToast('Error: '+err.message,'error'); btn.textContent='✉️ Enviar'; btn.disabled=false; }
}

// ──────────────────────────────────────────────
//  ENVÍO MASIVO
// ──────────────────────────────────────────────
let sendingInProgress = false;

function openEmailModal() {
  const cfg = getBrevoConfig();
  const targets = allEmployees.map(e => applyContactEdits(e)).filter(e => e.correo && e.correo.includes('@'));
  document.getElementById('statTotal').textContent = allEmployees.length || '—';
  document.getElementById('statConCorreo').textContent = targets.length || '—';
  document.getElementById('statSinCorreo').textContent = (allEmployees.length - targets.length) || '—';
  document.getElementById('statRemitente').textContent = cfg.senderEmail || '⚠️ Sin configurar';
  document.getElementById('emailProgressWrap').classList.remove('show');
  document.getElementById('emailLog').innerHTML = '';
  document.getElementById('btnStartSend').textContent = '🚀 Enviar todos';
  document.getElementById('btnStartSend').disabled = false;
  const badge = document.getElementById('emailBrevoStatusBadge');
  if (cfg.apiKey && cfg.senderEmail) { badge.className='status-badge ok'; badge.textContent='✅ Brevo configurado'; }
  else { badge.className='status-badge error'; badge.textContent=!cfg.apiKey?'❌ Falta API Key':'❌ Falta correo remitente'; }
  document.getElementById('emailOverlay').classList.add('open');
}

async function startSendAll() {
  if (sendingInProgress) return;
  const cfg = getBrevoConfig();
  if (!cfg.apiKey) { showToast('Configura tu API Key de Brevo primero','error'); return; }
  if (!cfg.senderEmail) { showToast('Configura el correo remitente en Brevo','error'); return; }
  const targets = allEmployees.map(e => applyContactEdits(e)).filter(e => e.correo && e.correo.includes('@'));
  if (!targets.length) { alert('Sin correos registrados'); return; }
  if (!confirm(`¿Enviar desprendibles a ${targets.length} empleado(s) via Brevo?`)) return;
  sendingInProgress = true;
  const wrap=document.getElementById('emailProgressWrap'), fill=document.getElementById('emailProgressFill'),
        label=document.getElementById('emailProgressLabel'), pct=document.getElementById('emailProgressPct'),
        log=document.getElementById('emailLog'), btn=document.getElementById('btnStartSend');
  wrap.classList.add('show'); log.innerHTML=''; btn.disabled=true; btn.textContent='Enviando...';
  let ok=0, fail=0;
  function al(cls, msg) { const l=document.createElement('div'); l.className=cls; l.textContent=msg; log.appendChild(l); log.scrollTop=log.scrollHeight; }
  for (let i=0; i<targets.length; i++) {
    const emp = targets[i];
    label.textContent=`Generando PDF… ${i+1} de ${targets.length}`;
    try {
      const pb64 = await generateSlipPdfBase64(emp);
      label.textContent=`Enviando a ${emp.nombre}… (${i+1}/${targets.length})`;
      await sendViaBrevoApi(emp, pb64);
      ok++; al('ok',`✓ ${emp.nombre} → ${emp.correo}`);
    } catch(err) { fail++; al('fail',`✗ ${emp.nombre} → ${err.message}`); }
    const p=Math.round(((i+1)/targets.length)*100);
    fill.style.width=p+'%'; pct.textContent=p+'%';
    await new Promise(r => setTimeout(r, 400));
  }
  sendingInProgress=false; fill.style.width='100%';
  label.textContent=`✅ ${ok} enviados correctamente · ❌ ${fail} fallidos`;
  pct.textContent='100%'; btn.textContent=`✓ ${ok} enviados`; btn.disabled=false;
  const estadoEl=document.getElementById('envioEstado');
  if (estadoEl) {
    estadoEl.innerHTML=`<div style="display:flex;gap:12px;flex-wrap:wrap;padding:8px 0"><div class="chip green"><strong>${ok}</strong> enviados</div><div class="chip red"><strong>${fail}</strong> fallidos</div><div class="chip"><strong>${new Date().toLocaleString('es-CO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</strong></div></div>`;
  }
}

document.getElementById('btnCloseEmail').addEventListener('click', () => document.getElementById('emailOverlay').classList.remove('open'));
document.getElementById('btnCloseEmail2').addEventListener('click', () => document.getElementById('emailOverlay').classList.remove('open'));
document.getElementById('btnStartSend').addEventListener('click', startSendAll);