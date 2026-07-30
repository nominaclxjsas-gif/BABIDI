// ══════════════════════════════════════════════
//  EMPLEADOS — Carga de Excel y tabla de empleados
// ══════════════════════════════════════════════

function setupDropZone(dzId, inputId) {
  const dz = document.getElementById(dzId), inp = document.getElementById(inputId);
  if (!dz || !inp) return;
  inp.addEventListener('change', e => { if (e.target.files[0]) processFile(e.target.files[0]); });
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
  dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('drag'); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); });
}
setupDropZone('dropZone', 'fileInput');
setupDropZone('dropZone2', 'fileInput2');

// ══════════════════════════════════════════════  ← AGREGAR AQUÍ
//  SELECTOR DE PERÍODO
// ══════════════════════════════════════════════
let selectedPeriod = 1;
let selectedMonth = '';

const MESES_NOMBRE = {1:'ENERO',2:'FEBRERO',3:'MARZO',4:'ABRIL',5:'MAYO',6:'JUNIO',7:'JULIO',8:'AGOSTO',9:'SEPTIEMBRE',10:'OCTUBRE',11:'NOVIEMBRE',12:'DICIEMBRE'};

function setPeriod(period) {
  selectedPeriod = period;
  document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`.period-btn[data-period="${period}"]`).classList.add('active');
  renderDesprendibles();
}

function setMonth(value) {
  selectedMonth = value;
  renderDesprendibles();
}

