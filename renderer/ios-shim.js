// ==========================================================
// ==   IOS-SHIM.JS (FIXED) - Dùng LocalStorage cho Mobile ==
// ==========================================================

// Chỉ chạy khi không có Electron (tức là đang chạy trên iOS/Android/Web)
// Hoặc ghi đè luôn nếu bridge.js bị lỗi import
(function() {
    console.log("📱 Mobile/Web Mode: Kích hoạt giả lập API qua LocalStorage");

    const STORE_KEY = 'printerval_roster_data';
    const API_TOKEN = "f7a5a50d9c6f3218c3baf7b46d76556a";

    // --- Helpers để đọc/ghi dữ liệu vào bộ nhớ điện thoại ---
    function getStore() {
        try {
            const raw = localStorage.getItem(STORE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            console.error('Lỗi đọc cache:', e);
            return {};
        }
    }

    function saveStore(data) {
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Lỗi lưu cache:', e);
        }
    }

    // --- Định nghĩa window.api (Khớp hoàn toàn với renderer.js) ---
    window.api = {
        // 1. Load danh sách nhân viên & Team
        loadRoster: async () => {
            const data = getStore();
            // Dữ liệu mặc định nếu chưa có gì
            const defaultTeams = [
                { name: 'Lead', color: '#dc2626' },
                { name: 'Vẽ', color: '#a855f7' },
                { name: 'Lịch', color: '#2563eb' },
                { name: 'Đào tạo', color: '#16a34a' },
                { name: '2D', color: '#6b7280' },
            ];
            return { 
                ok: true, 
                employees: data.employees || [], 
                teams: (data.teams && data.teams.length) ? data.teams : defaultTeams 
            };
        },

        // 2. Lưu danh sách
        saveRoster: async ({ employees, teams }) => {
            const data = getStore();
            data.employees = employees;
            data.teams = teams;
            saveStore(data);
            return { ok: true };
        },

        // 3. Load trạng thái ngày (OFF/OT...)
        loadDayStatus: async ({ dateISO }) => {
            const data = getStore();
            const days = data.days || {};
            return { ok: true, statuses: (days[dateISO] || {}).statuses || {} };
        },

        // 4. Lưu trạng thái ngày
        saveDayStatus: async ({ dateISO, statuses }) => {
            const data = getStore();
            data.days = data.days || {};
            // Giữ lại pool nếu đang có, chỉ update statuses
            const currentDay = data.days[dateISO] || {};
            data.days[dateISO] = { ...currentDay, statuses };
            saveStore(data);
            return { ok: true };
        },

        // 5. Load lịch sử trực (Để quay số công bằng)
        loadDutyHistory: async () => {
            const data = getStore();
            return { ok: true, history: data.dutyHistory || {} };
        },

        // 6. Lưu lịch sử trực
        saveDutyHistory: async (history) => {
            const data = getStore();
            data.dutyHistory = history;
            saveStore(data);
            return { ok: true };
        },

        // 7. Load danh sách quay số (Weekend Pool)
        loadWeekendPool: async ({ dateISO }) => {
            const data = getStore();
            const dayData = (data.days || {})[dateISO];
            return { 
                ok: true, 
                remaining: dayData?.weekendPoolRemaining || null,
                builtFor: dayData?.weekendPoolBuiltFor || null
            };
        },

        // 8. Lưu danh sách quay số
        saveWeekendPool: async ({ dateISO, remaining, builtFor }) => {
            const data = getStore();
            data.days = data.days || {};
            data.days[dateISO] = data.days[dateISO] || { statuses: {} };
            
            data.days[dateISO].weekendPoolRemaining = remaining;
            data.days[dateISO].weekendPoolBuiltFor = builtFor;
            
            saveStore(data);
            return { ok: true };
        },

        // 9. Copy Text (Clipboard)
        copyText: async (text) => {
            try {
                // Thử dùng API chuẩn
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(text);
                } else {
                    // Fallback cho một số webview cũ
                    const textArea = document.createElement("textarea");
                    textArea.value = text;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand("copy");
                    document.body.removeChild(textArea);
                }
                return { ok: true };
            } catch (e) {
                console.warn('Copy failed:', e);
                return { ok: false };
            }
        },

        // 10. Xuất file (Trên mobile chỉ hiện alert hoặc copy)
        exportTxt: async ({ content }) => {
            await window.api.copyText(content);
            alert("Đã copy nội dung báo cáo vào bộ nhớ đệm!\nBạn có thể dán sang ghi chú.");
            return { ok: true };
        },
        exportCsv: async () => {
            alert("Tính năng CSV chưa hỗ trợ trên Mobile."); 
            return { ok: false };
        },

        // 11. Cài đặt Mini Mode (Không có tác dụng trên mobile)
        setMiniMode: async () => { 
            console.log('Mobile: setMiniMode ignored'); 
        },

        // 12. Lấy thống kê từ Server (Fetch trực tiếp)
        getDesignJobStats: async ({ from, to }) => {
            try {
                const url = `https://printerval.com/central/service/pod/design-job-stats/find?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
                const res = await fetch(url, {
                    method: 'GET',
                    headers: { 
                        "accept": "application/json", 
                        "token": API_TOKEN 
                    }
                });
                if (!res.ok) throw new Error('Lỗi kết nối Server');
                const json = await res.json();
                return { ok: true, data: { result: json } };
            } catch (error) {
                console.error('Stats error:', error);
                return { ok: false, error: error.message };
            }
        }
    };

    // Mock window.cloud để tránh lỗi nếu renderer có gọi (dù mobile ít dùng)
    window.cloud = null; 

    console.log("✅ IOS-SHIM: window.api đã sẵn sàng!");
})();