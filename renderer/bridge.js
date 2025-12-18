// ============================================================
// renderer/bridge.js - PHIÊN BẢN ALL-IN-ONE (FIX ALL ERRORS)
// ============================================================

const STORE_KEY = 'printerval_roster_data';

// --- 1. LOGIC LƯU TRỮ (Tích hợp sẵn, không import) ---
async function loadStoreMobile() {
  // Lấy plugin an toàn từ window
  const Plugins = window.Capacitor && window.Capacitor.Plugins;
  
  if (!Plugins || !Plugins.Preferences) {
    console.warn("⚠️ [Storage] Preferences plugin chưa sẵn sàng. Trả về data rỗng.");
    return { employees: [], days: {}, teams: [] };
  }

  try {
    const { value } = await Plugins.Preferences.get({ key: STORE_KEY });
    if (value) return JSON.parse(value);
  } catch (e) {
    console.error("❌ [Storage] Lỗi đọc dữ liệu:", e);
  }
  return { employees: [], days: {}, teams: [] };
}

async function saveStoreMobile(data) {
  const Plugins = window.Capacitor && window.Capacitor.Plugins;
  if (!Plugins || !Plugins.Preferences) return;
  
  await Plugins.Preferences.set({
    key: STORE_KEY,
    value: JSON.stringify(data),
  });
}

// --- 2. LOGIC MẠNG NATIVE (Fix lỗi CORS Stats) ---
async function nativeGet(url) {
  const Plugins = window.Capacitor && window.Capacitor.Plugins;

  // Kiểm tra Plugin HTTP Native
  if (!Plugins || !Plugins.CapacitorHttp) {
    console.warn("⚠️ [Http] CapacitorHttp chưa bật! Đang dùng fetch thường (có thể bị lỗi CORS)...");
    const res = await fetch(url);
    return res.json();
  }

  console.log("🚀 [Http] Đang gọi Native Request tới:", url);
  
  // Gọi qua Native Plugin (Bỏ qua CORS)
  const response = await Plugins.CapacitorHttp.get({
    url: url,
    headers: {
      "accept": "application/json, text/plain, */*",
      "token": "f7a5a50d9c6f3218c3baf7b46d76556a",
      // Fake User-Agent để server tưởng là PC
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });

  // Native trả về { status, data, headers }
  if (response.status >= 200 && response.status < 300) {
    // response.data đã là JSON object rồi (do plugin tự parse)
    return response.data;
  } else {
    throw new Error(`Native Http Error: ${response.status}`);
  }
}

// --- 3. ĐỊNH NGHĨA API CHO RENDERER ---
const api = {
  // --- Nhóm Lưu trữ ---
  loadRoster: async () => {
    const data = await loadStoreMobile();
    return { ok: true, employees: data.employees || [], teams: data.teams || [] };
  },

  saveRoster: async ({ employees, teams }) => {
    const data = await loadStoreMobile();
    data.employees = employees;
    data.teams = teams;
    await saveStoreMobile(data);
    return { ok: true };
  },

  saveDayStatus: async ({ dateISO, statuses }) => {
    const data = await loadStoreMobile();
    data.days = data.days || {};
    data.days[dateISO] = { statuses };
    await saveStoreMobile(data);
    return { ok: true };
  },

  loadDayStatus: async ({ dateISO }) => {
    const data = await loadStoreMobile();
    const day = (data.days || {})[dateISO] || { statuses: {} };
    return { ok: true, statuses: day.statuses || {} };
  },

  loadDutyHistory: async () => {
    const data = await loadStoreMobile();
    return { ok: true, history: data.dutyHistory || {} };
  },

  saveDutyHistory: async (history) => {
    const data = await loadStoreMobile();
    data.dutyHistory = history;
    await saveStoreMobile(data);
    return { ok: true };
  },

  saveWeekendPool: async ({ dateISO, remaining, builtFor }) => { 
    const data = await loadStoreMobile();
    data.days = data.days || {};
    data.days[dateISO] = data.days[dateISO] || { statuses: {} };
    data.days[dateISO].weekendPoolRemaining = remaining; 
    data.days[dateISO].weekendPoolBuiltFor = builtFor;  
    await saveStoreMobile(data);
    return { ok: true };
  },

  loadWeekendPool: async ({ dateISO }) => {
    const data = await loadStoreMobile();
    const dayData = (data.days || {})[dateISO]; 
    return { ok: true, remaining: dayData?.weekendPoolRemaining || null, builtFor: dayData?.weekendPoolBuiltFor || null }; 
  },

  // --- Nhóm Tiện ích ---
  copyText: async (text) => {
    if (navigator.clipboard) {
        await navigator.clipboard.writeText(text || '');
        return { ok: true };
    }
    return { ok: false };
  },

  // --- Nhóm Thống kê (Gọi hàm NativeGet ở trên) ---
  getDesignJobStats: async ({ from, to }) => {
    try {
      const url = `https://printerval.com/central/service/pod/design-job-stats/find?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const data = await nativeGet(url);
      // Data trả về từ nativeGet là object kết quả
      return { ok: true, data: { result: data } };
    } catch (error) {
      console.error('Stats fetch error:', error);
      return { ok: false, error: error.message };
    }
  },

  // Stub các hàm không dùng trên Mobile
  setMiniMode: async () => console.log('Mini mode disabled on mobile'),
  exportCsv: async () => { alert('Chưa hỗ trợ CSV'); return { ok: false }; },
  exportTxt: async () => { alert('Chưa hỗ trợ TXT'); return { ok: false }; },
};

// --- 4. EXPOSE RA WINDOW ---
// Đây là bước quan trọng nhất để renderer.js nhìn thấy api
window.api = api;
console.log('✅ Bridge Mobile (All-in-One) đã tải thành công!');