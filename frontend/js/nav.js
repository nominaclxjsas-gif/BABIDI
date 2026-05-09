// ══════════════════════════════════════════════
//  NAV — Navegación entre vistas
// ══════════════════════════════════════════════

function navTo(viewId, navEl) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const v = document.getElementById(viewId); if (v) v.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (navEl) navEl.classList.add('active');
  currentView = viewId;
  const titles = {
    'dashboardView':'Dashboard','cargarView':'Cargar Nómina','empleadosView':'Empleados',
    'desprendiblesView':'Desprendibles','envioView':'Envío Masivo','historialView':'Historial','usuariosView':'Usuarios'
  };
  const el = document.getElementById('topbarTitle'); if (el) el.textContent = titles[viewId] || viewId;
  if (viewId === 'historialView') renderHistorialView();
  if (viewId === 'usuariosView') renderUsersGrid();
  if (viewId === 'empleadosView' && allEmployees.length) buildPanel();
  if (viewId === 'desprendiblesView' && allEmployees.length) renderDesprendibles();
  if (viewId === 'envioView') loadBrevoConfigToUI();
  loadHistory();
}

// ══════════════════════════════════════════════
//  PAGO BADGE
// ══════════════════════════════════════════════
function updatePagoBadge() {
  const b = document.getElementById('topbarPagoBadge'), t = document.getElementById('topbarPagoText');
  if (!b || !t) return;
  const today = new Date().getDate(), dias = [10,15,25,30];
  let next = dias.find(d => d > today) || dias[0];
  b.style.display = 'flex';
  t.textContent = `Próximo pago: día ${next} (en ${next > today ? next - today : next + 30 - today} días)`;
}

// ══════════════════════════════════════════════
//  INACTIVIDAD
// ══════════════════════════════════════════════
let inactiveTimeout, inactiveCountdown;
const INACTIVE_MS = 30 * 60 * 1000, WARN_MS = 30;

function resetInactivity() {
  document.getElementById('inactiveOverlay').classList.remove('show');
  clearTimeout(inactiveTimeout); clearInterval(inactiveCountdown);
  inactiveTimeout = setTimeout(showInactiveWarning, INACTIVE_MS - WARN_MS * 1000);
}
function showInactiveWarning() {
  const ov = document.getElementById('inactiveOverlay'), te = document.getElementById('inactiveTimer');
  ov.classList.add('show'); let s = WARN_MS; te.textContent = s;
  inactiveCountdown = setInterval(() => {
    s--; te.textContent = s;
    if (s <= 0) { clearInterval(inactiveCountdown); ov.classList.remove('show'); doLogout(); showToast('Sesión cerrada por inactividad','error'); }
  }, 1000);
}
['click','keydown','mousemove','touchstart'].forEach(ev =>
  document.addEventListener(ev, () => {
    if (document.getElementById('appShell').style.display !== 'none') resetInactivity();
  }, {passive: true})
);
