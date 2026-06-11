// ══════════════════════════════════════════════
//  STATE — Variables globales de la aplicación
// ══════════════════════════════════════════════

let allEmployees = [], filtered = [], sortCol = -1, sortDir = 1,
    page = 1, perPage = 100, currentFile = null, currentView = 'dashboardView',
    currentPeriodo = '';