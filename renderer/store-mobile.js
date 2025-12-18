// store-mobile.js - Phiên bản KHÔNG CẦN BUNDLER
// Dùng biến global Capacitor.Plugins thay vì import

const STORE_KEY = 'printerval_roster_data';

// Lấy plugin từ global (được Native Bridge tiêm vào)
function getPrefs() {
  return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Preferences;
}

export async function loadStore() {
  const Preferences = getPrefs();
  if (!Preferences) {
    console.warn("⚠️ Chưa load được Plugin Preferences");
    return { employees: [], days: {}, teams: [] };
  }
  
  const { value } = await Preferences.get({ key: STORE_KEY });
  if (value) {
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error("Lỗi đọc JSON:", e);
    }
  }
  return { employees: [], days: {}, teams: [] };
}

export async function saveStore(data) {
  const Preferences = getPrefs();
  if (!Preferences) return;
  
  await Preferences.set({
    key: STORE_KEY,
    value: JSON.stringify(data),
  });
}