import { loadStore, saveStore } from './store-mobile.js';
// --- 1. Thay thế Logic API Cloud (giữ nguyên từ preload cũ) ---
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

// --- 2. Thay thế Logic Electron (giả lập các hàm IPC) ---
const api = {
  loadRoster: async () => {
    const data = await loadStore();
    return { 
      ok: true, 
      employees: data.employees || [], 
      teams: data.teams || [] // Đảm bảo luôn trả về mảng teams
    };
  },

  saveRoster: async ({ employees, teams }) => {
    const data = await loadStore();
    data.employees = employees;
    data.teams = teams;
    await saveStore(data);
    return { ok: true };
  },

  saveDayStatus: async ({ dateISO, statuses }) => {
    const data = await loadStore();
    data.days = data.days || {};
    data.days[dateISO] = { statuses };
    await saveStore(data);
    return { ok: true };
  },

  loadDayStatus: async ({ dateISO }) => {
    const data = await loadStore();
    const day = (data.days || {})[dateISO] || { statuses: {} };
    return { ok: true, statuses: day.statuses || {} };
  },

  loadDutyHistory: async () => {
    const data = await loadStore();
    return { ok: true, history: data.dutyHistory || {} };
  },

  saveDutyHistory: async (history) => {
    const data = await loadStore();
    data.dutyHistory = history;
    await saveStore(data);
    return { ok: true };
  },

  saveWeekendPool: async ({ dateISO, remaining, builtFor }) => {
    const data = await loadStore();
    data.days = data.days || {};
    data.days[dateISO] = data.days[dateISO] || { statuses: {} };
    data.days[dateISO].weekendPoolRemaining = remaining;
    data.days[dateISO].weekendPoolBuiltFor = builtFor;
    await saveStore(data);
    return { ok: true };
  },

  loadWeekendPool: async ({ dateISO }) => {
    const data = await loadStore();
    const dayData = (data.days || {})[dateISO];
    return { 
      ok: true, 
      remaining: dayData?.weekendPoolRemaining || null,
      builtFor: dayData?.weekendPoolBuiltFor || null
    };
  },

  // Các tính năng tiện ích
  copyText: async (text) => {
    try {
      await navigator.clipboard.writeText(text || '');
      return { ok: true };
    } catch (e) {
      console.error('Copy failed', e);
      return { ok: false };
    }
  },

  // Tính năng thống kê (gọi trực tiếp API thay vì qua net của Electron)
 getDesignJobStats: async ({ from, to }) => {
    try {
      const url = `https://printerval.com/central/service/pod/design-job-stats/find?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      
      // Sử dụng fetch (đã được CapacitorHttp patch) nhưng thêm User-Agent giả lập PC
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          "accept": "application/json, text/plain, */*",
          "token": "f7a5a50d9c6f3218c3baf7b46d76556a",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();
      return { ok: true, data: { result: data } };
    } catch (error) {
      console.error('Stats fetch error:', error);
      // Trả về mock data rỗng để app không bị treo nếu lỗi mạng
      return { ok: false, error: error.message };
    }
  },

  // Các tính năng không hỗ trợ trên iPad -> Hàm rỗng
  setMiniMode: async () => { console.log('Mini mode not supported on iPad'); },
  exportCsv: async () => { alert('Tính năng xuất CSV chưa hỗ trợ trên iPad'); return { ok: false }; },
  exportTxt: async () => { alert('Tính năng xuất TXT chưa hỗ trợ trên iPad'); return { ok: false }; },
};

const cloud = {
  listEmployees: () => j('GET', '/employees'),
  createEmployee: (emp) => j('POST', '/employees', emp),
  updateEmployee: (id, emp) => j('PUT', `/employees/${encodeURIComponent(id)}`, emp),
  deleteEmployee: (id) => j('DELETE', `/employees/${encodeURIComponent(id)}`),
  bulkReplace: (list) => j('PUT', '/employees', list),
  getTeams: () => j('GET', '/teams'), 
  saveTeams: (teams) => j('PUT', '/teams', { teams }),
  getDayStatus: (dateISO) => j('GET', `/day-status/${dateISO}`),
  saveDayStatus: (dateISO, statuses) => j('PUT', `/day-status/${dateISO}`, { statuses }),
};

// Expose ra window để renderer.js cũ có thể dùng được ngay
window.api = api;
window.cloud = cloud;
console.log('Bridge loaded for iPad!');