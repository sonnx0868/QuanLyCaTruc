// renderer/ios-shim.js

// Chỉ chạy khi không có Electron (tức là đang chạy trên iOS/Android)
if (!window.electronAPI) {
    console.log("Đang chạy trên Mobile - Kích hoạt chế độ giả lập API");

    const API_TOKEN = "f7a5a50d9c6f3218c3baf7b46d76556a";

    // Hàm tiện ích để lưu/lấy data từ bộ nhớ điện thoại
    const db = {
        get: (key, def) => {
            const val = localStorage.getItem(key);
            return val ? JSON.parse(val) : def;
        },
        set: (key, val) => localStorage.setItem(key, JSON.stringify(val))
    };

    window.electronAPI = {
        // 1. Giả lập logic lấy lịch sử trực
        invoke: async (channel, data) => {
            console.log(`[Mobile] Gọi lệnh: ${channel}`, data);

            switch (channel) {
                // --- NHÓM LOGIC LƯU TRỮ (Dùng LocalStorage) ---
                case 'store:load-duty-history':
                    return { ok: true, history: db.get('dutyHistory', {}) };
                
                case 'store:save-duty-history':
                    db.set('dutyHistory', data);
                    return { ok: true };

                case 'roster:load':
                    return db.get('roster_data', {
                        ok: true,
                        employees: [],
                        teams: [
                            { name: 'Lead', color: '#dc2626' },
                            { name: 'Vẽ', color: '#a855f7' },
                            { name: 'Lịch', color: '#2563eb' },
                            { name: 'Đào tạo', color: '#16a34a' },
                            { name: '2D', color: '#6b7280' },
                        ]
                    });

                case 'roster:save':
                    db.set('roster_data', { ok: true, employees: data.employees, teams: data.teams });
                    return { ok: true };

                case 'store:load-day-status':
                    const allDays = db.get('day_statuses', {});
                    return { ok: true, statuses: (allDays[data.dateISO] || {}).statuses || {} };

                case 'store:save-day-status':
                    const days = db.get('day_statuses', {});
                    days[data.dateISO] = { statuses: data.statuses };
                    db.set('day_statuses', days);
                    return { ok: true };
                
                case 'store:load-weekend-pool':
                    const wDays = db.get('day_statuses', {});
                    const wDay = wDays[data.dateISO] || {};
                    return { ok: true, remaining: wDay.weekendPoolRemaining, builtFor: wDay.weekendPoolBuiltFor };

                case 'store:save-weekend-pool':
                    const wDaysSave = db.get('day_statuses', {});
                    if(!wDaysSave[data.dateISO]) wDaysSave[data.dateISO] = { statuses: {} };
                    wDaysSave[data.dateISO].weekendPoolRemaining = data.remaining;
                    wDaysSave[data.dateISO].weekendPoolBuiltFor = data.builtFor;
                    db.set('day_statuses', wDaysSave);
                    return { ok: true };

                // --- NHÓM LOGIC GỌI SERVER (Dùng fetch) ---
                case 'stats:get-design-jobs':
                    try {
                        const url = `https://printerval.com/central/service/pod/design-job-stats/find?from=${encodeURIComponent(data.from)}&to=${encodeURIComponent(data.to)}`;
                        const res = await fetch(url, {
                            method: 'GET',
                            headers: { "accept": "application/json", "token": API_TOKEN }
                        });
                        if (!res.ok) throw new Error('Network error');
                        return { ok: true, data: await res.json() };
                    } catch (e) {
                        return { ok: false, error: e.message };
                    }

                // --- NHÓM LOGIC XUẤT FILE (SỬA LỖI POPUP Ở ĐÂY) ---
                // Thay vì hiện popup lưu file, ta sẽ copy nội dung vào bộ nhớ đệm và hiện thông báo
                case 'export:csv':
                    const csvContent = 'Name\n' + data.eveningNames.join('\n'); // Ví dụ đơn giản
                    await navigator.clipboard.writeText(csvContent);
                    alert(`Đã copy danh sách trực tối (${data.eveningNames.length} người) vào bộ nhớ đệm!\nBạn có thể dán vào Excel/Note.`);
                    return { ok: true };

                case 'export:txt':
                    await navigator.clipboard.writeText(data.content);
                    alert("Đã copy nội dung file TXT vào bộ nhớ đệm!");
                    return { ok: true };

                // --- CÁC HÀM KHÁC ---
                case 'utils:copy-text':
                    await navigator.clipboard.writeText(data);
                    return { ok: true };

                case 'window:set-mini-mode':
                    console.log('Mobile không hỗ trợ mini mode');
                    return { ok: true };

                default:
                    console.warn(`Chưa giả lập channel: ${channel}`);
                    return { ok: false, error: 'Chưa hỗ trợ trên Mobile' };
            }
        }
    };
}