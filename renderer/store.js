// File: store.js (Phiên bản cho iPad/Capacitor)
import { Preferences } from '@capacitor/preferences';

const STORE_KEY = 'printerval_roster_data';

// Hàm tải dữ liệu (Thay thế loadStore)
export async function loadStore() {
  const { value } = await Preferences.get({ key: STORE_KEY });
  if (value) {
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error("Lỗi parse dữ liệu:", e);
    }
  }
  // Dữ liệu mặc định nếu chưa có gì
  return { employees: [], days: {}, teams: [] };
}

// Hàm lưu dữ liệu (Thay thế saveStore)
export async function saveStore(data) {
  await Preferences.set({
    key: STORE_KEY,
    value: JSON.stringify(data),
  });
}