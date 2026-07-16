// ══════════════════════════════════════════════
//  HISTORIAL — Archivos recientes
//  Los METADATOS (nombre, fecha, id) viven en localStorage (rápido de leer).
//  El CONTENIDO real del archivo vive en IndexedDB (localStorage no aguanta
//  el peso de un Excel). Cada entrada del historial queda vinculada por "id".
// ══════════════════════════════════════════════

const HIST_DB_NAME = 'babidi_files_db';
const HIST_STORE   = 'files';
let _histDbPromise = null;

function openHistDB() {
  if (_histDbPromise) return _histDbPromise;
  _histDbPromise = new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error('IndexedDB no disponible')); return; }
    const req = indexedDB.open(HIST_DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(HIST_STORE)) {
        db.createObjectStore(HIST_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _histDbPromise;
}

function idbPut(record) {
  return openHistDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(HIST_STORE, 'readwrite');
    tx.objectStore(HIST_STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}

function idbGet(id) {
  return openHistDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(HIST_STORE, 'readonly');
    const req = tx.objectStore(HIST_STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  }));
}

function idbDelete(id) {
  return openHistDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(HIST_STORE, 'readwrite');
    tx.objectStore(HIST_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}

// Usado por empleados.js para re-abrir un archivo guardado
function getHistoryFileBuffer(id) {
  return idbGet(id).then(rec => rec ? { name: rec.name, data: rec.data } : null);
}

function genHistId() {
  return 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function readHistMeta() {
  let h = [];
  try { h = JSON.parse(localStorage.getItem('babidi_hist') || '[]'); } catch(e) { h = []; }
  let migrated = false;
  h = h.map(x => {
    if (!x.id) { migrated = true; return { ...x, id: genHistId() }; }
    return x;
  });
  if (migrated) writeHistMeta(h);
  return h;
}

function writeHistMeta(h) {
  try { localStorage.setItem('babidi_hist', JSON.stringify(h)); } catch(e) {}
}

function histActionButtons(id) {
  if (!id) return '';
  return `<div class="hist-actions" style="display:flex;gap:4px;margin-left:auto">
    <button class="hist-act" title="Abrir" onclick="event.stopPropagation();openHistoryFile('${id}')" style="border:none;background:transparent;cursor:pointer;font-size:14px;padding:2px 4px">📂</button>
    <button class="hist-act" title="Descargar" onclick="event.stopPropagation();downloadHistoryFile('${id}')" style="border:none;background:transparent;cursor:pointer;font-size:14px;padding:2px 4px">⬇️</button>
    <button class="hist-act" title="Eliminar" onclick="event.stopPropagation();deleteHistoryFile('${id}')" style="border:none;background:transparent;cursor:pointer;font-size:14px;padding:2px 4px">🗑️</button>
  </div>`;
}

function loadHistory() {
  const h = readHistMeta();
  const el = document.getElementById('histList');
  if (!el) return;
  if (!h.length) {
    el.innerHTML = '<div style="padding:10px;text-align:center;color:var(--text3);font-size:12px">Sin archivos recientes</div>';
    return;
  }
  el.innerHTML = h.slice(-6).reverse().map(x =>
    `<div class="hist-item" style="display:flex;align-items:center;gap:8px">
      <div class="hist-ico">📄</div>
      <div class="hist-name" style="flex:1;min-width:0">${esc(x.name)}</div>
      <div class="hist-date">${new Date(x.ts).toLocaleDateString('es-CO')}</div>
      ${histActionButtons(x.id)}
    </div>`
  ).join('');
}

function renderHistorialView() {
  const h = readHistMeta();
  const el = document.getElementById('historialBody'); if (!el) return;
  if (!h.length) {
    el.innerHTML = '<div class="hist-view-empty"><div style="font-size:36px">📁</div><div>No hay archivos guardados</div></div>'; return;
  }
  el.innerHTML = h.slice().reverse().map(x =>
    `<div class="hist-view-item" style="display:flex;align-items:center;gap:10px">
      <div class="hist-view-ico">📄</div>
      <div class="hist-view-name" style="flex:1;min-width:0">${esc(x.name)}</div>
      <div class="hist-view-date">${new Date(x.ts).toLocaleString('es-CO',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div>
      ${histActionButtons(x.id)}
    </div>`
  ).join('');
}

// name: string, file: objeto File (opcional) — si se pasa, se guarda el contenido real
function saveHistory(name, file) {
  const h = readHistMeta();
  const id = genHistId();
  h.push({ id, name, ts: Date.now() });

  let removed = [];
  let trimmed = h;
  if (h.length > 20) {
    removed = h.slice(0, h.length - 20);
    trimmed = h.slice(-20);
  }
  writeHistMeta(trimmed);
  removed.forEach(r => { if (r.id) idbDelete(r.id).catch(()=>{}); });

  if (file && typeof file.arrayBuffer === 'function') {
    file.arrayBuffer().then(buf => {
      idbPut({ id, name, ts: Date.now(), data: buf }).catch(err => console.error('No se pudo guardar el archivo en el historial', err));
    }).catch(err => console.error(err));
  }

  return id;
}

function downloadHistoryFile(id) {
  idbGet(id).then(rec => {
    if (!rec || !rec.data) { showToast('No se pudo encontrar el archivo guardado', 'error'); return; }
    const blob = new Blob([rec.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = rec.name || 'nomina.xlsx';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }).catch(err => { console.error(err); showToast('Error al descargar el archivo', 'error'); });
}

function deleteHistoryFile(id) {
  if (!confirm('¿Eliminar este archivo del historial? Esta acción no se puede deshacer.')) return;
  const h = readHistMeta().filter(x => x.id !== id);
  writeHistMeta(h);
  idbDelete(id).catch(()=>{});
  loadHistory();
  renderHistorialView();
  showToast('Archivo eliminado del historial', 'success');
}

function clearAllHistory() {
  const h = readHistMeta();
  if (!h.length) { showToast('El historial ya está vacío', 'error'); return; }
  if (!confirm('¿Eliminar TODO el historial de archivos? Esta acción no se puede deshacer.')) return;
  writeHistMeta([]);
  Promise.all(h.map(x => x.id ? idbDelete(x.id).catch(()=>{}) : Promise.resolve()))
    .finally(() => {
      loadHistory();
      renderHistorialView();
      showToast('Historial borrado', 'success');
    });
}

// openHistoryFile(id) vive en empleados.js: allí se re-parsea el Excel
// reutilizando la misma lógica que la carga de un archivo nuevo.