function parseExcelBuffer(buffer) {
      showLoad('Analizando...', 40);
      const wb = XLSX.read(buffer, {type:'array', cellDates:false, raw:true});
      showLoad('Procesando hojas...', 60);
      allEmployees = [];
      const CITY_MAP = {'BOGOTA':'BOGOTÁ','FUNZA':'FUNZA','PASTO':'PASTO','VILLAVICENCIO':'VILLAVICENCIO','BUCARAMANGA PREST':'BUCARAMANGA','PEREIRA ':'PEREIRA','PEREIRA':'PEREIRA','CALI':'CALI','TUNJA':'TUNJA','MEDELLIN':'MEDELLÍN','BARRANQUILLA':'BARRANQUILLA','BARRANQUILLA (2)':'BARRANQUILLA','AJUSTES GENERAL NOMINA':'AJUSTES','AJUSTES GENERAL NOMINA (2)':'AJUSTES','AJUSTES GENERAL NOMINA (3)':'AJUSTES','AJUSTES GENERAL NOMINA (4)':'AJUSTES','AJUSTES GENERAL NOMINA (5)':'AJUSTES','BOGOTÁ':'BOGOTÁ'};
      wb.SheetNames.forEach(sn => {
        const ciudadHoja = CITY_MAP[sn] || sn;
        const ws = wb.Sheets[sn], data = XLSX.utils.sheet_to_json(ws, {header:1, defval:'', raw:true});
        if (!data || data.length < 4) return;

        // Período: soporta "10 AL 24 DE JULIO DE 2026" y el nuevo formato
        // "25 DE JUNIO AL 09 DE JULIO DE 2026" (el corte cruza de mes).
        let periodo = '—';
        for (let pi = 0; pi < Math.min(5, data.length); pi++) {
          const txt = data[pi].map(c => String(c || '')).join(' ');
          const m = txt.match(/\d+\s+DE\s+\w+\s+AL\s+\d+\s+DE\s+\w+\s+DE\s+\d{4}/i) ||
                    txt.match(/\d+\s+(?:AL|al|-)\s*\d+\s+DE\s+\w+\s+DE\s+\d{4}/i) ||
                    txt.match(/\d+\s*[-–]\s*\d+\s+(?:DE\s+)?\w+\s+DEL?\s+\d{4}/i);
          if (m) { periodo = m[0].trim(); break; }
        }

        // Detectar fila de encabezado principal (la que tiene ID/CEDULA y NOMBRE).
        // El nuevo formato usa las columnas: CIUDAD | TIPO DE ID | ID | NOMBRE | SMLMV | TURNOS | HORAS | ...
        let headerRow = -1, cedulaCol = -1, nombreCol = -1;
        for (let hi = 0; hi < Math.min(8, data.length); hi++) {
          const ru = data[hi].map(c => String(c || '').toUpperCase().trim());
          const ci = ru.findIndex(c => c === 'CEDULA' || c === 'CÉDULA' || c === 'CC' || c === 'C.C.' || c === 'ID');
          const ni = ru.findIndex(c => c.includes('NOMBRE'));
          const si = ru.findIndex(c => c === 'SMLMV' || c === 'SMLV' || c.includes('SMLMV') || c.includes('SMLV'));
          // Se exige también una columna SMLMV/SMLV: distingue la tabla real de nómina
          // de otras hojas sueltas del libro (notas, listados de asistencia, etc.)
          // que también tienen columnas de ID/CEDULA y NOMBRE pero no son nómina.
          if (ci >= 0 && ni >= 0 && si >= 0) { headerRow = hi; cedulaCol = ci; nombreCol = ni; break; }
        }
        if (headerRow < 0) return;

        // Columna de CIUDAD, si existe justo antes de la de ID (formato nuevo: CIUDAD|TIPO DE ID|ID)
        const hRow0 = data[headerRow].map(c => String(c || '').toUpperCase().trim());
        const ciudadCol = hRow0.findIndex(c => c === 'CIUDAD');

        // El Excel tiene 3 filas de encabezado (título principal + sub-encabezado + fila CANT/VALOR)
        // Los datos empiezan en headerRow + 3
        const ds = headerRow + 3;

        // Columnas calculadas en relación a la columna del ID (base), tal como están
        // dispuestas en el archivo real:
        // base+0: ID          base+1: NOMBRE        base+2: SMLMV
        // base+3: TURNOS      base+4: HORAS
        // base+5/6:  TURNO ORDINARIO   (CANT/VALOR)
        // base+7/8:  TURNO FESTIVO     (CANT/VALOR)
        // base+9/10: HORA EXTRA DIURNA (CANT/VALOR)
        // base+11/12: HORA EXTRA NOCTURNA (CANT/VALOR)
        // base+13/14: HORA EXTRA DIURNA FESTIVA (CANT/VALOR)
        // base+15/16: HORA EXTRA NOCTURNA FESTIVA (CANT/VALOR)
        // base+17/18: RECARGO NOCTURNO (CANT/VALOR)
        // base+19/20: RECARGO NOCTURNO FESTIVO (CANT/VALOR)
        // base+21: AUXILIO DE TRANSPORTE   base+22: VALOR DEVENGADO
        // base+23: DESCUENTO PRESTAMOS Y OTROS  base+24: INCAPACIDAD
        // base+25: TRANSPORTE INTERMUNICIPAL    base+26: OTROS PAGOS PENDIENTES
        // base+27: DEDUCCIONES,EPS Y PENSION    base+28: TOTAL A PAGAR
        // base+29: BANCO   base+30: No. CUENTA   base+31: OBSERVACIONES   base+32: CORREO ELECTRONICO
        const base = cedulaCol;

        for (let i = ds; i < data.length; i++) {
          const row = data[i];
          let cr = clean(row[cedulaCol]); const nombre = clean(row[nombreCol]);
          if (!cr || !nombre) continue;
          if (nombre.toLowerCase().includes('total') || nombre.toLowerCase().includes('pagar nomina')) continue;
          const cedula = cr.replace(/^(CD|PPT|PT|ppt|pt|cd)[\s.]*/i, '').trim();
          if (!cedula || isNaN(parseInt(cedula))) continue;
          const ciudadFila = ciudadCol >= 0 ? clean(row[ciudadCol]) : '';
          const ciudad = ciudadFila ? (CITY_MAP[ciudadFila.toUpperCase()] || ciudadFila) : ciudadHoja;
          allEmployees.push({
            ciudad, periodo, cedula, nombre,
            smlv:          num(row[base+2]),
            turnos:        num(row[base+3]),
            horas:         num(row[base+4]),
            turno_dia_c:   num(row[base+5]),  turno_dia_v:    num(row[base+6]),
            fest_d_c:      num(row[base+7]),  fest_d_v:       num(row[base+8]),
            fest_n_c:      0,                 fest_n_v:       0,
            he_d_c:        num(row[base+9]),  he_d_v:         num(row[base+10]),
            he_n_c:        num(row[base+11]), he_n_v:         num(row[base+12]),
            he_fd_c:       num(row[base+13]), he_fd_v:        num(row[base+14]),
            he_fn_c:       num(row[base+15]), he_fn_v:        num(row[base+16]),
            rec_n_c:       num(row[base+17]), rec_n_v:        num(row[base+18]),
            rec_nf_c:      num(row[base+19]), rec_nf_v:       num(row[base+20]),
            aux_trans:     num(row[base+21]),
            devengado:     num(row[base+22]),
            desc_prest:    num(row[base+23]),
            incapacidad:   num(row[base+24]),
            trans_inter:   num(row[base+25]),
            aux_lib:       num(row[base+26]),
            deduc:         num(row[base+27]),
            total_pagar:   num(row[base+28]),
            banco:         clean(row[base+29]) || '',
            cuenta:        clean(row[base+30]) || '',
            obs:           clean(row[base+31]) || '',
            correo:        clean(row[base+32]) || ''
          });
        }
      });
}

