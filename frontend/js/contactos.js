// ══════════════════════════════════════════════
//  CONTACTOS — Edición de correo y cuenta bancaria
// ══════════════════════════════════════════════

const CONTACT_KEY = 'babidi_contact_edits_v1';

function getContactEdits() { try { return JSON.parse(localStorage.getItem(CONTACT_KEY) || '{}'); } catch { return {}; } }
function saveContactEditsStore(s) { try { localStorage.setItem(CONTACT_KEY, JSON.stringify(s)); } catch(e) {} }

function applyContactEdits(emp) {
  const s = getContactEdits(), k = emp.cedula + '|' + emp.periodo, e = s[k];
  if (!e) return emp;
  return Object.assign({}, emp, {
    correo: e.correo !== undefined ? e.correo : emp.correo,
    cuenta: e.cuenta !== undefined ? e.cuenta : emp.cuenta
  });
}

function persistContactEdit(cedula, periodo, field, nv, ov, usr) {
  const s = getContactEdits(), k = cedula + '|' + periodo;
  if (!s[k]) s[k] = {log: []};
  s[k][field] = nv; s[k].log = s[k].log || [];
  s[k].log.unshift({field, oldValue: ov, newValue: nv, usuario: usr || '?', ts: Date.now()});
  s[k].log = s[k].log.slice(0, 20);
  saveContactEditsStore(s);
}

function clearContactEditsForEmp(c, p) {
  const s = getContactEdits(); delete s[c + '|' + p]; saveContactEditsStore(s);
}

function hasContactEdits(c, p) {
  const s = getContactEdits(), e = s[c + '|' + p];
  return !!(e && (e.correo !== undefined || e.cuenta !== undefined));
}

let ecCurrentEmp = null, ecCurrentIdx = null;

function openEditContact(gi) {
  const r = filtered[gi]; if (!r) return;
  ecCurrentEmp = r; ecCurrentIdx = gi;
  document.getElementById('ecEmpSub').textContent = 'C.C. ' + r.cedula + ' · ' + r.nombre;
  const s = getContactEdits(), k = r.cedula + '|' + r.periodo, e = s[k] || {};
  document.getElementById('ecOrigCorreo').textContent = 'Excel: ' + (r.correo || '(vacío)');
  document.getElementById('ecOrigCuenta').textContent = 'Excel: ' + (r.cuenta || '(vacío)');
  const ic = document.getElementById('ecInpCorreo'), icu = document.getElementById('ecInpCuenta');
  ic.value = e.correo !== undefined ? e.correo : r.correo;
  icu.value = e.cuenta !== undefined ? e.cuenta : r.cuenta;
  ic.classList.toggle('changed', e.correo !== undefined && e.correo !== r.correo);
  icu.classList.toggle('changed', e.cuenta !== undefined && e.cuenta !== r.cuenta);
  renderEcLog(e.log || []);
  document.getElementById('editContactOverlay').classList.add('open');
}

function ecMarkChanged(inp, f) {
  const r = ecCurrentEmp; if (!r) return;
  inp.classList.toggle('changed', inp.value.trim() !== (r[f] || ''));
}

function renderEcLog(log) {
  const c = document.getElementById('ecLogList');
  if (!log || !log.length) { c.innerHTML = '<div style="font-size:12px;color:var(--text3);padding:6px 0">Sin cambios previos.</div>'; return; }
  const fl = {correo: 'CORREO', cuenta: 'CUENTA'};
  c.innerHTML = log.map(e => {
    const d = new Date(e.ts).toLocaleString('es-CO',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
    return `<div class="ec-log-item"><span class="ec-log-field">${fl[e.field]||e.field}</span> <span class="ec-log-val">${esc(e.newValue||'(vacío)')}</span><br><span class="ec-log-meta">Anterior: ${esc(e.oldValue||'(vacío)')} · ${esc(e.usuario)} · ${d}</span></div>`;
  }).join('');
}

function saveEditContact() {
  if (!ecCurrentEmp) return;
  const {cedula, periodo, correo: oc, cuenta: ocu} = ecCurrentEmp,
        nc = document.getElementById('ecInpCorreo').value.trim(),
        ncu = document.getElementById('ecInpCuenta').value.trim(),
        usr = currentUser?.username || '?';
  let ch = false;
  const s = getContactEdits(), k = cedula + '|' + periodo, ex = s[k] || {};
  const sc = ex.correo !== undefined ? ex.correo : oc,
        scu = ex.cuenta !== undefined ? ex.cuenta : ocu;
  if (nc !== sc) { persistContactEdit(cedula, periodo, 'correo', nc, sc, usr); ch = true; }
  if (ncu !== scu) { persistContactEdit(cedula, periodo, 'cuenta', ncu, scu, usr); ch = true; }
  if (ch) { showToast('✅ Datos de contacto guardados','success'); renderRows(); }
  else { showToast('Sin cambios para guardar'); }
  document.getElementById('editContactOverlay').classList.remove('open');
}

function closeEditContact() {
  document.getElementById('editContactOverlay').classList.remove('open');
  ecCurrentEmp = null; ecCurrentIdx = null;
}

function clearContactEdits() {
  if (!ecCurrentEmp) return;
  if (!confirm('¿Eliminar cambios para ' + ecCurrentEmp.nombre + '?')) return;
  clearContactEditsForEmp(ecCurrentEmp.cedula, ecCurrentEmp.periodo);
  showToast('Cambios eliminados','success'); renderRows(); closeEditContact();
}
