// ══════════════════════════════════════════════
//  AUTH — Login, logout, usuarios
// ══════════════════════════════════════════════

async function hashStr(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

const ADMIN_KEY = 'babidi_admins_v2';
const ROOT_UH = '1f7856b4937e6d510ceccb4cf6e92790eaf40d7cced656af9f61bdeb750cd27e';
const ROOT_PH = 'f949c49ff96e2dda3b7e76eba494c822ef4f18035627fe0418578fdd9870db8a';
let currentUser = null;

function getAdminUsers() { try { return JSON.parse(localStorage.getItem(ADMIN_KEY) || '[]'); } catch { return []; } }
function saveAdminUsers(l) { try { localStorage.setItem(ADMIN_KEY, JSON.stringify(l)); } catch(e) {} }

async function doLogin() {
  const u = document.getElementById('inpUser').value.trim(),
        p = document.getElementById('inpPass').value,
        err = document.getElementById('loginErr');
  if (!u || !p) { err.textContent = 'Ingresa usuario y contraseña'; return; }
  const [hu, hp] = await Promise.all([hashStr(u), hashStr(p)]);
  if (hu === ROOT_UH && hp === ROOT_PH) { currentUser = {username:'admin', role:'admin'}; err.textContent = ''; onLoginSuccess(); return; }
  const users = getAdminUsers(), found = users.find(x => x.uh === hu && x.ph === hp);
  if (found) { currentUser = {username: found.username, role: found.role}; err.textContent = ''; onLoginSuccess(); return; }
  err.textContent = 'Credenciales incorrectas'; document.getElementById('inpPass').value = '';
}

function onLoginSuccess() {
  document.getElementById('loginShell').style.display = 'none';
  document.getElementById('appShell').style.display = 'flex';
  const lbl = currentUser.username;
  document.getElementById('sidebarUserName').textContent = lbl;
  document.getElementById('sidebarAvatar').textContent = lbl.charAt(0).toUpperCase();
  document.getElementById('topbarUserLabel').textContent = lbl + (currentUser.role === 'viewer' ? ' 👁' : ' ⚡');
  loadHistory(); updatePagoBadge(); renderUsersGrid(); resetInactivity();
  loadBrevoConfigToUI();
}

function doLogout() {
  currentUser = null; allEmployees = []; filtered = [];
  document.getElementById('inpUser').value = '';
  document.getElementById('inpPass').value = '';
  document.getElementById('appShell').style.display = 'none';
  document.getElementById('loginShell').style.display = 'flex';
  document.getElementById('adminPanel').classList.remove('open');
}

document.getElementById('btnLogin').addEventListener('click', doLogin);
document.getElementById('inpUser').addEventListener('keypress', e => { if (e.key === 'Enter') doLogin(); });
document.getElementById('inpPass').addEventListener('keypress', e => { if (e.key === 'Enter') doLogin(); });
document.getElementById('btnLogout').addEventListener('click', doLogout);
document.getElementById('btnAdminToggle').addEventListener('click', () => {
  document.getElementById('adminPanel').classList.toggle('open'); renderLoginAdminList();
});

function renderLoginAdminList() {
  const users = getAdminUsers(), el = document.getElementById('adminUserList');
  if (!users.length) { el.innerHTML = '<div style="font-size:12px;color:var(--text3);padding:6px 0">Solo existe el usuario raíz (admin).</div>'; return; }
  el.innerHTML = users.map((u, i) => `<div class="admin-user-row"><span class="admin-user-name">${u.username}</span><span class="admin-role-badge ${u.role==='viewer'?'viewer':''}">${u.role==='admin'?'Admin':'Lectura'}</span><button class="admin-btn-del" onclick="deleteAdminUser(${i})">✕</button></div>`).join('');
}

async function addAdminUser() {
  const uEl = document.getElementById('newAdminUser'), pEl = document.getElementById('newAdminPass'), rEl = document.getElementById('newAdminRole'),
        u = uEl.value.trim(), p = pEl.value, r = rEl.value;
  if (!u || !p) { showToast('Ingresa usuario y contraseña','error'); return; }
  if (u.toLowerCase() === 'admin') { showToast('Nombre reservado','error'); return; }
  const [uh, ph] = await Promise.all([hashStr(u), hashStr(p)]);
  const users = getAdminUsers();
  if (users.find(x => x.uh === uh)) { showToast('Usuario ya existe','error'); return; }
  users.push({username: u, uh, ph, role: r}); saveAdminUsers(users);
  uEl.value = ''; pEl.value = ''; renderLoginAdminList(); renderUsersGrid();
  showToast('Usuario creado: ' + u, 'success');
}

async function deleteAdminUser(idx) {
  const users = getAdminUsers();
  if (!confirm('¿Eliminar usuario "' + users[idx].username + '"?')) return;
  users.splice(idx, 1); saveAdminUsers(users);
  renderLoginAdminList(); renderAdminMgrList(); renderUsersGrid();
  showToast('Usuario eliminado','success');
}

function openAdminMgr() { renderAdminMgrList(); document.getElementById('adminMgrOverlay').classList.add('open'); }

function renderAdminMgrList() {
  const users = getAdminUsers(), el = document.getElementById('adminMgrList');
  const root = `<div class="admin-user-row"><span class="admin-user-name">admin</span><span class="admin-role-badge">Admin (raíz)</span><span style="font-size:11px;color:var(--text3)">permanente</span></div>`;
  el.innerHTML = root + users.map((u, i) => `<div class="admin-user-row"><span class="admin-user-name">${u.username}</span><span class="admin-role-badge ${u.role==='viewer'?'viewer':''}">${u.role==='admin'?'Admin':'Solo lectura'}</span><button class="admin-btn-del" onclick="deleteAdminUser(${i});renderAdminMgrList()">✕ Eliminar</button></div>`).join('');
}

async function addUserFromMgr() {
  const uEl = document.getElementById('mgrNewUser'), pEl = document.getElementById('mgrNewPass'), rEl = document.getElementById('mgrNewRole'),
        u = uEl.value.trim(), p = pEl.value, r = rEl.value;
  if (!u || !p) { showToast('Ingresa usuario y contraseña','error'); return; }
  if (u.toLowerCase() === 'admin') { showToast('Nombre reservado','error'); return; }
  const [uh, ph] = await Promise.all([hashStr(u), hashStr(p)]);
  const users = getAdminUsers();
  if (users.find(x => x.uh === uh)) { showToast('Ya existe','error'); return; }
  users.push({username: u, uh, ph, role: r}); saveAdminUsers(users);
  uEl.value = ''; pEl.value = ''; renderAdminMgrList(); renderUsersGrid();
  showToast('Usuario creado: ' + u, 'success');
}

function renderUsersGrid() {
  const users = getAdminUsers(), el = document.getElementById('usersGrid'); if (!el) return;
  const rootCard = `<div class="user-card"><div class="user-card-avatar">A</div><div class="user-card-name">admin</div><div class="user-card-role">Administrador</div><div class="user-card-badge">ADMIN</div><div class="user-card-actions"><div class="btn-user-active">● ACTIVO</div><div class="btn-user-deactivate" style="opacity:.4;cursor:not-allowed">■ Desactivar</div></div></div>`;
  el.innerHTML = rootCard + users.map((u, i) => `<div class="user-card"><div class="user-card-avatar" style="background:linear-gradient(135deg,#4a9eff,#1e6fc8)">${u.username.charAt(0).toUpperCase()}</div><div class="user-card-name">${esc(u.username)}</div><div class="user-card-role">${u.role==='admin'?'Administrador':'Solo lectura'}</div><div class="user-card-badge ${u.role==='viewer'?'viewer':''}">${u.role==='admin'?'ADMIN':'VIEWER'}</div><div class="user-card-actions"><div class="btn-user-active">● ACTIVO</div><button class="btn-user-deactivate" onclick="deleteAdminUser(${i})">■ Desactivar</button></div></div>`).join('');
}