function processFile(file) {
  showLoad('Leyendo archivo...', 20);
  const reader = new FileReader();
  reader.onload = evt => {
    try {
      parseExcelBuffer(evt.target.result);
      showLoad('Finalizando...', 85);
      if (!allEmployees.length) { hideLoad(); showErr('No se encontraron empleados. Verifica las hojas del Excel.'); return; }
      saveHistory(file.name, file); currentFile = file.name;
      setTimeout(() => {
        hideLoad(); updateDashKPIs(); buildPanel();
        navTo('empleadosView', document.querySelector('[data-view=empleadosView]'));
        loadHistory(); showToast('✅ ' + allEmployees.length + ' empleados cargados','success');
      }, 200);
    } catch(err) { hideLoad(); showErr('Error al procesar: ' + err.message); console.error(err); }
  };
  reader.readAsArrayBuffer(file);
}

function openHistoryFile(id) {
  showLoad('Leyendo archivo...', 20);
  getHistoryFileBuffer(id).then(rec => {
    if (!rec || !rec.data) { hideLoad(); showToast('No se pudo encontrar el archivo guardado', 'error'); return; }
    try {
      parseExcelBuffer(rec.data);
      showLoad('Finalizando...', 85);
      if (!allEmployees.length) { hideLoad(); showErr('No se encontraron empleados. Verifica las hojas del Excel.'); return; }
      currentFile = rec.name;
      setTimeout(() => {
        hideLoad(); updateDashKPIs(); buildPanel();
        navTo('empleadosView', document.querySelector('[data-view=empleadosView]'));
        showToast('✅ ' + allEmployees.length + ' empleados cargados','success');
      }, 200);
    } catch(err) { hideLoad(); showErr('Error al procesar: ' + err.message); console.error(err); }
  }).catch(err => { hideLoad(); console.error(err); showToast('Error al abrir el archivo guardado', 'error'); });
}

