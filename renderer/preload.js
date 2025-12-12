const { contextBridge, ipcRenderer } = require('electron');
const SERVER_URL = 'https://employee-roster-api.sonnx-pod.workers.dev';

async function j(method, path, body) {
  const r = await fetch(`${SERVER_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    let t = '';
    try { t = await r.text(); } catch {}
    throw new Error(`HTTP ${r.status} ${t}`);
  }
  return r.json();
}

contextBridge.exposeInMainWorld('api', {
  loadRoster: () => ipcRenderer.invoke('roster:load'),
  saveRoster: (args) => ipcRenderer.invoke('roster:save', args),
  saveDayStatus: (args) => ipcRenderer.invoke('store:save-day-status', args),
  loadDayStatus: (args) => ipcRenderer.invoke('store:load-day-status', args),
  copyText: (text) => ipcRenderer.invoke('utils:copy-text', text),
  exportCsv: (args) => ipcRenderer.invoke('export:csv', args),
  exportTxt: (args) => ipcRenderer.invoke('export:txt', args),
  saveWeekendPool: (args) => ipcRenderer.invoke('store:save-weekend-pool', args),
  loadWeekendPool: (args) => ipcRenderer.invoke('store:load-weekend-pool', args),
  loadDutyHistory: () => ipcRenderer.invoke('store:load-duty-history'),
  saveDutyHistory: (history) => ipcRenderer.invoke('store:save-duty-history', history),
  getDesignJobStats: (args) => ipcRenderer.invoke('stats:get-design-jobs', args),
  
  // --- MỚI: Mini Mode ---
  setMiniMode: (enable) => ipcRenderer.invoke('window:set-mini-mode', enable),
});

contextBridge.exposeInMainWorld('cloud', {
  listEmployees: () => j('GET', '/employees'),
  createEmployee: (emp) => j('POST', '/employees', emp),
  updateEmployee: (id, emp) => j('PUT', `/employees/${encodeURIComponent(id)}`, emp),
  deleteEmployee: (id) => j('DELETE', `/employees/${encodeURIComponent(id)}`),
  bulkReplace: (list) => j('PUT', '/employees', list),
  getTeams: () => j('GET', '/teams'), 
  saveTeams: (teams) => j('PUT', '/teams', { teams }),
  getDayStatus: (dateISO) => j('GET', `/day-status/${dateISO}`),
  saveDayStatus: (dateISO, statuses) => j('PUT', `/day-status/${dateISO}`, { statuses }),
});

console.log('[preload] injected');