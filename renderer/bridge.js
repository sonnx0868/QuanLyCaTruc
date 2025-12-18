import { loadStore, saveStore } from './store-mobile.js';

// --- 1. Hàm helper để gọi Native HTTP (Chống CORS tuyệt đối) ---
async function nativeGet(url) {
  // Kiểm tra xem Plugin có sẵn không
  const Http = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorHttp;
  
  if (!Http) {
    console.warn("⚠️ CapacitorHttp chưa load, fallback sang fetch thường...");
    return fetch(url).then(r => r.json());
  }

  // Gọi qua Native (Đi đường riêng, không qua trình duyệt -> Không sợ CORS)
  const response = await Http.get({
    url: url,
    headers: {
      "accept": "application/json, text/plain, */*",
      "token": "f7a5a50d9c6f3218c3baf7b46d76556a",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });

  // Native trả về status và data đã parse sẵn
  if (response.status >= 200 && response.status < 300) {
    return response.data;
  } else {
    throw new Error(`Status ${response.status}`);
  }
}

// --- 2. Các hàm API giữ nguyên logic cũ ---
const api = {
  loadRoster: async () => {
    const data = await loadStore();
    return { 
      ok: true, 
      employees: data.employees || [], 
      teams: data.teams || []
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
  
  // ... (Các hàm loadDutyHistory, saveDutyHistory, weekendPool giữ nguyên) ...
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
    return { ok: true, remaining: dayData?.weekendPoolRemaining || null, builtFor: dayData?.weekendPoolBuiltFor || null }; 
  },

  copyText: async (text) => {
    // Dùng Clipboard plugin nếu có, không thì fallback
    if (navigator.clipboard) {
        await navigator.clipboard.writeText(text || '');
        return { ok: true };
    }
    return { ok: false };
  },

  // === PHẦN QUAN TRỌNG NHẤT: SỬA HÀM NÀY ===
  getDesignJobStats: async ({ from, to }) => {
    try {
      const url = `https://printerval.com/central/service/pod/design-job-stats/find?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      
      console.log("🚀 Calling Native HTTP for Stats...");
      const data = await nativeGet(url); // Gọi hàm nativeGet ở trên
      
      return { ok: true, data: { result: data } };
    } catch (error) {
      console.error('Stats fetch error:', error);
      return { ok: false, error: error.message };
    }
  },

  // Các tính năng không hỗ trợ
  setMiniMode: async () => {},
  exportCsv: async () => { alert('Chưa hỗ trợ CSV trên iPad'); return { ok: false }; },
  exportTxt: async () => { alert('Chưa hỗ trợ TXT trên iPad'); return { ok: false }; },
};

// Expose ra window
window.api = api;
console.log('✅ Bridge loaded (Native HTTP Mode)');