function updateDashKPIs() {
  const cities = [...new Set(allEmployees.map(e => e.ciudad))],
        total = allEmployees.reduce((s,e) => s + e.total_pagar, 0),
        per = allEmployees[0]?.periodo || '—';
  document.getElementById('kpiEmp').textContent = allEmployees.length;
  document.getElementById('kpiCiudades').textContent = cities.length;
  document.getElementById('kpiNomina').textContent = '$' + (total/1000000).toFixed(1) + 'M';
  document.getElementById('kpiCorte').textContent = per.split('DE')[0].trim().split(' ').slice(-3).join(' ');
  document.getElementById('dashPeriodo').textContent = per;
  document.getElementById('dashEmpSub').textContent = allEmployees.length + ' empleados cargados';
  const empSub = document.getElementById('empSub');
  if (empSub) empSub.textContent = allEmployees.length + ' empleados · ' + cities.length + ' ciudades · ' + per;
}

// ══════════════════════════════════════════════
//  PANEL EMPLEADOS — Tabla con filtros y paginación
// ══════════════════════════════════════════════
function buildPanel() {
  const cities = [...new Set(allEmployees.map(e => e.ciudad))].sort();
  const cont = document.getElementById('empleadosPanel'); if (!cont) return;

  // Reconstruir solo las partes que cambian con cada carga (tabs y opciones de ciudad)
  // Si el panel ya existe, solo actualizar tabs y select de ciudades sin recrear los inputs
  const panelExists = !!document.getElementById('searchInput');

  if (!panelExists) {
    cont.innerHTML = `
      <div class="sheet-tabs-wrap" id="sheetTabs"></div>
      <div class="panel-toolbar">
        <input id="searchInput" class="filt-input" placeholder="🔍 Buscar empleado, cédula...">
        <select id="cityFilter" class="filt-select"><option value="">Todas las ciudades</option></select>
        <button class="tb-btn" onclick="openCityReport()">📊 Resumen</button>
        <button class="tb-btn red" onclick="exportFiltered()">📥 Exportar</button>
        <div class="pag-ctrl">Filas:<select id="rowsPer"><option value="50">50</option><option value="100" selected>100</option><option value="250">250</option><option value="500">500</option></select><button id="btnPrev">◀</button><span class="pag-info" id="pagInfo">Pág 1</span><button id="btnNext">▶</button></div>
      </div>
      <div class="summary-chips" id="summaryChips"></div>
      <div class="tbl-wrap" style="max-height:calc(100vh - 340px)">
        <table class="data-tbl" id="mainTbl"><thead id="tblHead"><tr></tr></thead><tbody id="tblBody"><tr><td colspan="9" style="padding:48px;text-align:center;color:var(--text3)">Cargando...</td></tr></tbody></table>
      </div>`;

    // Registrar listeners UNA SOLA VEZ
    document.getElementById('searchInput').addEventListener('input', () => { page=1; applyFilters(); });
    document.getElementById('cityFilter').addEventListener('change', () => { page=1; applyFilters(); });
    document.getElementById('rowsPer').addEventListener('change', () => { perPage=parseInt(document.getElementById('rowsPer').value); page=1; applyFilters(); });
    document.getElementById('btnPrev').addEventListener('click', () => { if(page>1){page--;renderRows();} });
    document.getElementById('btnNext').addEventListener('click', () => { const t=Math.ceil(filtered.length/perPage); if(page<t){page++;renderRows();} });
  }

  // Actualizar tabs de ciudades
  const sheetTabs = document.getElementById('sheetTabs');
  if (sheetTabs) {
    sheetTabs.innerHTML = `<button class="sheet-tab active" onclick="filterByCity('');document.querySelectorAll('.sheet-tab').forEach(t=>t.classList.remove('active'));this.classList.add('active')">Todos</button>` +
      cities.map(c=>`<button class="sheet-tab" onclick="filterByCity('${c.replace(/'/g,"\\'")}');document.querySelectorAll('.sheet-tab').forEach(t=>t.classList.remove('active'));this.classList.add('active')">${esc(c)}</button>`).join('');
  }

  // Actualizar opciones del select de ciudad
  const cf = document.getElementById('cityFilter');
  if (cf) {
    cf.innerHTML = `<option value="">Todas las ciudades</option>` + cities.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');
  }

  // Limpiar búsqueda al cargar nuevo archivo
  const si = document.getElementById('searchInput');
  if (si) si.value = '';

  page = 1; applyFilters();
  
    // Mostrar selector de período
  const periodSelector = document.getElementById('periodSelector');
  if (periodSelector) {
    periodSelector.style.display = 'flex';
    selectedPeriod = 1;
    document.querySelectorAll('.period-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.period-btn[data-period="1"]').classList.add('active');
    selectedMonth = '';
    const ms = document.getElementById('monthSelector');
    if (ms) ms.value = '';
  }
}

