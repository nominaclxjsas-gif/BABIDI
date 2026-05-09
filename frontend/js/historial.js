// ══════════════════════════════════════════════
//  HISTORIAL — Archivos recientes
// ══════════════════════════════════════════════

function loadHistory() {
  let h = []; try { h = JSON.parse(localStorage.getItem('babidi_hist') || '[]'); } catch(e) {}
  const el = document.getElementById('histList');
  if (el) {
    if (!h.length) {
      el.innerHTML = '<div style="padding:10px;text-align:center;color:var(--text3);font-size:12px">Sin archivos recientes</div>';
    } else {
      el.innerHTML = h.slice(-6).reverse().map(x =>
        `<div class="hist-item"><div class="hist-ico">📄</div><div class="hist-name">${esc(x.name)}</div><div class="hist-date">${new Date(x.ts).toLocaleDateString('es-CO')}</div></div>`
      ).join('');
    }
  }
}

function renderHistorialView() {
  let h = []; try { h = JSON.parse(localStorage.getItem('babidi_hist') || '[]'); } catch(e) {}
  const el = document.getElementById('historialBody'); if (!el) return;
  if (!h.length) {
    el.innerHTML = '<div class="hist-view-empty"><div style="font-size:36px">📁</div><div>No hay archivos guardados</div></div>'; return;
  }
  el.innerHTML = h.slice().reverse().map(x =>
    `<div class="hist-view-item"><div class="hist-view-ico">📄</div><div class="hist-view-name">${esc(x.name)}</div><div class="hist-view-date">${new Date(x.ts).toLocaleString('es-CO',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</div></div>`
  ).join('');
}

function saveHistory(name) {
  let h = []; try { h = JSON.parse(localStorage.getItem('babidi_hist') || '[]'); } catch(e) {}
  h.push({name, ts: Date.now()});
  if (h.length > 20) h = h.slice(-20);
  try { localStorage.setItem('babidi_hist', JSON.stringify(h)); } catch(e) {}
}
