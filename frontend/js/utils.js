// ══════════════════════════════════════════════
//  UTILS — Helpers globales
// ══════════════════════════════════════════════

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmtCOP = n => '$ ' + Math.round(parseFloat(n) || 0).toLocaleString('es-CO');
const clean = v => (v === null || v === undefined) ? '' : String(v).trim();
const num = v => { let n = parseFloat(v); return isNaN(n) ? 0 : n };

function showLoad(msg, pct) {
  document.getElementById('loadMsg').textContent = msg;
  document.getElementById('loadPct').textContent = (pct || 0) + '%';
  document.getElementById('loadBar').style.width = (pct || 0) + '%';
  document.getElementById('loadingOverlay').classList.add('open');
}
function hideLoad() { document.getElementById('loadingOverlay').classList.remove('open'); }
function showErr(msg) { document.getElementById('errMsg').textContent = msg; document.getElementById('errOverlay').classList.add('open'); }
function closeErr() { document.getElementById('errOverlay').classList.remove('open'); }
function showToast(msg, type = '', dur = 3000) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'show' + (type ? ' ' + type : '');
  clearTimeout(t._t); t._t = setTimeout(() => { t.className = ''; }, dur);
}
function closeSlip() { document.getElementById('slipOverlay').classList.remove('open'); }

// Reloj topbar
setInterval(() => {
  const n = new Date(), d = ['dom','lun','mar','mié','jue','vie','sáb'][n.getDay()],
    m = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][n.getMonth()],
    t = `${d}, ${String(n.getDate()).padStart(2,'0')} de ${m}. ${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}:${String(n.getSeconds()).padStart(2,'0')}`;
  const el = document.getElementById('topbarClock'); if (el) el.textContent = t;
}, 1000);