function filterByCity(city) { const cf=document.getElementById('cityFilter'); if(cf)cf.value=city; page=1; applyFilters(); }

function applyFilters() {
  const q = (document.getElementById('searchInput')?.value||'').toLowerCase(),
        city = document.getElementById('cityFilter')?.value||'';
  filtered = allEmployees.filter(e => {
    if (city && e.ciudad !== city) return false;
    if (q && !e.nombre.toLowerCase().includes(q) && !e.cedula.includes(q) && !e.ciudad.toLowerCase().includes(q)) return false;
    return true;
  });
  if (sortCol >= 0) {
    const cols = ['ciudad','cedula','nombre','turnos','horas','devengado','deduc','total_pagar'];
    const key = cols[sortCol] || 'nombre';
    filtered.sort((a,b) => { let va=a[key],vb=b[key],na=parseFloat(va),nb=parseFloat(vb); if(!isNaN(na)&&!isNaN(nb))return(na-nb)*sortDir; return String(va||'').localeCompare(String(vb||''))*sortDir; });
  }
  updateSummaryChips(); renderHeader(); renderRows();
}

function updateSummaryChips() {
  const tp=filtered.reduce((s,e)=>s+e.total_pagar,0), td=filtered.reduce((s,e)=>s+e.devengado,0),
        tded=filtered.reduce((s,e)=>s+e.deduc,0), el=document.getElementById('summaryChips');
  if (!el) return;
  el.innerHTML = `<div class="chip"><strong>${filtered.length}</strong> empleados</div><div class="chip gold"><strong>${fmtCOP(tp)}</strong> total a pagar</div><div class="chip green"><strong>${fmtCOP(td)}</strong> devengado</div><div class="chip red"><strong>${fmtCOP(tded)}</strong> deducciones</div>`;
}

function renderHeader() {
  const cols=['Ciudad','Cédula','Nombre','Turnos','Horas','Devengado','Deducción','Total a Pagar'], el=document.getElementById('tblHead');
  if (!el) return;
  el.innerHTML = '<tr>' + cols.map((c,i) => `<th onclick="sortTable(${i})">${esc(c)} ${sortCol===i?(sortDir===1?'▲':'▼'):'↕'}</th>`).join('') + '<th>Acciones</th></tr>';
}

function sortTable(i) { if(sortCol===i)sortDir*=-1; else{sortCol=i;sortDir=1;} applyFilters(); }

