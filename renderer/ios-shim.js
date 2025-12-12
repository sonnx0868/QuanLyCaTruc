// =================================================================
// ==   IOS-SHIM.JS (CLOUD VERSION) - Kết nối Server Sonnx-Pod    ==
// =================================================================

(function() {
    console.log("☁️ Kích hoạt chế độ Cloud API cho Mobile/Web");

    const SERVER_URL = 'https://employee-roster-api.sonnx-pod.workers.dev';
    const API_TOKEN = "f7a5a50d9c6f3218c3baf7b46d76556a"; // Token dùng cho API thống kê

    // --- 1. Hàm gọi API (Fetch Wrapper) ---
    // Hàm này thay thế cho thư viện import bị lỗi
    async function j(method, path, body) {
        try {
            const r = await fetch(`${SERVER_URL}${path}`, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: body ? JSON.stringify(body) : undefined,
            });
            if (!r.ok) {
                // Nếu server báo lỗi (ví dụ chưa có data ngày đó), trả về null hoặc object rỗng
                return null;
            }
            return await r.json();
        } catch (e) {
            console.error(`Lỗi kết nối Cloud [${path}]:`, e);
            return null;
        }
    }

    // --- 2. Helper LocalStorage (Cho những tính năng Server không hỗ trợ) ---
    // Dùng để lưu lịch sử quay số, vì API server không thấy có endpoint này
    function localGet(key) {
        try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; }
    }
    function localSet(key, val) {
        localStorage.setItem(key, JSON.stringify(val));
    }

    // --- 3. Định nghĩa window.api (Giả lập Electron IPC) ---
    window.api = {
        
        // === QUAN TRỌNG: Lấy nhân viên từ Cloud ===
        loadRoster: async () => {
            console.log("Đang tải danh sách từ Cloud...");
            try {
                // Gọi song song cả API lấy nhân viên và API lấy Team
                const [emps, teams] = await Promise.all([
                    j('GET', '/employees'),
                    j('GET', '/teams')
                ]);

                // Nếu Cloud chưa có team, dùng mặc định
                const defaultTeams = [
                    { name: 'Lead', color: '#dc2626' },
                    { name: 'Vẽ', color: '#a855f7' },
                    { name: 'Lịch', color: '#2563eb' },
                    { name: 'Đào tạo', color: '#16a34a' },
                    { name: '2D', color: '#6b7280' },
                ];

                return { 
                    ok: true, 
                    employees: emps || [], 
                    teams: (teams && teams.length) ? teams : defaultTeams 
                };
            } catch (e) {
                alert("Không tải được dữ liệu từ Server. Kiểm tra mạng!");
                return { ok: false, employees: [], teams: [] };
            }
        },

        // === Lưu nhân viên lên Cloud ===
        saveRoster: async ({ employees, teams }) => {
            console.log("Đang lưu danh sách lên Cloud...");
            // Gọi API Bulk Replace và Save Teams
            await Promise.all([
                j('PUT', '/employees', employees),
                j('PUT', '/teams', { teams })
            ]);
            return { ok: true };
        },

        // === Lấy trạng thái điểm danh (OFF/OT) từ Cloud ===
        loadDayStatus: async ({ dateISO }) => {
            const data = await j('GET', `/day-status/${dateISO}`);
            return { ok: true, statuses: data?.statuses || {} };
        },

        // === Lưu trạng thái điểm danh lên Cloud ===
        saveDayStatus: async ({ dateISO, statuses }) => {
            await j('PUT', `/day-status/${dateISO}`, { statuses });
            return { ok: true };
        },

        // --- Các phần dưới này lưu ở LocalStorage (Do server thiếu API) ---
        
        loadDutyHistory: async () => {
            return { ok: true, history: localGet('dutyHistory') };
        },

        saveDutyHistory: async (history) => {
            localSet('dutyHistory', history);
            return { ok: true };
        },

        loadWeekendPool: async ({ dateISO }) => {
            const allDays = localGet('weekend_pools');
            const dayData = allDays[dateISO] || {};
            return { ok: true, remaining: dayData.remaining, builtFor: dayData.builtFor };
        },

        saveWeekendPool: async ({ dateISO, remaining, builtFor }) => {
            const allDays = localGet('weekend_pools');
            allDays[dateISO] = { remaining, builtFor };
            localSet('weekend_pools', allDays);
            return { ok: true };
        },

        // --- Các tiện ích khác (Giữ nguyên) ---
        copyText: async (text) => {
            if (navigator.clipboard) await navigator.clipboard.writeText(text);
            return { ok: true };
        },
        exportTxt: async ({ content }) => {
            await window.api.copyText(content);
            alert("Đã copy báo cáo vào bộ nhớ tạm!");
            return { ok: true };
        },
        exportCsv: async () => { alert("Chưa hỗ trợ CSV"); return { ok: false }; },
        setMiniMode: async () => {},

        getDesignJobStats: async ({ from, to }) => {
            try {
                const url = `https://printerval.com/central/service/pod/design-job-stats/find?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
                const res = await fetch(url, { headers: { "accept": "application/json", "token": API_TOKEN } });
                return { ok: true, data: { result: await res.json() } };
            } catch (e) {
                return { ok: false, error: e.message };
            }
        }
    };

    // Mock window.cloud để renderer.js không bị lỗi nếu lỡ gọi
    window.cloud = {
        listEmployees: () => j('GET', '/employees'),
        bulkReplace: (list) => j('PUT', '/employees', list),
        getTeams: () => j('GET', '/teams'),
        saveTeams: (teams) => j('PUT', '/teams', { teams }),
        getDayStatus: (d) => j('GET', `/day-status/${d}`),
        saveDayStatus: (d, s) => j('PUT', `/day-status/${d}`, { statuses: s }),
    };

    console.log("✅ IOS-SHIM: Đã kết nối Server Cloud!");
})();