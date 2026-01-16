// ios-shim.js - Giả lập API Electron cho Mobile (Capacitor/Web)
console.log('📱 iOS Shim loaded');

// Hàm lưu/đọc LocalStorage
const LS = {
  get: (key, def) => {
    const v = localStorage.getItem(key);
    if (!v) return def;
    try { return JSON.parse(v); } catch { return def; }
  },
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val))
};

// Giả lập window.api
window.api = {
  // 1. Load danh sách nhân viên
  loadRoster: async () => {
    const data = LS.get('roster', { employees: [], teams: [] });
    // Nếu chưa có dữ liệu, trả về mặc định để app không trắng trang
    if (!data.employees.length) {
       return { 
         ok: true, 
         employees: [], 
         teams: [
            { name: 'Lead', color: '#dc2626' },
            { name: 'Vẽ', color: '#a855f7' },
            { name: 'Lịch', color: '#2563eb' },
            { name: 'Đào tạo', color: '#16a34a' },
            { name: '2D', color: '#6b7280' }
         ] 
       };
    }
    return { ok: true, employees: data.employees, teams: data.teams };
  },

  // 2. Lưu roster
  saveRoster: async ({ employees, teams }) => {
    LS.set('roster', { employees, teams });
    return { ok: true };
  },

  // 3. Load/Save trạng thái ngày (OFF/OT/CT)
  loadDayStatus: async ({ dateISO }) => {
    const allDays = LS.get('days_status', {});
    const day = allDays[dateISO] || { statuses: {} };
    return { ok: true, statuses: day.statuses || {} };
  },
  saveDayStatus: async ({ dateISO, statuses }) => {
    const allDays = LS.get('days_status', {});
    allDays[dateISO] = { statuses };
    LS.set('days_status', allDays);
    return { ok: true };
  },

  // 4. Load/Save Weekend Pool (Quay số)
  loadWeekendPool: async ({ dateISO }) => {
    const pools = LS.get('weekend_pools', {});
    const dayData = pools[dateISO];
    return { 
       ok: true, 
       remaining: dayData?.remaining || null, 
       builtFor: dayData?.builtFor || null 
    };
  },
  saveWeekendPool: async ({ dateISO, remaining, builtFor }) => {
    const pools = LS.get('weekend_pools', {});
    pools[dateISO] = { remaining, builtFor };
    LS.set('weekend_pools', pools);
    return { ok: true };
  },

  // 5. Lịch sử quay số
  loadDutyHistory: async () => {
    const hist = LS.get('duty_history', {});
    return { ok: true, history: hist };
  },
  saveDutyHistory: async (history) => {
    LS.set('duty_history', history);
    return { ok: true };
  },

  // 6. Tiện ích
  copyText: async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return { ok: true };
    } catch (e) {
      console.error('Copy fail', e);
      return { ok: false };
    }
  },
  
  // 7. Xuất file (Trên mobile sẽ tải file .txt về)
  exportTxt: async ({ defaultName, content }) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${defaultName}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { ok: true };
  },
  
  // 8. Thống kê (Gọi API qua fetch trực tiếp vì mobile không chặn CORS như Node)
  getDesignJobStats: async ({ from, to }) => {
    try {
        const url = `https://printerval.com/central/service/pod/design-job-stats/find?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
        const r = await fetch(url, {
            headers: { "token": "f7a5a50d9c6f3218c3baf7b46d76556a" }
        });
        const data = await r.json();
        return { ok: true, data: { result: data } }; // Mock cấu trúc trả về giống Electron
    } catch (e) {
        console.error('Stats API Error:', e);
        return { ok: false };
    }
  },

  // Dummy functions để không lỗi
  setMiniMode: async () => { console.log('Mini mode not supported on mobile'); return { ok: true }; }
};

// Cloud Sync (Dùng fetch trực tiếp)
const CLOUD_URL = 'https://employee-roster-api.sonnx-pod.workers.dev';
async function j(method, path, body) {
  try {
      const r = await fetch(`${CLOUD_URL}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!r.ok) throw new Error(r.statusText);
      return r.json();
  } catch (e) {
      console.warn('Cloud sync error:', e);
      throw e;
  }
}

window.cloud = {
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