function renderRows() {
  const start=(page-1)*perPage, rows=filtered.slice(start,start+perPage),
        total=Math.ceil(filtered.length/perPage)||1, el=document.getElementById('tblBody');
  const pi=document.getElementById('pagInfo'); if(pi) pi.textContent=`Pág ${page} de ${total}`;
  if (!el) return;
  if (!rows.length) { el.innerHTML='<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--text3)">Sin resultados</td></tr>'; return; }
  const q2 = (document.getElementById('searchInput')?.value||'').toLowerCase();
  function hl(txt) {
    if (!q2||!txt) return esc(txt);
    const re = new RegExp('('+q2.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi');
    return esc(txt).replace(re,'<mark class="hl">$1</mark>');
  }
  el.innerHTML = rows.map((e,idx) => {
    const gi=start+idx, he=hasContactEdits(e.cedula,e.periodo), ef=applyContactEdits(e), hm=ef.correo&&ef.correo.includes('@');
    return `<tr><td><span style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:2px 8px;font-size:10px;font-weight:700;text-transform:uppercase">${esc(e.ciudad)}</span></td><td class="col-cedula">${hl(e.cedula)}</td><td class="col-name">${hl(e.nombre)}</td><td style="text-align:center;color:var(--text2)">${e.turnos||0}</td><td style="text-align:center;color:var(--text2)">${e.horas||0}</td><td class="col-dev">${fmtCOP(e.devengado)}</td><td class="col-ded">${fmtCOP(e.deduc)}</td><td class="col-total">${fmtCOP(e.total_pagar)}</td><td style="display:flex;gap:5px;align-items:center"><button class="btn-slip" onclick="showSlip(${gi})">Ver</button><button class="btn-edit-contact${he?' has-edit':''}" onclick="openEditContact(${gi})" title="Editar contacto">${he?'✏️✓':'✏️'}${hm?' 📧':''}</button></td></tr>`;
  }).join('');
}

// ══════════════════════════════════════════════
//  RESUMEN POR CIUDAD
// ══════════════════════════════════════════════
function openCityReport() {
  const cities=[...new Set(allEmployees.map(e=>e.ciudad))].sort(),
    rows=cities.map(city=>{const emps=allEmployees.filter(e=>e.ciudad===city),tp=emps.reduce((s,e)=>s+e.total_pagar,0),td=emps.reduce((s,e)=>s+e.devengado,0),tded=emps.reduce((s,e)=>s+e.deduc,0),prom=emps.length?tp/emps.length:0;return{city,count:emps.length,tp,td,tded,prom}}),
    gt=rows.reduce((s,r)=>s+r.tp,0);
  document.getElementById('cityModalBody').innerHTML=`<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="color:var(--text3);font-size:10px;text-transform:uppercase;letter-spacing:.5px"><th style="text-align:left;padding:7px 0;border-bottom:1px solid var(--border)">Ciudad</th><th style="text-align:center;padding:7px 0;border-bottom:1px solid var(--border)">Emp.</th><th style="text-align:right;padding:7px 0;border-bottom:1px solid var(--border)">Total</th><th style="text-align:right;padding:7px 0;border-bottom:1px solid var(--border)">Promedio</th></tr></thead><tbody>${rows.map(r=>`<tr onclick="filterByCity('${r.city.replace(/'/g,"\\'")}');document.getElementById('cityOverlay').classList.remove('open')" style="cursor:pointer"><td style="padding:9px 0;border-bottom:1px solid var(--border);font-weight:600">${esc(r.city)}</td><td style="text-align:center;padding:9px 0;border-bottom:1px solid var(--border);color:var(--text2)">${r.count}</td><td style="text-align:right;padding:9px 0;border-bottom:1px solid var(--border);font-family:var(--mono);color:var(--teal);font-weight:700">${fmtCOP(r.tp)}</td><td style="text-align:right;padding:9px 0;border-bottom:1px solid var(--border);font-family:var(--mono);color:var(--text2)">${fmtCOP(r.prom)}</td></tr>`).join('')}</tbody><tfoot><tr><td colspan="2" style="padding:10px 0;font-weight:700">TOTAL</td><td style="text-align:right;padding:10px 0;font-family:var(--mono);color:var(--green);font-size:15px;font-weight:700">${fmtCOP(gt)}</td><td></td></tr></tfoot></table><p style="font-size:11px;color:var(--text3);margin-top:8px">Clic en una ciudad para filtrar</p>`;
  document.getElementById('cityOverlay').classList.add('open');
}

document.getElementById('btnExportCityPdf').addEventListener('click', () => {
  const cities=[...new Set(allEmployees.map(e=>e.ciudad))].sort(),rows=cities.map(city=>{const emps=allEmployees.filter(e=>e.ciudad===city),tp=emps.reduce((s,e)=>s+e.total_pagar,0),td=emps.reduce((s,e)=>s+e.devengado,0),tded=emps.reduce((s,e)=>s+e.deduc,0),prom=emps.length?tp/emps.length:0;return{city,count:emps.length,tp,td,tded,prom}}),gt=rows.reduce((s,r)=>s+r.tp,0),periodo=allEmployees[0]?.periodo||'',today=new Date().toLocaleDateString('es-CO',{day:'2-digit',month:'long',year:'numeric'}),w=window.open('','_blank','width=900,height=700');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Resumen BABIDI</title><style>body{font-family:Arial,sans-serif;padding:28px}.header{background:#0d0f1a;padding:18px 24px;border-radius:8px;margin-bottom:20px;position:relative}.header::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:#f5c518;border-radius:8px 8px 0 0}.header h1{color:#fff;font-size:18px;font-weight:900;margin:0}.header h1 span{color:#f5c518}.header .sub{color:rgba(255,255,255,.5);font-size:10px;margin-top:3px;letter-spacing:1.5px;text-transform:uppercase}.right{float:right;text-align:right;color:rgba(255,255,255,.8);font-size:11px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#f8f9fe;padding:9px 12px;text-align:left;font-size:10px;text-transform:uppercase;color:#666;border-bottom:2px solid #0d0f1a}td{padding:9px 12px;border-bottom:1px solid #eee}.num{text-align:right;font-family:monospace;font-weight:700}tfoot td{font-weight:900;font-size:14px;border-top:2px solid #0d0f1a}</style></head><body><div class="header"><div class="right"><div>Período: ${periodo}</div><div style="opacity:.6">${today}</div></div><h1>BABIDI<span>NÓMINA</span></h1><div class="sub">Resumen por ciudad</div></div><table><thead><tr><th>Ciudad</th><th style="text-align:center">Emp.</th><th class="num">Devengado</th><th class="num">Deducciones</th><th class="num">Total a Pagar</th><th class="num">Promedio</th></tr></thead><tbody>${rows.map(r=>`<tr><td style="font-weight:700">${r.city}</td><td style="text-align:center">${r.count}</td><td class="num" style="color:#007a4d">${fmtCOP(r.td)}</td><td class="num" style="color:#b91c1c">${fmtCOP(r.tded)}</td><td class="num" style="color:#f5c518">${fmtCOP(r.tp)}</td><td class="num" style="color:#555">${fmtCOP(r.prom)}</td></tr>`).join('')}</tbody><tfoot><tr><td colspan="2">TOTAL — ${allEmployees.length} empleados</td><td class="num" style="color:#007a4d">${fmtCOP(allEmployees.reduce((s,e)=>s+e.devengado,0))}</td><td class="num" style="color:#b91c1c">${fmtCOP(allEmployees.reduce((s,e)=>s+e.deduc,0))}</td><td class="num" style="color:#f5c518">${fmtCOP(gt)}</td><td></td></tr></tfoot></table><script>window.onload=function(){setTimeout(function(){window.print();setTimeout(function(){window.close()},500)},600)}<\/script></body></html>`);
  w.document.close();
});

// ══════════════════════════════════════════════
//  EXPORT EXCEL
// ══════════════════════════════════════════════
function exportFiltered() {
  if (!filtered.length) return;
  const h=['Ciudad','Cédula','Nombre','Turnos','Horas','Devengado','Deducciones','Total a Pagar','Cuenta','Correo'],
    rows=filtered.map(e=>{const ef=applyContactEdits(e);return[e.ciudad,e.cedula,e.nombre,e.turnos,e.horas,e.devengado,e.deduc,e.total_pagar,ef.cuenta,ef.correo]});
  const wb=XLSX.utils.book_new(),ws=XLSX.utils.aoa_to_sheet([h,...rows]);
  XLSX.utils.book_append_sheet(wb,ws,'Nómina');
  XLSX.writeFile(wb,`babidi_nomina_${new Date().toISOString().slice(0,10)}.xlsx`);
  showToast('Excel exportado','success');
}