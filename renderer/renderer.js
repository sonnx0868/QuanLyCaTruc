// =============================================================================
// ==                  PHIÊN BẢN HOÀN CHỈNH - RENDERER.JS                      ==
// =============================================================================

// === 1. KHAI BÁO BIẾN & HẰNG SỐ ===

// A. Helper
const $ = (s) => document.querySelector(s);

const tbody = $('#tbody');
const tableWrap = $('#tableWrap');
const datePicker = $('#datePicker');
const searchInput = $('#searchInput');
const emptyStateEl = $('#emptyState');

// --- Modals ---
const empModal = $('#empModal');
const dlg = $('#teamDialog');
const exportModal = $('#exportModal');
const pasteModal = $('#pasteModal');
// --- Team Dialog Modal Elements ---
const dlgBackdrop = $('#teamDialogClose'); // <-- BỔ SUNG DÒNG NÀY
const dlgX = $('#teamDialogX');           // <-- BỔ SUNG DÒNG NÀY
const teamDialogBody = dlg.querySelector('.modal-body');
const employeeListBox = $('#allEmployees');
const tabContentContainer = $('#teamTabContent');

// --- Employee Modal Elements (cập nhật cho đầy đủ) ---
const btnEmpOpen   = $('#btnOpenEmpModal');
const empTitle = $('#empModalTitle');
const empName  = $('#empModalName');
const empTeam  = $('#empModalTeam');
const btnEmpSave   = $('#empModalSave');
const btnEmpCancel = $('#empModalCancel');
const empModalX    = $('#empModalX');
const empBackdrop  = $('#empModalBackdrop');

// --- Export Modal Elements (cập nhật cho đầy đủ) ---
const btnOpenExportModal = $('#btnOpenExportModal');
const btnConfirmExport = $('#btnConfirmExport');

const winnerModal = $('#winnerModal');
const winnerNameDisplay = $('#winnerNameDisplay');
const winnerDetailDisplay = $('#winnerDetailDisplay');
const btnCloseWinner = $('#btnCloseWinner');
const winnerBackdrop = $('#winnerBackdrop');

// C. State Variables
let statusChartInstance = null;
let teamChartInstance = null;
let statsChartInstance = null;
let statsAutoReloadInterval = null;
const statsCache = {};
let activeTeamTab = null;
let isMiniMode = false;
let draggedEmployeeName = null;
let filterText = '';
let editingOldName = null;
let currentSortMode = 'custom_fixed';
let __confettiFrame = null;
let __confettiActive = false;
let dutyHistory = {}; // <-- THÊM DÒNG NÀY
let toastTimer;
let weekendAutoRefreshTimer = null; // <--- THÊM BIẾN NÀY
const debouncedSaveRoster = debounce(saveRosterLocal, 500);
const state = {
  employees: [],
  teams: [], // Sẽ được load từ server hoặc local
  statuses: {},
  dateISO: ''
};

const CUSTOM_NAME_ORDER_LIST = [
  'Tăng Duy Khánh', 'Ngô Sĩ Hùng', 'Hà Duy Nam', 'Nguyễn Xuân Vinh', 'Lê Minh Hiếu', 
  'Đoàn Thanh Huyền', 'Trần Hồng Quân', 'Đỗ Thị Thảo', 'Phạm Thị Lan Phương - Online', 
  'Trần Đức Tuấn', 'Hoàng Anh Toàn', 'Nguyễn Hải Nam', 'Nguyễn Dạ Thảo', 'Đặng Ngọc Huyền Trinh', 
  'Nguyễn Xuân Duy', 'Vũ Thị Huyền Trang - 2k', 'Trần Thị Huyền Trang', 'Vũ Tiến Đạt', 
  'Hoàng Yến Linh', 'Nguyễn Ánh Dương', 'Lê Quang Huy', 'Vũ Minh Trí', 'Phan Nhật Anh', 
  'Kiều Quang Khanh', 'Đỗ Đắc Đức', 'Nguyễn Đức Huy', 'Trần Ngọc Trà My - Online', 
  'Chu Hoàng Nam', 'Nguyễn Phương Thúy', 'Nguyễn Xuân Sơn (NXS)', 'Trần Thị Thùy Trang', 
  'Nguyễn Văn Tú 01 (NVT)', 'Trần Kim Đức - Online', 'Mai Hồng Khanh', 'Hoàng Thị Thùy Linh', 
  'Nguyễn Thị Nga', 'Nguyễn Kim Hoàng', 'Nguyễn Anh Tú', 'Nguyễn Quang Duy', 
  'Nguyễn Thị Hằng Ngân', 'Bùi Thị Tú Anh', 'Bùi Văn Tân', 'Phạm Thị Hồng Nhung - Online', 
  'Nguyễn Đức Công', 'Trần Ngọc Trung Hiếu', 'Phạm Văn Trường', 'Phạm Minh Hiếu (PMH) - Vẽ', 
  'Đặng Ngọc Long (ĐNL)', 'Nguyễn Ngọc Ánh (NNA)', 'Lê Thị Quyên (LTQ)', 'Bùi Thu Phương (BTP)', 
  'Nguyễn Trung Hưởng (NTH)', 'Nguyễn Thục Mỹ (NTM) - Vẽ', 'Nguyễn Thị Diệp (NTD)', 
  'Nguyễn Hoàng Huy (NHH)', 'Nguyễn Văn Định (NVD)', 'Đỗ Minh Quyền (ĐMQ)', 
  'Vũ Văn Ninh (VVN)', 'Nguyễn Ngọc Phụng (NNP)', 'Nguyễn Văn Lịch (NVL)', 
  'Trịnh Thu Hà (TTH)', 'Nguyễn Thị Thúy (NTT2)', 'Nguyễn Hoàng Phương - 2D - Video', 
  'Vũ Thu Uyên (VTU)', 'Nguyễn Ngọc Duy (NND)'
];

// Tạo một Map để tra cứu thứ tự nhanh
const CUSTOM_NAME_ORDER_MAP = new Map(
  CUSTOM_NAME_ORDER_LIST.map((name, index) => [name, index])
);

const WEEKEND_EXCLUDED_TEAMS = new Set(['Vẽ', 'Lead']);

// 2. THÊM "Đào tạo" vào danh sách cấm HC (giống "Mockup - Ideal")
const HC_WEEKEND_EXCLUDED_TEAMS = new Set(['Mockup - Ideal', 'Đào tạo']);
const weekendPool = {
  original: [],   // [{name, team, evening:boolean, onl:boolean}]
  remaining: [],  // mảng còn lại để quay
  dateISO: null,  // sync theo ngày đang chọn
  builtFor: null,
};

// D. Constants
const TEAM_ORDER = ['Lead', 'Vẽ', 'Lịch', 'Đào tạo', '2D'];
const EXCLUDED_TEAMS = new Set(['Vẽ', 'Lead']);

// === 2. CÁC HÀM LOGIC CHÍNH ===

function normalizeEmployee(emp) {
  if (typeof emp === 'string') return { name: emp, team: '2D' };
  return { name: emp.name, team: emp.team || '2D' };
}

function ensureEmpObject(e) {
  return (typeof e === 'string') ? { name: e, team: '' } : { name: e.name, team: e.team || '' };
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 2500);
}

function offSuffix(st){
  if (!st?.off) return '';
  const s = (st.offShift || '').toLowerCase();
  if (s === 'morning' || s === 'sáng') return ' OFF sáng';
  if (s === 'afternoon' || s === 'chiều') return ' OFF chiều';
  return ' OFF';
}

function normStatus(st0) {
  // SỬA `ot: null` THÀNH `ot: []`
  const st = { off: null, evening: false, ot: [], ...(st0 || {}) };
  if (typeof st.off === 'boolean') st.off = st.off ? 'allday' : null;
  return st;
}

function isEveningAllowed(off) {
  return !(off === 'afternoon' || off === 'allday');
}

function todayISO() {
  const now = new Date();
  // Sử dụng Intl.DateTimeFormat để định dạng ngày theo múi giờ cụ thể.
  // Locale 'en-CA' có định dạng chuẩn YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
}

function getTimeValueMinutes(timeStr) {
  if (!timeStr) return 0;
  // Chuẩn hóa dấu phân cách
  const [hStr, mStr] = timeStr.replace('h', ':').split(':');
  let h = parseInt(hStr || '0', 10);
  let m = parseInt(mStr || '0', 10);
  
  // Xử lý qua đêm: 1h sáng -> 25h, 2h sáng -> 26h... để so sánh được với 21h, 22h
  if (h < 6) h += 24; 
  
  return h * 60 + m;
}

// Lấy số phút hiện tại (có xử lý qua đêm)
function getCurrentMinutesAdjusted() {
  const now = new Date();
  
  // Ép lấy giờ theo múi giờ Hồ Chí Minh, định dạng 24h (HH:mm:ss)
  // Sử dụng locale 'en-GB' để đảm bảo format luôn là HH:mm:ss
  const vnTimeStr = now.toLocaleTimeString('en-GB', { 
    timeZone: 'Asia/Ho_Chi_Minh', 
    hour12: false 
  });
  
  const [hStr, mStr] = vnTimeStr.split(':');
  let h = parseInt(hStr, 10);
  let m = parseInt(mStr, 10);

  // Logic qua đêm tương tự: Nếu hiện tại là 1h sáng VN -> tính là 25h
  if (h < 6) h += 24;

  return h * 60 + m;
}

function getFirstName(fullName) {
  if (!fullName) return '';
  const parts = fullName.trim().split(' ');
  // Lấy từ cuối cùng của tên
  return parts[parts.length - 1] || '';
}

// --- Data Sorting ---
function compareTeamNames(a, b) {
  const teamA = a.name || '';
  const teamB = b.name || '';
  const indexA = TEAM_ORDER.indexOf(teamA);
  const indexB = TEAM_ORDER.indexOf(teamB);
  if (indexA !== -1 && indexB !== -1) return indexA - indexB;
  if (indexA !== -1) return -1;
  if (indexB !== -1) return 1;
  return teamA.localeCompare(teamB, 'vi');
}

function startConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;

  // 👉 Bật canvas khi dùng và chỉ lúc này mới nhận click
  canvas.style.display = 'block';
  canvas.style.pointerEvents = 'auto';

  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const pieces = Array.from({ length: 150 }).map(() => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    w: 6 + Math.random() * 5,
    h: 8 + Math.random() * 7,
    color: `hsl(${Math.random() * 360}, 100%, 50%)`,
    speed: 3 + Math.random() * 5,
    tilt: Math.random() * 10,
  }));

  __confettiActive = true;

  function update() {
    if (!__confettiActive) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.tilt * Math.PI / 180);
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
      p.y += p.speed;
      p.tilt += 5;
      if (p.y > canvas.height + 20) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
      }
    });
    __confettiFrame = requestAnimationFrame(update);
  }
  update();

  // Click để tắt pháo hoa
  const onClick = () => stopConfetti();
  canvas.addEventListener('click', onClick, { once: true });

  // Lưu cleanup để stopConfetti gọi
  canvas.__confettiCleanup = () => {
    canvas.removeEventListener('click', onClick);
    window.removeEventListener('resize', resize);
  };
}

async function fetchDataForRange(days) {
  // [SỬA ĐỔI] Tạo một đối tượng Date đại diện cho thời điểm hiện tại ở Việt Nam
  const todayInVietnam = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));

  const dates = Array.from({ length: days }, (_, i) => {
    const d = new Date(todayInVietnam); // Bắt đầu từ ngày hôm nay ở VN
    d.setDate(d.getDate() - (days - 1 - i));
    return d;
  });

  const promises = dates.map(date => {
    // Để định dạng YYYY-MM-DD, ta dùng lại hàm todayISO đã sửa ở trên nhưng với date cụ thể
    const dateString = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh', // Giữ timezone để đảm bảo tính đúng
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);

    return window.api.getDesignJobStats({
      from: `${dateString} 00:00`,
      to: `${dateString} 23:59`,
    });
  });

  const results = await Promise.all(promises);

  // Chuẩn bị đối tượng để trả về
  const dataPackage = {
    labels: dates.map(d => d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit' })),
    total: [],
    '2d': [],
    '3d': [],
    lastDayResult: null
  };

  results.forEach((res, index) => {
    const result = res.ok ? res.data?.result : null;
    dataPackage.total.push(result?.total_jobs || 0);
    dataPackage['2d'].push(result?.jobs_2d || 0);
    dataPackage['3d'].push(result?.jobs_3d || 0);
    if (index === results.length - 1) {
      dataPackage.lastDayResult = result;
    }
  });

  return dataPackage;
}

async function reloadTodayStats() {
  const reloadBtn = $('#btnReloadStats');
  if (!statsChartInstance || reloadBtn.disabled) return;

  const originalText = reloadBtn.innerHTML;
  reloadBtn.disabled = true;
  reloadBtn.innerHTML = 'Đang tải...';

  try {
    // SỬA LỖI TẠI ĐÂY: Đổi tên biến để không trùng với tên hàm
    const todayISOString = todayISO(); 
    
    const res = await window.api.getDesignJobStats({
      from: `${todayISOString} 00:00`, // Dùng tên biến mới
      to: `${todayISOString} 23:59`,   // Dùng tên biến mới
    });

    if (res.ok && res.data.result) {
      const result = res.data.result;
      const lastIndex = statsChartInstance.data.labels.length - 1;

      // Cập nhật dữ liệu trong biểu đồ
      statsChartInstance.data.datasets[0].data[lastIndex] = result.jobs_2d || 0;
      statsChartInstance.data.datasets[1].data[lastIndex] = result.jobs_3d || 0;
      statsChartInstance.update();

      // Cập nhật dòng text trạng thái
      $('#statsToday').textContent = `Ngày gần nhất: ${result.total_jobs} (2D: ${result.jobs_2d}, 3D: ${result.jobs_3d})`;
      
      // Cập nhật bộ nhớ cache để lần mở lại sau có dữ liệu mới
      const activeButton = document.querySelector('.range-btn.active');
      const days = activeButton ? parseInt(activeButton.dataset.days, 10) : 7;
      if (statsCache[days]) {
        const cachedData = statsCache[days];
        cachedData['2d'][lastIndex] = result.jobs_2d || 0;
        cachedData['3d'][lastIndex] = result.jobs_3d || 0;
        cachedData.total[lastIndex] = result.total_jobs || 0;
        cachedData.lastDayResult = result;
      }
    } else {
      throw new Error('API không trả về dữ liệu.');
    }
  } catch (error) {
    console.error('Lỗi khi tải lại thống kê:', error);
    showToast('Tải lại thất bại.');
  } finally {
    reloadBtn.disabled = false;
    reloadBtn.innerHTML = originalText;
  }
}

function getLiveWeekendCandidates() {
  const allCandidates = weekendPool.remaining || [];
  const nowMins = getCurrentMinutesAdjusted();

  // Cấu hình giờ kết thúc (Tính theo phút)
  const TIME_HC_END  = getTimeValueMinutes("17:00"); // Hành chính kết thúc 17h00
  const TIME_EVE_END = getTimeValueMinutes("21:00"); // Chiều tối kết thúc 22h00

  const liveList = [];

  allCandidates.forEach(p => {
    // 1. Kiểm tra trạng thái HC (ONL hoặc OFF nửa ngày)
    // [SỬA ĐỔI QUAN TRỌNG]: Cho phép cả người OFF sáng/chiều được tính là đang làm HC
    // (Miễn là họ đã lọt được vào pool lọc theo giờ ở bước buildWeekendPoolFromState)
    const isHalfDayOff = (p.off === 'morning' || p.off === 'afternoon');
    const isHcStillActive = (p.onl || isHalfDayOff) && (nowMins < TIME_HC_END);
    
    // 2. Kiểm tra trạng thái Chiều tối
    const isEveStillActive = p.evening && (nowMins < TIME_EVE_END);

    // 3. Kiểm tra danh sách OT
    const rawOtShifts = (p.otShifts || []).filter(shift => {
      const shiftEndMins = getTimeValueMinutes(shift.end);
      return nowMins < shiftEndMins; 
    });

    const activeOtShifts = rawOtShifts.sort((a, b) => {
      return getTimeValueMinutes(a.start) - getTimeValueMinutes(b.start);
    });

    // 4. Nếu nhân viên còn ít nhất 1 loại trạng thái hiệu lực -> Hiển thị
    if (isHcStillActive || isEveStillActive || activeOtShifts.length > 0) {
      liveList.push({
        ...p,
        // Các cờ này dùng để render giao diện (ẩn/hiện tag)
        displayOnl: isHcStillActive,      
        displayEve: isEveStillActive,     
        displayOt: activeOtShifts         
      });
    }
  });

  return liveList;
}

function updateChart(chartData) {
  const { labels, total } = chartData;
  const ctx = document.getElementById('statsChart').getContext('2d');

  // Tính toán mốc Y-axis
  const maxTotal = total.length > 0 ? Math.max(...total) : 0;
  
  // =====================================================================
  // ==                👇 BẮT ĐẦU PHẦN CHỈNH SỬA CHÍNH 👇                 ==
  // =====================================================================
  // [SỬA ĐỔI THEO YÊU CẦU]
  // Mốc Y-axis = (Số đơn cao nhất + 500), sau đó làm tròn lên mốc 500 gần nhất
  const paddedMax = maxTotal + 500;
  let yAxisMax = Math.ceil(paddedMax / 500) * 500; 
  
  if (yAxisMax === 0) {
    yAxisMax = 500; // Đặt mốc tối thiểu là 500 (thay vì 1000)
  }
  // ===================================================================
  // ==                  ☝️ KẾT THÚC PHẦN CHỈNH SỬA ☝️                 ==
  // ===================================================================

  if (statsChartInstance) {
    // Cập nhật biểu đồ đã có
    statsChartInstance.data.labels = labels;
    statsChartInstance.data.datasets[0].data = chartData['2d'];
    statsChartInstance.data.datasets[1].data = chartData['3d'];
    statsChartInstance.options.scales.y.max = yAxisMax;
    statsChartInstance.update();
  } else {
    // Tạo biểu đồ mới
    statsChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: '2D', data: chartData['2d'], backgroundColor: '#16a34a' },
          { label: '3D', data: chartData['3d'], backgroundColor: '#f97316' }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12 } },
          title: { display: false },
          datalabels: {
            display: (context) => context.datasetIndex === 1,
            formatter: (value, context) => {
              const total = context.chart.data.datasets.reduce((sum, ds) => sum + (ds.data[context.dataIndex] || 0), 0);
              return total > 0 ? total : '';
            },
            anchor: 'end',
            align: 'end',
            offset: 8,
            color: '#1d1d1f',
            font: { weight: 'bold', size: 11 },
          }
        },
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true, max: yAxisMax },
        }
      },
      plugins: [ChartDataLabels],
    });
  }
}

async function fetchAndRenderStatsChart(days = 7) {
  const statsTodayEl = document.getElementById('statsToday');
  if (!statsTodayEl) return;

  // KIỂM TRA CACHE TRƯỚC KHI LÀM BẤT CỨ ĐIỀU GÌ
  if (statsCache[days]) {
    console.log(`[Cache] Dùng dữ liệu cache cho ${days} ngày.`);
    const dataPackage = statsCache[days];
    
    // Cập nhật text và vẽ biểu đồ từ cache
    const { lastDayResult } = dataPackage;
    if (lastDayResult) {
      statsTodayEl.textContent = `Ngày gần nhất: ${lastDayResult.total_jobs} (2D: ${lastDayResult.jobs_2d}, 3D: ${lastDayResult.jobs_3d})`;
    } else {
      statsTodayEl.textContent = 'Không có dữ liệu (từ cache).';
    }
    updateChart(dataPackage);
    return; // Dừng lại, không fetch nữa
  }

  // Nếu không có cache, tiếp tục quá trình fetch
  statsTodayEl.textContent = `Đang tải dữ liệu ${days} ngày...`;
  try {
    // Gọi hàm lấy dữ liệu
    const dataPackage = await fetchDataForRange(days);

    // LƯU VÀO CACHE để dùng cho lần sau
    statsCache[days] = dataPackage;
    console.log(`[API] Đã fetch và lưu cache cho ${days} ngày.`);

    // Gọi hàm vẽ biểu đồ
    updateChart(dataPackage);

    // Cập nhật dòng text trạng thái
    const { lastDayResult } = dataPackage;
    if (lastDayResult) {
      statsTodayEl.textContent = `Ngày gần nhất: ${lastDayResult.total_jobs} (2D: ${lastDayResult.jobs_2d}, 3D: ${lastDayResult.jobs_3d})`;
    } else {
      statsTodayEl.textContent = 'Không có dữ liệu.';
    }

  } catch (error) {
    console.error('Lỗi fetch/render biểu đồ thống kê:', error);
    statsTodayEl.textContent = 'Lỗi khi tải thống kê.';
  }
}

function startConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;

  // 👉 Bật canvas khi dùng và chỉ lúc này mới nhận click
  canvas.style.display = 'block';
  canvas.style.pointerEvents = 'auto';

  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const pieces = Array.from({ length: 150 }).map(() => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    w: 6 + Math.random() * 5,
    h: 8 + Math.random() * 7,
    color: `hsl(${Math.random() * 360}, 100%, 50%)`,
    speed: 3 + Math.random() * 5,
    tilt: Math.random() * 10,
  }));

  __confettiActive = true;

  function update() {
    if (!__confettiActive) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.tilt * Math.PI / 180);
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
      p.y += p.speed;
      p.tilt += 5;
      if (p.y > canvas.height + 20) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
      }
    });
    __confettiFrame = requestAnimationFrame(update);
  }
  update();

  // Click để tắt pháo hoa
  const onClick = () => stopConfetti();
  canvas.addEventListener('click', onClick, { once: true });

  // Lưu cleanup để stopConfetti gọi
  canvas.__confettiCleanup = () => {
    canvas.removeEventListener('click', onClick);
    window.removeEventListener('resize', resize);
  };
}

function stopConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  __confettiActive = false;
  if (__confettiFrame) cancelAnimationFrame(__confettiFrame);
  __confettiFrame = null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 👉 Tắt canvas hoàn toàn và ngưng bắt sự kiện
  canvas.style.pointerEvents = 'none';
  canvas.style.display = 'none';

  if (typeof canvas.__confettiCleanup === 'function') {
    canvas.__confettiCleanup();
    canvas.__confettiCleanup = null;
  }
}

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function spinAnimate(rows, targetIndex) {
  if (!rows.length) return;

  const container = document.getElementById('weekendList'); // khung cuộn
  const centerIntoView = (el) => {
    if (!container || !el) return;
    // Tính vị trí để dòng nằm giữa ngay lập tức (không smooth)
    const top = el.offsetTop - (container.clientHeight - el.offsetHeight) / 2;
    container.scrollTop = Math.max(0, Math.min(top, container.scrollHeight));
  };

  // ⚡ Tối ưu: Giảm số vòng quay xuống còn khoảng 0.5 vòng + quãng đường tới target
  const loopsFactor = 0.5; // <-- Giảm từ 0.8 để quay nhanh hơn
  const baseLoops = Math.floor(loopsFactor * rows.length);
  const totalSteps = baseLoops + targetIndex;

  let i = 0, idx = 0, prev = -1;

  // 🔧 Điều chỉnh delay để bắt đầu nhanh và hãm phanh gấp hơn
  let delay = 25; // Bắt đầu nhanh hơn một chút
  const knee1 = Math.floor(totalSteps * 0.4); // Bắt đầu tăng delay sớm hơn
  const knee2 = Math.floor(totalSteps * 0.75); // Bắt đầu hãm phanh

  while (i <= totalSteps) {
    // Tắt highlight ở dòng trước
    if (prev >= 0) rows[prev].classList.remove('active');

    // Highlight dòng hiện tại
    const row = rows[idx];
    row.classList.add('active');
    prev = idx;

    // Cuộn ngay để giữ dòng luôn ở giữa
    centerIntoView(row);

    // Điều chỉnh tốc độ quay: nhanh ở đầu, chậm dần về cuối
    if (i > knee1) delay += 6;
    if (i > knee2) delay += 15;
    if (totalSteps - i < 4) delay += 30; // Hãm phanh mạnh ở 4 bước cuối

    await sleep(delay);

    // Chuyển sang dòng tiếp theo
    idx = (idx + 1) % rows.length;
    i++;
  }

  // Dừng lại ở người trúng thưởng
  rows.forEach(r => r.classList.remove('active'));
  const winRow = rows[targetIndex];
  winRow.classList.add('win');
  centerIntoView(winRow);
  await sleep(500); // <-- Giảm thời gian chờ ở hiệu ứng WIN
  winRow.classList.remove('win');
}

function formatOtTime(timeStr) {
  try {
    if (!timeStr || !timeStr.includes(':')) return timeStr;
    const [hour, min] = timeStr.split(':');
    const h = parseInt(hour, 10); // Lấy giờ (dạng số)
    if (min === '00') {
      return `${h}h`; // 8h, 12h
    }
    return `${h}h${min}`; // 17h30, 1h30
  } catch {
    return timeStr; // Fallback
  }
}

function calculateDuration(start, end) {
  try {
    let startTime = new Date(`1970-01-01T${start}:00`);
    let endTime = new Date(`1970-01-01T${end}:00`);
    
    // [LOGIC MỚI] Nếu giờ kết thúc < giờ bắt đầu -> ca qua đêm
    if (endTime <= startTime) {
      // Thêm 24 giờ (tính bằng mili-giây) vào ngày kết thúc
      endTime.setTime(endTime.getTime() + 24 * 60 * 60 * 1000);
    }
    
    const diffMs = endTime - startTime;
    return diffMs / (1000 * 60 * 60);
  } catch (e) {
    return 0;
  }
}

tbody.addEventListener('click', (e) => {
  const otButton = e.target.closest('.btn-ot');
  if (otButton) {
    // Sửa tên hàm tại đây: openOtPopover -> openOtModal
    openOtModal(otButton);
  }
});

function normalizeOtInput(timeStr) {
  if (!timeStr) return null;
  timeStr = timeStr.trim();
  
  // [SỬA LỖI] Regex đúng: (18)(h)(30) hoặc (18)(h) hoặc (18)()
  const match = timeStr.match(/^(\d{1,2})(?:(?:h|:)(\d{2}))?h?$/);
  // Group 1: Giờ (18)
  // Group 3: Phút (30) (hoặc undefined nếu là 18h hoặc 18)

  if (!match) return null;

  const h = (match[1] || '00').padStart(2, '0');
  const m = (match[3] || '00').padEnd(2, '0'); // Lấy group 3 (phút)
  
  const finalTime = `${h}:${m}`;
  
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(finalTime)) return null;
  
  return finalTime;
}

function buildWeekendPoolFromState() {
  // [SỬA ĐỔI] Lấy ngày Chủ Nhật (0) hay không
  const selectedDay = new Date(state.dateISO + 'T12:00:00').getDay(); // 0 = Sunday
  const isSunday = (selectedDay === 0);

  const currentPeriod = getCurrentTimePeriod();
  const employees = state.employees || [];
  const statuses  = state.statuses  || {};
  const out = [];
  const addedNames = new Set();
  
  // Lấy giờ hiện tại (số)
  const hour = parseInt(new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      hour12: false
  }), 10);

  // 1. Nếu ngoài giờ (5-8h sáng), trả về rỗng
  if (currentPeriod === 'off_hours') {
    return { pool: [], builtFor: currentPeriod };
  }

  // 2. Lặp qua tất cả nhân viên
  employees.forEach(emp => {
    const st = normStatus(state.statuses[emp.name] || {});
    const off = st.off; 
    const isEvening = isEveningAllowed(off) && !!st.evening;
    const isOnl = !off && !isEvening; // "ONL" = Hành chính (không OFF, không CT)
    const otShifts = st.ot || [];
    const hasOT = otShifts.length > 0;
    
    const team = emp.team || ''; 
    
    // 3. Kiểm tra các điều kiện LOẠI TRỪ
    
    // 3.1. Loại trừ team (Vẽ, Lead)
    if (WEEKEND_EXCLUDED_TEAMS.has(team)) { // WEEKEND_EXCLUDED_TEAMS chỉ chứa 'Vẽ', 'Lead'
      return; 
    }

    // 3.2. [SỬA ĐỔI] CHỈ loại trừ team HC (Mockup, Đào tạo) NẾU KHÔNG PHẢI CHỦ NHẬT
    const isHCExcludedTeam = !isSunday && HC_WEEKEND_EXCLUDED_TEAMS.has(team);

    // 3.3. Kiểm tra xem có đang trong giờ OFF không
    let isCurrentlyOff = false;
    if (off === 'allday') {
      isCurrentlyOff = true;
    } else if (off === 'morning' && hour < 12) {
      isCurrentlyOff = true;
    } else if (off === 'afternoon' && hour >= 12) {
      isCurrentlyOff = true;
    }

    // 4. Xây dựng danh sách ứng viên (eligibility)
    let isEligible = false;

    // 4.1. Ai có OT là vào danh sách (bất kể trạng thái, miễn là ko bị exclude team)
    if (hasOT) {
      isEligible = true;
    }
    
    // 4.2. Ai đang KHÔNG OFF
    if (!isCurrentlyOff) {
      // Nếu là Chiều tối (CT)
      if (isEvening) {
        isEligible = true;
      }
      // Nếu là Hành chính (ONL) VÀ không thuộc team bị cấm HC (đã check T7/CN)
      else if (isOnl && !isHCExcludedTeam) {
        isEligible = true;
      }
    }
    
    // 4.3. Ai đang OFF nhưng sẽ đi làm (VD: 10h sáng, người OFF sáng -> KO, người OFF chiều -> CÓ)
    if (!isEligible) { // Nếu chưa được add (vì đang OFF)
      if (off === 'morning' && hour >= 12) { // Đã hết ca OFF sáng
        // Kiểm tra xem có phải team HC bị cấm không (đã check T7/CN)
        if (!isHCExcludedTeam) {
          isEligible = true;
        }
      }
      if (off === 'afternoon' && hour < 12) { // Chưa đến ca OFF chiều
         // và phải là team HC (vì team CT đâu có OFF chiều)
         if (!isHCExcludedTeam) {
           isEligible = true;
         }
      }
    }
    
    // 5. Lọc theo GIỜ (PERIOD) - bước này để tinh chỉnh danh sách
    // Mục đích là nếu đang buổi sáng, thì người CT/OT tối sẽ không bị quay trúng
    // (Trừ khi họ có OT sáng)
    
    const otInMorning = hasOT && otShifts.some(s => s.start < '12:00');
    const otInAfternoon = hasOT && otShifts.some(s => s.start >= '12:00' && s.start < '17:00');
    const otInEvening = hasOT && otShifts.some(s => s.start >= '17:00');
    
    let finalEligibility = false;

    // Dựa trên isEligible (có mặt) VÀ lọc theo GIAI ĐOẠN HIỆN TẠI
    if (isEligible) {
        switch (currentPeriod) {
          case 'morning_hc': // 8-12h
            // Lấy: ONL, OFF chiều (nếu team HC), OT sáng
            if ( (isOnl && !isHCExcludedTeam) || 
                 (off === 'afternoon' && !isHCExcludedTeam) || 
                 otInMorning ) {
              finalEligibility = true;
            }
            break;
            
          case 'afternoon_hc_ct': // 12-17h
            // Lấy: ONL, OFF sáng (nếu team HC), CT, OT chiều
            // (Lưu ý: isEligible đã xử lý `off === 'morning' && hour >= 12` rồi)
            if ( (isOnl && !isHCExcludedTeam) || 
                 (off === 'morning' && !isHCExcludedTeam) || 
                 isEvening || 
                 otInAfternoon ) {
              finalEligibility = true;
            }
            break;
            
          case 'evening_ct_ot': // 17-21h
            // Lấy: CT, OFF sáng (nếu team HC), OT tối
             if ( isEvening || 
                 (off === 'morning' && !isHCExcludedTeam) || // Vẫn cho team HC off sáng vào quay tối
                 otInEvening ) {
              finalEligibility = true;
            }
            break;
            
          case 'ot_only': // 21h+
            // Chỉ lấy OT tối
            if (otInEvening) {
              finalEligibility = true;
            }
            break;
        }
    }


    // 6. Thêm vào danh sách
    if (finalEligibility && !addedNames.has(emp.name)) {
      out.push({ 
        ...st, 
        name: emp.name, 
        team: emp.team, 
        otShifts: st.ot, // Thêm otShifts vào đây
        onl: isOnl, 
        evening: isEvening, 
        off: off 
      });
      addedNames.add(emp.name);
    }
  });

  return {
    pool: out,
    builtFor: currentPeriod
  };
}

function buildAfternoonAdditions() {
  const employees = state.employees || [];
  const out = [];
  employees.forEach(emp => {
    if (WEEKEND_EXCLUDED_TEAMS.has(emp.team)) return;
    const st = normStatus(state.statuses[emp.name] || {});
    const off = st.off; 
    const isEvening = isEveningAllowed(off) && !!st.evening;
    if (off === 'morning') {
      out.push({ name: emp.name, team: emp.team || '', evening: false, onl: false, off: 'morning' });
    } else if (isEvening) {
      out.push({ name: emp.name, team: emp.team || '', evening: true, onl: false, off: null });
    }
  });
  return out;
}

function buildOtAdditions() {
  const employees = state.employees || [];
  const out = [];
  employees.forEach(emp => {
    // KHÔNG LỌC TEAM
    const st = normStatus(state.statuses[emp.name] || {});

    // ===================================================================
    // ==                  BẮT ĐẦU PHẦN SỬA LỖI                       ==
    // ===================================================================

    // Lỗi ở đây: Đã bỏ từ khóa 'const'
    (st.ot || []).forEach(shift => {
    
    // ===================================================================
    // ==                   KẾT THÚC PHẦN SỬA LỖI                       ==
    // ===================================================================

      // Chỉ lấy các ca bắt đầu từ 17h
      if (shift.start && shift.start >= '17:00') {
        out.push({ 
          name: emp.name, 
          team: emp.team || '', 
          evening: false, onl: false, off: null, 
          ot: true // Đánh dấu đây là OT
        });
      }
    });
  });
  // Trả về danh sách duy nhất (phòng trường hợp 1 người có 2 ca OT)
  return Array.from(new Set(out.map(p => p.name)))
              .map(name => out.find(p => p.name === name));
}

function getCurrentTimePeriod() {
  const nowInVietnamStr = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      hour12: false
  });
  const hour = parseInt(nowInVietnamStr, 10);

  if (hour < 5) return 'ot_only';       // 00:00 - 04:59 (Đêm - Chỉ OT)
  if (hour < 8) return 'off_hours';     // 05:00 - 07:59 (Giờ nghỉ)
  if (hour < 12) return 'morning_hc';    // 08:00 - 11:59 (Sáng - Chỉ HC)
  if (hour < 17) return 'afternoon_hc_ct'; // 12:00 - 16:59 (Chiều - HC + CT)
  if (hour < 21) return 'evening_ct_ot'; // 17:00 - 20:59 (Tối - CT + OT)
  
  return 'ot_only';       // 21:00 - 23:59 (Đêm - Chỉ OT)
}

function renderWeekendList() {
  const listEl   = document.getElementById('weekendList');
  const emptyEl  = document.getElementById('weekendEmpty');
  const countEl  = document.getElementById('weekendCount');
  const spinBtn  = document.getElementById('weekendSpinBtn');

  // ==> SỬ DỤNG DANH SÁCH ĐÃ LỌC GIỜ <==
  const arr = getLiveWeekendCandidates(); 
  
  if (arr.length === 0) {
    // Kiểm tra xem pool gốc có rỗng không hay là do hết giờ
    if ((weekendPool.remaining || []).length > 0) {
        emptyEl.textContent = 'Tất cả nhân viên đã hết ca trực.';
    } else if (getCurrentTimePeriod() === 'off_hours') {
        emptyEl.textContent = 'Đang ngoài giờ quay (5:00 - 8:00).';
    } else {
        emptyEl.textContent = 'Danh sách trống. Bấm ↺ Reset để nạp lại.';
    }
  }

  const esc = s => String(s).replace(/[&<>"']/g, m => (
    { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' }[m]
  ));

  listEl.innerHTML = arr.map((p, i) => {
    // 1. Tag OFF (Giữ nguyên)
    const offTag = p.off === 'morning'   ? `<span class="tag warn">OFF Sáng</span>`
                 : p.off === 'afternoon' ? `<span class="tag warn">OFF Chiều</span>`
                 : '';
    
    // 2. Tag OT: Chỉ hiển thị các ca trong displayOt (ca chưa hết giờ)
    const otBadges = (p.displayOt || []).map(shift => {
        const timeLabel = `${formatOtTime(shift.start)}-${formatOtTime(shift.end)}`;
        return `<span class="badge-ot">${timeLabel}</span>`;
      }).join(' ');

    // 3. Tag Trạng thái: Dựa vào cờ displayOnl / displayEve
    const statusTags = [
      p.displayOnl ? '<span class="tag onl">ONL</span>' : '',
      p.displayEve ? '<span class="tag eve">Chiều tối</span>' : ''
    ].filter(Boolean).join(' ');
    
    return `
      <div class="weekend-item" data-index="${i}" data-name="${esc(p.name)}">
        <div class="left">
          <strong>${esc(p.name)}</strong>
          ${offTag}
          ${statusTags}
          ${otBadges} 
        </div>
        <button class="wk-remove remove-candidate" title="Bỏ ${esc(p.name)}" aria-label="Bỏ ${esc(p.name)}">✕</button>
      </div>`;
  }).join('');

  const n = arr.length;
  // Hiển thị số lượng thực tế đang "sống"
  countEl.textContent = `Còn: ${n}`; 
  emptyEl.classList.toggle('hidden', n > 0);
  if (spinBtn) spinBtn.disabled = (n === 0);

  renderWeekendTeamFilters();
}

function renderWeekendTeamFilters() {
  const container = document.getElementById('weekendFilterContainer');
  if (!container) return;

  // 1. Lấy danh sách các Team ĐANG CÓ trong pool còn lại
  const teamsInPool = new Set();
  weekendPool.remaining.forEach(p => {
    if (p.team) teamsInPool.add(p.team);
  });

  // 2. Nếu không còn team nào hoặc chỉ còn 1 người thì không cần hiện quá nhiều
  if (teamsInPool.size === 0) {
    container.innerHTML = '';
    return;
  }

  // 3. Sắp xếp tên team
  const sortedTeams = Array.from(teamsInPool).sort();

  // 4. Tạo HTML
  container.innerHTML = sortedTeams.map(teamName => {
    // Lấy màu team để hiển thị cho đẹp
    const teamObj = (state.teams || []).find(t => t.name === teamName);
    const color = teamObj ? teamObj.color : '#6b7280';
    
    // Nút bấm
    return `
      <button class="filter-chip-btn" data-team="${teamName}" style="--team-color: ${color}">
        <span class="chip-dot"></span>
        Bỏ ${teamName}
      </button>
    `;
  }).join('');

  // 5. Gắn sự kiện click
  container.querySelectorAll('.filter-chip-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const teamToRemove = btn.dataset.team;
      if (!teamToRemove) return;

      // Xác nhận nhẹ (tuỳ chọn, ở đây làm luôn cho nhanh)
      // Lọc bỏ tất cả người thuộc team đó
      const countBefore = weekendPool.remaining.length;
      weekendPool.remaining = weekendPool.remaining.filter(p => p.team !== teamToRemove);
      const countAfter = weekendPool.remaining.length;
      
      const removedCount = countBefore - countAfter;
      if (removedCount > 0) {
        showToast(`Đã loại ${removedCount} người team ${teamToRemove}`);
        renderWeekendList(); // Sẽ tự gọi lại renderWeekendTeamFilters
        await saveWeekendPool();
      }
    });
  });
}


function showOtEditForm({ name, shift = {}, index = -1 }) {
  currentOtEditor.editingIndex = index;
  
  const presetSelect = $('#otPreset');
  const manualInputs = $('#otManualInputs');
  const startInput = $('#otStart');
  const endInput = $('#otEnd');
  
  $('#otFormTitle').textContent = (index === -1) ? 'Thêm ca mới' : `Sửa ca ${shift.start} - ${shift.end}`;

  if (index === -1) {
    // THÊM MỚI: Reset về tùy chỉnh
    presetSelect.value = 'custom';
    startInput.value = '';
    endInput.value = '';
    manualInputs.classList.remove('hidden');
  } else {
    // SỬA:
    startInput.value = shift.start || '';
    endInput.value = shift.end || '';
    // Kiểm tra xem ca sửa có trùng với preset không
    const presetMatch = Array.from(presetSelect.options).find(opt => opt.value === `${shift.start}-${shift.end}`);
    if (presetMatch) {
      presetSelect.value = presetMatch.value;
      manualInputs.classList.add('hidden');
    } else {
      presetSelect.value = 'custom';
      manualInputs.classList.remove('hidden');
    }
  }

  $('#otEditForm').classList.remove('hidden');
  $('#btnShowOtForm').classList.add('hidden');
  startInput.focus();
}

// [HÀM MỚI] Gắn listener cho Select
$('#otPreset')?.addEventListener('change', (e) => {
  const manualInputs = $('#otManualInputs');
  const startInput = $('#otStart');
  const endInput = $('#otEnd');
  
  if (e.target.value === 'custom') {
    manualInputs.classList.remove('hidden');
    startInput.value = '';
    endInput.value = '';
  } else {
    manualInputs.classList.add('hidden');
    const [start, end] = e.target.value.split('-');
    startInput.value = start;
    endInput.value = end;
  }
});

// Sửa lại hàm Save
$('#btnSaveOt').addEventListener('click', async () => {
  const saveBtn = $('#btnSaveOt'); 
  if (saveBtn.disabled) return;
  saveBtn.disabled = true;

  try {
    const name = currentOtEditor.name;
    const index = currentOtEditor.editingIndex;
    if (!name) return;

    const startInput = $('#otStart').value;
    const endInput = $('#otEnd').value;

    const start = normalizeOtInput(startInput);
    const end = normalizeOtInput(endInput);

    // ===================================================================
    // ==                  BẮT ĐẦU PHẦN SỬA LỖI                       ==
    // ===================================================================

    // [SỬA LỖI] Đã xóa bỏ đoạn check timeRegex.test() cũ.
    // Chỉ cần kiểm tra kết quả của hàm normalizeOtInput là đủ.
    if (!start || !end) {
      showToast('Giờ nhập không hợp lệ. Dùng: 18, 18h, 18:30, 18h30.');
      return; 
    }
    
    // ===================================================================
    // ==                   KẾT THÚC PHẦN SỬA LỖI                       ==
    // ===================================================================
    
    const duration = calculateDuration(start, end);
    if (duration <= 0) {
      showToast('Giờ kết thúc phải sau giờ bắt đầu.');
      return; 
    }
    if (duration > 5) {
      showToast(`Ca OT không được quá 5 tiếng (${duration.toFixed(1)}h).`);
      return; 
    }

    const newShift = { start, end };
    const allShifts = state.statuses[name]?.ot || [];
    
    if (isOverlapping(newShift, allShifts, index)) {
      showToast('Giờ OT mới bị trùng với một ca đã có.');
      return; 
    }

    state.statuses[originalName] = normStatus(state.statuses[originalName]); 

    if (index === -1) { 
      state.statuses[originalName].ot.push(newShift);
    } else { 
      state.statuses[originalName].ot[index] = newShift;
    }

    state.statuses[originalName].ot.sort((a, b) => a.start.localeCompare(b.start));

    await saveDay();
    renderTable();
    renderOtPopoverContent(name); 
    currentOtEditor.editingIndex = -1;

    $('#otEditForm').classList.add('hidden');
    $('#btnShowOtForm').classList.remove('hidden');

  } finally {
    saveBtn.disabled = false;
  }
});

const otInputs = [$('#otStart'), $('#otEnd')];
otInputs.forEach(input => {
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault(); // Ngăn hành vi mặc định của Enter
        $('#btnSaveOt').click(); // Kích hoạt nút "Lưu ca"
      }
    });
  }
});

function pickRandomCandidate() {
  const currentPeriod = getCurrentTimePeriod();
  
  // ==> SỬ DỤNG DANH SÁCH ĐÃ LỌC GIỜ <==
  // Để đảm bảo không quay trúng người đã hết ca (dù họ vẫn còn trong DB)
  let eligiblePool = getLiveWeekendCandidates(); 
  
  if (!eligiblePool.length) return null;

  // 1. Sắp xếp ưu tiên người ít quay (như cũ)
  eligiblePool.sort((a, b) => {
    const dateA = dutyHistory[a.name];
    const dateB = dutyHistory[b.name];
    if (!dateA && dateB) return -1; 
    if (dateA && !dateB) return 1;  
    if (!dateA && !dateB) return 0; 
    return new Date(dateA) - new Date(dateB); 
  });

  // 2. Chọn nhóm ưu tiên (như cũ)
  const priorityGroupSize = 3;
  const priorityGroup = eligiblePool.slice(0, priorityGroupSize);

  // 3. Xử lý trọng số (weights)
  let finalContestants = [];
  
  const getWeight = (p) => {
    let weight = 1;
    // Lưu ý: Dùng displayOt / displayEve vì đây là object đã qua lọc
    const hasActiveOT = p.displayOt && p.displayOt.length > 0;
    
    if (currentPeriod === 'evening_ct_ot') { 
      if (p.displayEve || hasActiveOT) weight = 3; 
    } else if (currentPeriod === 'ot_only') { 
      if (hasActiveOT) weight = 3; 
    } else if (currentPeriod === 'afternoon_hc_ct') { 
      if (p.displayEve) weight = 3; 
    }
    return weight;
  };

  priorityGroup.forEach(p => {
    const weight = getWeight(p);
    for (let i = 0; i < weight; i++) finalContestants.push(p);
  });

  if (!finalContestants.length) {
     eligiblePool.forEach(p => {
       const weight = getWeight(p);
       for (let i = 0; i < weight; i++) finalContestants.push(p);
     });
     if (!finalContestants.length) return null;
  }

  const randomIndex = Math.floor(Math.random() * finalContestants.length);
  return finalContestants[randomIndex];
}

async function openWeekendModal() {
  const currentPeriod = getCurrentTimePeriod(); // Lấy "giai đoạn" hiện tại
  const currentDate = state.dateISO;

  // 1. Tải danh sách đã lưu (nếu có)
  const { remaining: savedPool, builtFor: savedBuiltFor } = 
      await window.api.loadWeekendPool({ dateISO: currentDate });

  // 2. Lấy danh sách đầy đủ (fresh) dựa trên GIỜ HIỆN TẠI
  const { pool: newFullPool, builtFor: newBuiltFor } = buildWeekendPoolFromState();
  const newFullPoolNames = new Set(newFullPool.map(p => p.name));

  // 3. Xử lý
  // 3.1. Nếu khác ngày, hoặc không có pool cũ, hoặc đang giờ nghỉ
  if (currentDate !== weekendPool.dateISO || !savedPool || currentPeriod === 'off_hours') {
    console.log('Tạo mới danh sách quay số (khác ngày, hoặc pool rỗng, hoặc giờ nghỉ).');
    weekendPool.original = newFullPool;
    weekendPool.remaining = newFullPool.slice();
    weekendPool.dateISO = currentDate;
    weekendPool.builtFor = newBuiltFor;
  } 
  // 3.2. Nếu cùng ngày VÀ giai đoạn
  else if (currentPeriod === savedBuiltFor) {
    console.log('Cùng ngày, cùng giai đoạn. Tải ds còn lại.');
    // Dùng y hệt savedPool, vì giả định state.statuses (OFF/OT) không đổi
    weekendPool.remaining = savedPool; 
    weekendPool.builtFor = savedBuiltFor;
    weekendPool.dateISO = currentDate;
  }
  // 3.3. Nếu cùng ngày NHƯNG khác giai đoạn (VD: từ sáng -> chiều)
  else {
    console.log(`Chuyển giai đoạn: ${savedBuiltFor} -> ${currentPeriod}. Lọc và Gộp danh sách.`);
    
    // Lọc danh sách CŨ (savedPool)
    // Giữ lại những người trong savedPool MÀ VẪN CÓ TÊN trong newFullPool
    let removedCount = 0;
    const filteredOldPool = savedPool.filter(p => {
       if (newFullPoolNames.has(p.name)) {
         return true; // Giữ lại
       } else {
         removedCount++; // Sẽ bị xóa (ví dụ: người OFF chiều)
         return false;
       }
    });
    
    // Lấy danh sách người MỚI (những người thuộc newFullPool mà CHƯA CÓ trong filteredOldPool)
    const existingNames = new Set(filteredOldPool.map(p => p.name));
    const additionalPeople = newFullPool.filter(p => !existingNames.has(p.name));
    
    let toasts = [];
    if (removedCount > 0) toasts.push(`Đã tự động loại ${removedCount} nhân viên (OFF/hết ca).`);
    if (additionalPeople.length > 0) toasts.push(`Đã thêm ${additionalPeople.length} nhân viên vào danh sách.`);
    if (toasts.length > 0) showToast(toasts.join(' '));

    // Cập nhật state (lấy thông tin mới nhất từ newFullPool)
    const finalPoolNames = new Set([...filteredOldPool.map(p => p.name), ...additionalPeople.map(p => p.name)]);
    // newFullPool đã chứa object { ...st } mới nhất
    weekendPool.remaining = newFullPool.filter(p => finalPoolNames.has(p.name));
    weekendPool.original = newFullPool.slice(); // Cập nhật cả original pool
    weekendPool.dateISO = currentDate;
    weekendPool.builtFor = currentPeriod;
  }

  // 4. Lưu lại (nếu có thay đổi)
  await saveWeekendPool();

  // 5. Render và hiển thị modal
  renderWeekendList();
  document.getElementById('weekendModal')?.classList.remove('hidden');
  document.getElementById('weekendModal')?.setAttribute('aria-hidden', 'false');
}

function showJackpot(text) {
  const el = document.getElementById('jackpotToast');
  if (!el) return;
  el.textContent = `🎉 ${text} 🎉`;
  el.classList.add('show');
  el.classList.remove('hidden');

  // click vào chính toast để đóng
  const onClick = () => {
    el.classList.remove('show');
    el.classList.add('hidden');
    el.removeEventListener('click', onClick);
    stopConfetti();
  };
  el.addEventListener('click', onClick);
}

async function closeWeekendModal() {
  // Logic MỚI: Nếu đang ghim (Mini Mode) thì thoát trước
  if (isMiniMode) {
    isMiniMode = false;
    await window.api.setMiniMode(false);
    document.body.classList.remove('mini-mode');
    
    // Reset nút ghim về trạng thái cũ
    const btnPin = document.getElementById('btnPinWeekend');
    if (btnPin) {
      btnPin.title = "Ghim ra màn hình";
      btnPin.style.background = "";
    }
  }

  // Logic CŨ: Ẩn modal
  document.getElementById('weekendModal')?.classList.add('hidden');
  document.getElementById('weekendModal')?.setAttribute('aria-hidden', 'true');
}

async function resetWeekendPool() {
  const { pool, builtFor } = buildWeekendPoolFromState();
  weekendPool.original = pool;
  weekendPool.remaining = pool.slice();
  weekendPool.builtFor = builtFor; // <-- Cập nhật buổi
  
  renderWeekendList();
  await saveWeekendPool();
}

let isSpinning = false;

async function spinWeekendOnce() {
  if (isSpinning) return;
  if (!weekendPool.remaining.length) {
    showToast('Danh sách đã hết. Bấm Reset để nạp lại.');
    return;
  }

  const candidate = pickRandomCandidate();
  if (!candidate) {
    showToast('Không tìm được ứng viên phù hợp điều kiện giờ hiện tại.');
    return;
  }

  const box = document.getElementById('weekendList');
  // 👉 SỬA LỖI TẠI ĐÂY:
  //    Đổi selector từ '.candidate-item' thành '.weekend-item'
  //    để khớp với class được tạo bởi hàm renderWeekendList.
  const rows = Array.from(box?.querySelectorAll('.weekend-item') || []);
  if (!rows.length) {
    showToast('Danh sách đang trống.');
    return;
  }

  const targetIndex = rows.findIndex(r => r.dataset.name === candidate.name);
  if (targetIndex < 0) {
    renderWeekendList();
    showToast('Đồng bộ danh sách… thử quay lại nhé.');
    return;
  }

  // 🔒 khoá nút quay trong lúc chạy
  isSpinning = true;
  document.getElementById('weekendSpinBtn')?.setAttribute('disabled', 'true');

   try {
    // Chạy hiệu ứng “quét – chậm dần – dừng”
    await spinAnimate(rows, targetIndex);

    // --- ĐOẠN CODE MỚI ---
    
    // 1. Lưu lịch sử (Giữ nguyên logic cũ)
    dutyHistory[candidate.name] = state.dateISO;
    await window.api.saveDutyHistory(dutyHistory);
    
    // 2. Cập nhật log
    const logEl = document.getElementById('weekendLog');
    if (logEl) logEl.textContent = `Lần gần nhất: ${candidate.name}`;

    // 3. HIỂN THỊ POPUP CHIẾN THẮNG (Thay cho showJackpot cũ)
    // Delay 300ms cho tự nhiên sau khi vòng quay dừng hẳn
    await sleep(300); 
    showWinnerPopup(candidate);

    // 4. Copy tên (Tùy chọn)
    try { await window.api.copyText(candidate.name); } catch (_) {}

    // 5. Loại khỏi danh sách và update UI
    weekendPool.remaining = weekendPool.remaining.filter(x => x.name !== candidate.name);
    renderWeekendList();
    await saveWeekendPool();
    
    // --- HẾT ĐOẠN CODE MỚI ---

  } finally {
    isSpinning = false;
    document.getElementById('weekendSpinBtn')?.removeAttribute('disabled');
  }
}

async function saveWeekendPool() {
  if (!weekendPool.dateISO) return;
  try {
    await window.api.saveWeekendPool({
      dateISO: weekendPool.dateISO,
      remaining: weekendPool.remaining,
      builtFor: weekendPool.builtFor, // <-- Lưu lại buổi
    });
  } catch (e) {
    console.error("Failed to save weekend pool:", e);
  }
}

function startCelebrationUI() {
  startConfetti();
  const el = document.getElementById('celebrateOverlay');
  if (!el) return;
  el.classList.remove('hidden'); el.classList.add('show');
  const onClick = () => {
    stopConfetti();
    const toast = document.getElementById('jackpotToast');
    toast?.classList.remove('show'); toast?.classList.add('hidden');
    el.classList.remove('show'); el.classList.add('hidden');
    el.removeEventListener('click', onClick);
  };
  el.addEventListener('click', onClick);
}

function sortByTeam(empA, empB) {
  const teamA = empA.team || '';
  const teamB = empB.team || '';
  const teamCompareResult = compareTeamNames({ name: teamA }, { name: teamB }); // <-- Dùng hàm đã đổi tên
  if (teamCompareResult !== 0) return teamCompareResult;
  return empA.name.localeCompare(empB.name, 'vi');
}

function sortByNameAlphabetical(empA, empB) {
  // Lấy Tên (chứ không phải Họ)
  const firstNameA = getFirstName(empA.name);
  const firstNameB = getFirstName(empB.name);

  // So sánh Tên bằng tiếng Việt (ví dụ: D đứng trước Đ)
  const nameCompare = firstNameA.localeCompare(firstNameB, 'vi');
  
  if (nameCompare !== 0) {
    // Nếu tên khác nhau, trả về kết quả
    return nameCompare;
  }
  
  // Nếu tên trùng nhau (ví dụ: 2 người cùng tên "Phương"),
  // thì sắp xếp bằng cả họ tên đầy đủ để đảm bảo thứ tự ổn định
  return empA.name.localeCompare(empB.name, 'vi');
}

function sortByNameFixed(empA, empB) {
  const indexA = CUSTOM_NAME_ORDER_MAP.get(empA.name);
  const indexB = CUSTOM_NAME_ORDER_MAP.get(empB.name);
  const aInList = (indexA !== undefined);
  const bInList = (indexB !== undefined);

  if (aInList && bInList)   return indexA - indexB; // Cả 2 đều trong list: theo list
  if (aInList && !bInList)  return -1; // A trong list, B không: A lên trước
  if (!aInList && bInList) return 1;  // B trong list, A không: B lên trước
  
  // Cả 2 đều không có trong list: Sắp xếp theo Đội, rồi theo Tên (fallback)
  return sortByTeam(empA, empB); 
}

// [Hàm Mới] Hàm điều phối sắp xếp chính
function sortEmployeeList(empA, empB) {
  switch (currentSortMode) {
    case 'team':
      return sortByTeam(empA, empB);
    case 'alphabetical':
      return sortByNameAlphabetical(empA, empB);
    case 'custom_fixed':
    default:
      return sortByNameFixed(empA, empB);
  }
}

// --- Data Persistence (Local & Cloud) ---
async function saveRosterLocal() {
  await syncRoster({ render: true });
}

async function saveDay() {
  await window.api.saveDayStatus({ dateISO: state.dateISO, statuses: state.statuses });
  try {
    if (window.cloud) await window.cloud.saveDayStatus(state.dateISO, state.statuses);
  } catch (e) {
    console.warn('[cloud] saveDayStatus failed:', e?.message || e);
  }
}

async function loadDay() {
  try {
    if (window.cloud) {
      const r = await window.cloud.getDayStatus(state.dateISO);
      state.statuses = r?.statuses || {};
    } else {
      const { statuses } = await window.api.loadDayStatus({ dateISO: state.dateISO });
      state.statuses = statuses || {};
    }
  } catch (_) {
    const { statuses } = await window.api.loadDayStatus({ dateISO: state.dateISO });
    state.statuses = statuses || {};
  }

  // --- LOGIC MỚI: Mặc định Chủ Nhật là OFF hết nếu chưa có dữ liệu ---
  const d = new Date(state.dateISO);
  if (d.getDay() === 0) { // 0 là Chủ Nhật
      // Nếu statuses rỗng (chưa ai chấm công), set mặc định OFF toàn bộ
      if (Object.keys(state.statuses).length === 0) {
          (state.employees || []).forEach(emp => {
              state.statuses[emp.name] = { off: 'allday', evening: false, ot: [] };
          });
      }
  }
  // ------------------------------------------------------------------

  // MIGRATE: off:boolean -> off:'allday' | null
  for (const [name, st] of Object.entries(state.statuses)) {
    if (typeof st.off === 'boolean') {
      state.statuses[name].off = st.off ? 'allday' : null;
    } else if (st.off == null) {
      state.statuses[name].off = null;
    }
  }
}

function handleTeamColorPick(pickerEl) {
  const teamTab = pickerEl.closest('.team-tab');
  if (!teamTab) return;
  const teamName = teamTab.dataset.teamName;
  const team = state.teams.find(t => t.name === teamName);
  if (!team) return;

  const newColor = pickerEl.value;
  team.color = newColor;

  // Cập nhật chấm màu ngay
  const dot = teamTab.querySelector('.team-color-dot');
  if (dot) dot.style.backgroundColor = newColor;

  console.log('[TeamColor] đổi màu', teamName, '=>', newColor); // nhìn log ở DevTools
  debouncedSaveRoster(); // sẽ gọi pushRosterToCloud()
}

function debounce(func, delay = 500) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

async function pushRosterToCloud() {
  if (!window.cloud) return;
  try {
    await Promise.all([
      window.cloud.bulkReplace(state.employees),
      window.cloud.saveTeams(state.teams) // PUT /teams
    ]);

    // NEW: kéo lại từ cloud để đảm bảo state có đúng dữ liệu đã lưu (đặc biệt sau migrate)
    const latestTeams = await window.cloud.getTeams();
    if (Array.isArray(latestTeams) && latestTeams.length) {
      state.teams = latestTeams;
      await window.api.saveRoster({ employees: state.employees, teams: state.teams });
      renderTable(); // cập nhật badge màu trong bảng
    }

    console.log('✅ Sync roster/teams OK');
  } catch (err) {
    console.error('[cloud] Sync fail:', err?.message || err);
  }
}

async function pullRosterFromCloud() {
  if (!window.cloud) return false;
  try {
    const [employeesList, teamsList] = await Promise.all([
      window.cloud.listEmployees(),
      window.cloud.getTeams(),
    ]);
    state.employees = (employeesList || []).map(e => ({ name: e.name, team: e.team || '' }));
    state.teams = teamsList || [];
    await window.api.saveRoster({ employees: state.employees, teams: state.teams });
    return true;
  } catch (err) {
    console.warn('[cloud] pullRosterFromCloud failed:', err?.message || err);
    return false;
  }
}

// Dán đè vào giainen/renderer/renderer.js

function renderTable() {
  const parsed = parseSmartQuery(filterText);
  const nameQuery = normalize(parsed.others);

  // 1. Cập nhật trạng thái active cho header
  document.querySelectorAll('.sort-header').forEach(th => {
    th.classList.remove('active');
  });
  if (currentSortMode === 'custom_fixed') {
    $('#th-stt')?.classList.add('active');
  } else if (currentSortMode === 'alphabetical') {
    $('#th-name')?.classList.add('active');
  } else if (currentSortMode === 'team') {
    $('#th-team')?.classList.add('active');
  }

  const list = (state.employees || []).filter(e => {
    const name = e.name || '';
    if (nameQuery && !normalize(name).includes(nameQuery)) return false;

    // trạng thái thực tế của dòng
    const st = normStatus(state.statuses[name] || {}); 
    const offVal = st.off || null;
    const isOffAny = !!offVal;
    const isOffAfternoonOrAll = offVal === 'afternoon' || offVal === 'allday';
    const isEvening = !isOffAfternoonOrAll && !!st.evening;

    const isOfficeHours = !isOffAny && !isEvening;

    // Lọc theo chip (onl/off/eve)
    const req = [];
    if (parsed.onlyOnl) req.push('onl');
    if (parsed.onlyOff) req.push('off');
    if (parsed.eve)     req.push('eve');

    if (req.length) {
      const rowModes = [];
      if (isOfficeHours) rowModes.push('onl');
      if (isOffAny)      rowModes.push('off');
      if (isEvening)     rowModes.push('eve');

      const hit = req.some(k => rowModes.includes(k));
      if (!hit) return false;
    }

    if (parsed.notEve && isEvening) return false;

    // Lọc theo team
    if (parsed.teams.size > 0) {
      const teamSlug = vnSlug(e.team || '');
      let ok = false;
      for (const t of parsed.teams) { if (teamSlug === vnSlug(t)) { ok = true; break; } }
      if (!ok) return false;
    }
    if (parsed.notTeams.size > 0) {
      const teamSlug = vnSlug(e.team || '');
      for (const t of parsed.notTeams) { if (teamSlug === vnSlug(t)) return false; }
    }

    return true;
  });

  // 2. Sắp xếp danh sách
  list.sort(sortEmployeeList);

  if (list.length === 0) {
    tableWrap.classList.add('hidden');
    emptyStateEl.classList.remove('hidden');
    tbody.innerHTML = '';
  } else {
    tableWrap.classList.remove('hidden');
    emptyStateEl.classList.add('hidden');

    // ===================================================================
    // ==                  BẮT ĐẦU PHẦN CẬP NHẬT (Render)              ==
    // ===================================================================

    // [LOGIC MỚI] Lấy giờ hiện tại 1 LẦN
    const hour = parseInt(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hour12: false }), 10);

    const htmlRows = list.map((emp, idx) => {
      const st = normStatus(state.statuses[emp.name] || {}); 
      const offVal = st.off || null;
      const isOffAfternoonOrAll = offVal === 'afternoon' || offVal === 'allday';
      const isEvening = !isOffAfternoonOrAll && !!st.evening;

      // [LOGIC MỚI] Quyết định làm mờ (xám) dòng
      let rowClass = '';
      if (offVal === 'allday') {
        rowClass = 'row-off'; // Luôn xám
      } else if (offVal === 'morning' && hour < 12) {
        rowClass = 'row-off'; // Chỉ xám buổi sáng
      } else if (offVal === 'afternoon' && hour >= 12) {
        rowClass = 'row-off'; // Chỉ xám buổi chiều
      }

      // Logic tag (Giữ nguyên)
      const teamObj = (state.teams || []).find(t => t.name === emp.team);
      const teamColor = teamObj ? teamObj.color : '#cccccc';
      const teamBadge = `<span class="badge-team" style="background-color:${teamColor}20;color:${teamColor};border-color:${teamColor}40;">${emp.team || '—'}</span>`;
      const eveningBadge = isEvening ? '<span class="badge-eve">Chiều tối</span>' : '';
      let otShifts = [...(st.ot || [])];
      
      // Sắp xếp lại ngay tại lúc hiển thị để đảm bảo 1h30 luôn nằm sau 21h
      otShifts.sort((a, b) => {
          return getTimeValueMinutes(a.start) - getTimeValueMinutes(b.start);
      });
      
      // Tạo badge từ danh sách đã sắp xếp
      const otBadges = otShifts.map(shift => {
        const timeLabel = `${formatOtTime(shift.start)}-${formatOtTime(shift.end)}`;
        return `<span class="badge-ot">${timeLabel}</span>`;
      }).join(' ');

      // OFF select (Giữ nguyên)
      const offSelect = `
        <select class="sel-off">
          <option value="" ${offVal==null?'selected':''}>—</option>
          <option value="morning" ${offVal==='morning'?'selected':''}>OFF sáng</option>
          <option value="afternoon" ${offVal==='afternoon'?'selected':''}>OFF chiều</option>
          <option value="allday" ${offVal==='allday'?'selected':''}>OFF</option>
        </select>`;

      // Evening switch (Giữ nguyên)
      const eveSwitch = `
        <label class="switch">
          <input type="checkbox" class="cb-eve" ${isEvening ? 'checked' : ''} ${isOffAfternoonOrAll ? 'disabled' : ''}>
          <span class="slider"></span>
        </label>`;

      // Nút OT (Giữ nguyên)
      let otButtonHtml = '';
      if (st.ot && st.ot.length > 0) {
        const totalDuration = st.ot.reduce((total, shift) => {
          return total + calculateDuration(shift.start, shift.end);
        }, 0);
        if (totalDuration > 0) {
          otButtonHtml = `<button class="btn-ot filled" data-name="${emp.name}">${totalDuration.toFixed(1)}h</button>`;
        } else {
          otButtonHtml = `<button class="btn-ot empty" data-name="${emp.name}">Lỗi giờ</button>`;
        }
      } else {
        otButtonHtml = `<button class="btn-ot empty" data-name="${emp.name}">+</button>`;
      }

      return `
        <tr class="${rowClass}" data-name="${emp.name}">
          <td>${idx + 1}</td>
          <td class="col-name">${emp.name} ${eveningBadge} ${otBadges}</td>
          <td>${teamBadge}</td>
          <td>${offSelect}</td>
          <td>${eveSwitch}</td>
          <td>${otButtonHtml}</td> 
          <td class="actions-cell">
            <span class="row-actions">
              <button class="mini-btn action-edit" title="Sửa">✏️</button>
              <button class="mini-btn action-del" title="Xóa">🗑️</button>
            </span>
          </td>
        </tr>`;
    }).join('');
    
    // ===================================================================
    // ==                   KẾT THÚC PHẦN CẬP NHẬT                     ==
    // ===================================================================
    
    tbody.innerHTML = htmlRows;
  }

  updateSummary();
  renderActiveFiltersPills(parsed);
}

document.querySelector('thead')?.addEventListener('click', (e) => {
  const th = e.target.closest('.sort-header');
  if (!th) return;

  if (th.id === 'th-stt') {
    currentSortMode = 'custom_fixed';
  } else if (th.id === 'th-name') {
    currentSortMode = 'alphabetical';
  } else if (th.id === 'th-team') {
    currentSortMode = 'team';
  }
  renderTable(); // Vẽ lại bảng với chế độ sắp xếp mới
});

function updateSummary() {
  const total = (state.employees || []).length;
  let onl = 0, off = 0, eve = 0;

  (state.employees || []).forEach(emp => {
    const st = state.statuses[emp.name] || { off: null, evening: false };
    const offVal = st.off || null;
    const isOffAny = !!offVal;

    // 👉 THAY ĐỔI LOGIC ĐẾM:
    if (isOffAny) {
      off++;
    } else {
      // Nếu không OFF, kiểm tra xem có phải Chiều tối không
      const isOffAfternoonOrAll = offVal === 'afternoon' || offVal === 'allday'; // Luôn false ở nhánh này
      const isEvening = !isOffAfternoonOrAll && !!st.evening;

      if (isEvening) {
        eve++; // Nếu là Chiều tối, chỉ tăng biến eve
      } else {
        onl++; // Nếu không phải Chiều tối, mới tính là ONL (Hành chính)
      }
    }
  });

  $('#countTotal').textContent = total;
  $('#countOnl').textContent = onl;
  $('#countOff').textContent = off;
  $('#countEvening').textContent = eve;
  updateDashboard();
}

function updateDashboard() {
  if (typeof Chart === 'undefined' || typeof ChartDataLabels === 'undefined') return;
  const total = (state.employees || []).length;
  let onl = 0, off = 0, eve = 0;
  (state.employees || []).forEach(emp => {
    const st = state.statuses[emp.name] || { off: false, evening: false };
    if (st.off) off++; else { onl++; if (st.evening) eve++; }
  });
  const onlRegular = onl - eve;
  const teamStats = {};
  const allTeams = (state.teams || []).map(t => t.name).sort(compareTeamNames);
  allTeams.forEach(team => { teamStats[team] = { off: 0, onlRegular: 0, onlEvening: 0 }; });
  (state.employees || []).forEach(emp => {
    const team = emp.team || 'Khác';
    if (teamStats[team]) {
      const st = state.statuses[emp.name] || { off: false, evening: false };
      if (st.off) teamStats[team].off++;
      else { if (st.evening) teamStats[team].onlEvening++; else teamStats[team].onlRegular++; }
    }
  });
  const dateEl = $('#dashboardDate');
  if (dateEl) {
    try { dateEl.textContent = new Date(state.dateISO).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch { dateEl.textContent = state.dateISO; }
  }
  const statusCtx = document.getElementById('statusChart')?.getContext('2d');
  if (statusCtx) {
    const chartLabels = ['ONL', 'Chiều tối', 'OFF'];
    const chartData = [onlRegular, eve, off];
    const chartColors = ['#22c55e', '#a855f7', '#dc2626'];
    if (!statusChartInstance) {
      statusChartInstance = new Chart(statusCtx, { type: 'doughnut', data: { labels: chartLabels, datasets: [{ data: chartData, backgroundColor: chartColors, borderWidth: 0, }] }, options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } }, title: { display: true, text: 'Tỷ lệ nhân sự' }, tooltip: { callbacks: { label: function(context) { const label = context.label || ''; const value = context.raw || 0; const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0; return `${label}: ${value} người (${percentage}%)`; } } }, datalabels: { color: '#fff', font: { weight: 'bold' }, formatter: (value) => { const percentage = total > 0 ? ((value / total) * 100) : 0; return percentage > 5 ? `${percentage.toFixed(0)}%` : ''; } } } }, plugins: [ChartDataLabels] });
    } else {
      statusChartInstance.data.labels = chartLabels;
      statusChartInstance.data.datasets[0].data = chartData;
      statusChartInstance.update();
    }
  }
  const teamCtx = document.getElementById('teamChart')?.getContext('2d');
  if (teamCtx) {
    const teamLabels = Object.keys(teamStats);
    const dynamicHeight = Math.max(200, teamLabels.length * 40 + 80);
    teamCtx.canvas.parentNode.style.height = `${dynamicHeight}px`;
    const datasets = [ { label: 'ONL', data: teamLabels.map(t => teamStats[t].onlRegular), backgroundColor: '#22c55e' }, { label: 'Chiều tối', data: teamLabels.map(t => teamStats[t].onlEvening), backgroundColor: '#a855f7' }, { label: 'OFF', data: teamLabels.map(t => teamStats[t].off), backgroundColor: '#dc2626' } ];
    if (!teamChartInstance) {
      teamChartInstance = new Chart(teamCtx, { type: 'bar', data: { labels: teamLabels, datasets: datasets }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } }, title: { display: true, text: 'Chi tiết nhân sự theo đội' }, tooltip: { callbacks: { label: function(context) { return `${context.dataset.label}: ${context.raw || 0}`; } } }, 
      
      // =====================================================================
      // ==                👇 BẮT ĐẦU PHẦN CHỈNH SỬA CHÍNH 👇                 ==
      // =====================================================================
      datalabels: {
        // 1. CHỈ HIỂN THỊ KHI HOVER:
        //    Sử dụng một hàm cho thuộc tính `display`.
        //    `context.active` sẽ trả về `true` khi người dùng di chuột vào
        //    cột tương ứng, và `false` khi di chuột ra.
        display: function(context) {
          return context.active;
        },
        
        // 2. CĂN CHỈNH VỊ TRÍ CHO ĐẸP HƠN KHI HIỆN RA:
        align: 'end',     // Căn lề ra phía cuối (bên phải) của thanh bar
        anchor: 'end',    // Neo vào cuối thanh bar
        offset: -4,       // Dịch vào trong 1 chút cho đỡ sát mép
        color: '#1d1d1f', // Màu chữ tối cho dễ đọc trên các nền màu
        font: {
          weight: 'bold',
          size: 11
        },
        formatter: (value) => {
          // Vẫn giữ logic cũ: chỉ hiển thị các số lớn hơn 0
          return value > 0 ? value : '';
        }
      }
      // ===================================================================
      // ==                  ☝️ KẾT THÚC PHẦN CHỈNH SỬA ☝️                 ==
      // ===================================================================

      }, scales: { x: { stacked: true }, y: { stacked: true, barPercentage: 0.7 } } }, plugins: [ChartDataLabels] });
    } else {
      teamChartInstance.data.labels = teamLabels;
      teamChartInstance.data.datasets.forEach((d, i) => { d.data = datasets[i].data; });
      teamChartInstance.update();
    }
  }
}

/**
 * Hiển thị một popup xác nhận tùy chỉnh và trả về một Promise.
 * @param {string} message - Nội dung câu hỏi xác nhận.
 * @param {string} confirmText - Chữ trên nút xác nhận (mặc định: 'Xác nhận').
 * @param {string} title - Tiêu đề của popup (mặc định: 'Xác nhận hành động').
 * @returns {Promise<boolean>} - True nếu người dùng bấm xác nhận, false nếu hủy.
 */
function customConfirm(message, confirmText = 'Xác nhận', title = 'Xác nhận hành động') {
  return new Promise(resolve => {
    const modal = $('#confirmModal');
    const titleEl = $('#confirmTitle');
    const messageEl = $('#confirmMessage');
    const btnYes = $('#btnConfirmYes');
    const btnNo = $('#btnConfirmNo');
    const backdrop = $('#confirmModalBackdrop');

    // Cập nhật nội dung
    titleEl.textContent = title;
    messageEl.textContent = message;
    btnYes.textContent = confirmText;

    // Thay đổi màu nút xác nhận thành màu đỏ nguy hiểm
    btnYes.className = 'btn danger';

    // Hiển thị modal
    modal.classList.remove('hidden');

    // Hàm dọn dẹp và đóng modal
    const close = (result) => {
      modal.classList.add('hidden');
      resolve(result);
    };

    // Gắn sự kiện, { once: true } để sự kiện tự động được gỡ bỏ sau khi chạy 1 lần
    btnYes.addEventListener('click', () => close(true), { once: true });
    btnNo.addEventListener('click', () => close(false), { once: true });
    backdrop.addEventListener('click', () => close(false), { once: true });
  });
}

function renderTeamDialog({ filter }) {
  const q = (filter || '').toLowerCase().trim();
  const allBox = employeeListBox;
  allBox.innerHTML = '';
  const emps = (state.employees || []).map(ensureEmpObject).filter(e => e.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  for (const emp of emps) {
    const row = document.createElement('div');
    row.className = 'listitem';
    row.dataset.name = emp.name;
    row.draggable = true;
    row.innerHTML = `<div class="name">${emp.name}</div><span class="muted">${emp.team || '—'}</span>`;
    allBox.appendChild(row);
  }
  const sortedTeams = [...(state.teams || [])].sort(compareTeamNames);
  if (!activeTeamTab || !sortedTeams.find(t => t.name === activeTeamTab)) {
    activeTeamTab = sortedTeams.length > 0 ? sortedTeams[0].name : null;
  }
  const tabsContainer = $('#teamTabsContainer');
  tabsContainer.innerHTML = '';
  sortedTeams.forEach(team => {
    const tab = document.createElement('div');
    tab.className = `team-tab ${team.name === activeTeamTab ? 'active' : ''}`;
    tab.dataset.teamName = team.name;
const pickerId = `picker-${team.name.replace(/\s+/g, '-')}`; // Tạo ID duy nhất

tab.innerHTML = `
  <label class="team-color-label" for="${pickerId}" title="Đổi màu">
    <span class="team-color-dot" style="background-color: ${team.color}"></span>
  </label>
  <input type="color" class="color-picker-tab-hidden" id="${pickerId}" value="${team.color}">

  <span class="team-name-text">${team.name}</span>
  
  <div class="tab-actions">
    <button class="rename-team-btn" title="Sửa tên đội">✏️</button>
    <button class="delete-team-btn" title="Xóa đội">×</button>
  </div>
`;
    tabsContainer.appendChild(tab);
  });
  const tabContent = tabContentContainer;
  if (activeTeamTab) {
    const members = (state.employees || []).filter(e => e.team === activeTeamTab).map(e => e.name).sort((a, b) => a.localeCompare(b, 'vi'));
    const membersHtml = members.map(name => `<li class="team-member-item" data-name="${name}"><span>${name}</span><button class="remove-member-btn" title="Loại khỏi đội">×</button></li>`).join('');
    tabContent.innerHTML = `<ul class="team-member-list">${membersHtml}</ul>`;
  } else {
    tabContent.innerHTML = '<div class="empty">Chưa có đội nào. Hãy thêm một đội mới!</div>';
  }
  setTimeout(updateTabNavButtons, 100);
}

// ... (Other helper functions like parseSmartQuery, renderActiveFiltersPills)
// The content for these functions is omitted for brevity but should be assumed to be present and correct.
function normalize(s) {
  return (s || '').toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}
function vnSlug(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').trim(); }
function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function parseSmartQuery(raw) {
  // 1) Chuẩn hoá & bỏ dấu
  const canonical = (raw || '').trim();
  const noDia = canonical.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 2) HỢP NHẤT “Chiều tối” → 'chieu-toi' (và bản phủ định)
  const unified = noDia
    .replace(/\bchieu\s*toi\b/g, 'chieu-toi')
    .replace(/\b-\s*chieu\s*toi\b/g, '-chieu-toi');

  // 3) Tách token sau khi đã hợp nhất
  const tokens = unified.split(/\s+/).filter(Boolean);

  const parsed = {
    onlyOff: false, onlyOnl: false, eve: false, notEve: false,
    teams: new Set(), notTeams: new Set(), rawTokens: [], others: ''
  };

  for (const low of tokens) {
    if (low === 'off')                 { parsed.onlyOff = true; parsed.rawTokens.push('off'); continue; }
    if (low === 'onl' || low === 'online') { parsed.onlyOnl = true; parsed.rawTokens.push('onl'); continue; }

    // ✅ “Chiều tối” đã được hợp nhất thành chieu-toi
    if (low === 'chieu-toi')  { parsed.eve    = true; parsed.rawTokens.push('Chiều tối');   continue; }
    if (low === '-chieu-toi') { parsed.notEve = true; parsed.rawTokens.push('-Chiều tối');  continue; }

    // team:Vẽ / -team:Lead ...
    let m = low.match(/^team[:=](.+)$/);
    if (m) { parsed.teams.add(m[1]); parsed.rawTokens.push('team:'+m[1]); continue; }
    m = low.match(/^-(?:team[:=])(.+)$/) || low.match(/^team!?=(.+)$/);
    if (m) { parsed.notTeams.add(m[1]); parsed.rawTokens.push('-team:'+m[1]); continue; }

    // Gom phần còn lại (để tìm theo tên – đã là “không dấu”)
    parsed.others += (parsed.others ? ' ' : '') + low;
  }

  // 4) Nếu có Chiều tối, loại nó khỏi others (phòng khi còn sót biến thể)
  if (parsed.eve || parsed.notEve) {
    parsed.others = parsed.others
      .replace(/\b-?chieu-?toi\b/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  return parsed;
}

function renderActiveFiltersPills(parsed) {
  const box = $('#activeFilters'); if (!box) return;
  const pills = [];
  if (parsed.onlyOff) pills.push({ key: 'off', label: 'Chỉ OFF' });
  if (parsed.onlyOnl) pills.push({ key: 'onl', label: 'Chỉ ONL' });
  if (parsed.eve)    pills.push({ key: 'Chiều tối',  label: 'Chiều tối' });
  if (parsed.notEve) pills.push({ key: '-Chiều tối', label: 'Không Chiều tối' });
  parsed.teams.forEach(t => pills.push({ key: `team:${t}`, label: `Đội: ${t}` }));
  parsed.notTeams.forEach(t => pills.push({ key: `-team:${t}`, label: `Không đội: ${t}` }));
  box.innerHTML = pills.map(p => `<span class="filter-pill" data-token="${p.key}">${p.label} <span class="x" aria-label="Xóa">×</span></span>`).join('');
  box.querySelectorAll('.filter-pill .x').forEach(x => {
  x.addEventListener('click', () => {
    const token = x.parentElement.getAttribute('data-token'); // 'Chiều tối' | '-Chiều tối' | 'team:...'
    const raw = searchInput.value || '';
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

    let re;
    if (token === 'Chiều tối') {
      const syns = ['Chiều tối','chiều tối','chiều-tối','chieu toi','chieu-toi'];
      re = new RegExp(`(?:^|\\s)(?:${syns.map(esc).join('|')})(?=\\s|$)`, 'gi');
    } else if (token === '-Chiều tối') {
      const syns = ['-Chiều tối','-chiều tối','-chiều-tối','-chieu toi','-chieu-toi'];
      re = new RegExp(`(?:^|\\s)(?:${syns.map(esc).join('|')})(?=\\s|$)`, 'gi');
    } else {
      re = new RegExp(`(?:^|\\s)${esc(token)}(?=\\s|$)`, 'i');
    }

    const newVal = raw.replace(re, ' ').replace(/\s{2,}/g, ' ').trim();
    searchInput.value = newVal;
    filterText = newVal;
    renderTable();
  });
});
}

let currentOtEditor = {
  name: null,
  popover: $('#otModal'), // <--- Sửa thành #otModal để khớp với HTML
  editingIndex: -1 
};

// Hàm kiểm tra các ca OT có chồng chéo không
function isOverlapping(newShift, existingShifts, ignoreIndex = -1) {
  
  // [LOGIC MỚI] Helper để xử lý ca qua đêm
  const parseTime = (timeStr) => new Date(`1970-01-01T${timeStr}:00`);
  
  const newStart = parseTime(newShift.start);
  let newEnd = parseTime(newShift.end);

  // Nếu ca mới qua đêm, cộng thêm 24 giờ
  if (newEnd <= newStart) {
    newEnd.setTime(newEnd.getTime() + 24 * 60 * 60 * 1000);
  }

  for (let i = 0; i < existingShifts.length; i++) {
    if (i === ignoreIndex) continue; // Bỏ qua ca đang sửa

    const existing = existingShifts[i];
    let existingStart = parseTime(existing.start);
    let existingEnd = parseTime(existing.end);

    // Nếu ca cũ qua đêm, cộng thêm 24 giờ
    if (existingEnd <= existingStart) {
      existingEnd.setTime(existingEnd.getTime() + 24 * 60 * 60 * 1000);
    }

    // Điều kiện chồng chéo: (StartA < EndB) and (EndA > StartB)
    if (newStart < existingEnd && newEnd > existingStart) {
      return true;
    }
  }
  return false;
}

function showWinnerPopup(candidate) {
  // Điền thông tin
  winnerNameDisplay.textContent = candidate.name;
  
  let detail = candidate.team || 'N/A';
  if (candidate.evening) detail += ' • Chiều tối';
  if (candidate.displayOt && candidate.displayOt.length > 0) detail += ' • Có OT';
  
  winnerDetailDisplay.textContent = detail;

  // Hiển thị Modal
  winnerModal.classList.remove('hidden');
  
  // Bắn pháo hoa ăn mừng
  startCelebrationUI(); 
}

function closeWinnerPopup() {
  winnerModal.classList.add('hidden');
  stopConfetti(); // Tắt pháo hoa khi đóng popup
}

// Gắn sự kiện click đóng
btnCloseWinner.addEventListener('click', closeWinnerPopup);
winnerBackdrop.addEventListener('click', closeWinnerPopup);

function openOtModal(targetButton) {
  const name = targetButton.dataset.name;
  if (!name) return;

  currentOtEditor.name = name;
  renderOtPopoverContent(name); // 1. Vẫn render danh sách ca đã có

  // 2. [SỬA ĐỔI] Tự động hiển thị form "Thêm ca mới"
  showOtEditForm({ name }); // Mặc định là chế độ thêm mới (index = -1)

  // 3. Hiển thị modal
  $('#otModal').classList.remove('hidden');
  $('#otModal').setAttribute('aria-hidden', 'false');
}

// THAY THẾ HÀM closeOtPopover CŨ BẰNG HÀM NÀY
function closeOtModal() {
  $('#otModal').classList.add('hidden');
  $('#otModal').setAttribute('aria-hidden', 'true');
  currentOtEditor.name = null;
  currentOtEditor.editingIndex = -1;

  // ===================================================================
  // ==                  BẮT ĐẦU PHẦN SỬA LỖI                       ==
  // ===================================================================
  
  // [THÊM MỚI] Reset lại form về trạng thái ban đầu khi đóng
  $('#otPreset').value = 'custom';
  $('#otStart').value = '';
  $('#otEnd').value = '';
  
  // Ẩn form edit và hiện lại nút "Thêm"
  $('#otEditForm').classList.add('hidden');
  $('#otManualInputs').classList.remove('hidden'); // Đảm bảo input tay hiện lại
  $('#btnShowOtForm').classList.remove('hidden');

  // ===================================================================
  // ==                   KẾT THÚC PHẦN SỬA LỖI                       ==
  // ===================================================================
}

// Render danh sách các ca OT và form
function renderOtPopoverContent(name) {
  const { popover } = currentOtEditor;
  const status = normStatus(state.statuses[name] || {});
  const shifts = status.ot || [];

  $('#otPopoverTitle').textContent = `OT: ${name}`;
  const listEl = $('#otShiftsList');
  
  if (shifts.length > 0) {
    listEl.innerHTML = shifts.map((shift, index) => {
      const duration = calculateDuration(shift.start, shift.end);
      
      // [SỬA LỖI ĐỊNH DẠNG]
      const timeLabel = `${formatOtTime(shift.start)} - ${formatOtTime(shift.end)}`;

      return `
        <div class="ot-shift-item">
          <div>
            <span class="time">${timeLabel}</span>
            <span class="duration">(${duration.toFixed(1)}h)</span>
          </div>
          <div class="actions">
            <button class="mini-btn btn-edit-ot" data-index="${index}">✏️</button>
            <button class="mini-btn btn-delete-ot" data-index="${index}">🗑️</button>
          </div>
        </div>
      `;
    }).join('');
  } else {
    listEl.innerHTML = `<div class="empty-small">Chưa có ca OT nào.</div>`;
  }

  // Luôn ẩn form edit khi render lại
  $('#otEditForm').classList.add('hidden');
  $('#btnShowOtForm').classList.remove('hidden');
}

// Hiển thị form để thêm hoặc sửa
function showOtEditForm({ name, shift = {}, index = -1 }) {
  currentOtEditor.editingIndex = index;
  
  const presetSelect = $('#otPreset');
  const manualInputs = $('#otManualInputs');
  const startInput = $('#otStart');
  const endInput = $('#otEnd');
  
  // [SỬA LỖI ĐỊNH DẠNG]
  const title = (index === -1) 
    ? 'Thêm ca mới' 
    : `Sửa ca ${formatOtTime(shift.start)} - ${formatOtTime(shift.end)}`;
  $('#otFormTitle').textContent = title;

  if (index === -1) {
    // THÊM MỚI: Reset về tùy chỉnh
    presetSelect.value = 'custom';
    startInput.value = '';
    endInput.value = '';
    manualInputs.classList.remove('hidden');
  } else {
    // SỬA:
    startInput.value = shift.start || '';
    endInput.value = shift.end || '';
    // Kiểm tra xem ca sửa có trùng với preset không
    const presetMatch = Array.from(presetSelect.options).find(opt => opt.value === `${shift.start}-${shift.end}`);
    if (presetMatch) {
      presetSelect.value = presetMatch.value;
      manualInputs.classList.add('hidden');
    } else {
      presetSelect.value = 'custom';
      manualInputs.classList.remove('hidden');
    }
  }

  $('#otEditForm').classList.remove('hidden');
  $('#btnShowOtForm').classList.add('hidden');
  startInput.focus();
}

// === Gắn Event Listeners cho Popover OT mới ===

// Listener chính trên popover để xử lý các nút Sửa, Xóa...
currentOtEditor.popover.addEventListener('click', async (e) => {
  const name = currentOtEditor.name;
  if (!name) return;

  // Nút "Sửa" một ca đã có
  const editBtn = e.target.closest('.btn-edit-ot');
  if (editBtn) {
    const index = parseInt(editBtn.dataset.index, 10);
    const shift = (state.statuses[name]?.ot || [])[index];
    if (shift) {
      showOtEditForm({ name, shift, index });
    }
    return;
  }

  // ===================================================================
  // ==                  BẮT ĐẦU PHẦN SỬA LỖI                       ==
  // ===================================================================

  // Nút "Xóa" một ca đã có
  const deleteBtn = e.target.closest('.btn-delete-ot');
  if (deleteBtn) {
    const index = parseInt(deleteBtn.dataset.index, 10);
    state.statuses[name].ot.splice(index, 1);
    await saveDay();
    renderTable();
    // [SỬA LỖI] Đóng modal sau khi xóa
    closeOtModal(); 
    return;
  }
  
  // ===================================================================
  // ==                   KẾT THÚC PHẦN SỬA LỖI                       ==
  // ===================================================================
});


// Nút "➕ Thêm ca OT mới"
$('#btnShowOtForm').addEventListener('click', () => {
  showOtEditForm({ name: currentOtEditor.name });
});

// Nút "Hủy" trong form thêm/sửa
$('#btnCancelEditOt').addEventListener('click', () => {
    // [SỬA ĐỔI] Gọi hàm đóng modal chính (giống nút 'X')
    // thay vì chỉ ẩn form
    closeOtModal();
});

// Nút "Lưu ca"
$('#btnSaveOt').addEventListener('click', async () => {
  const saveBtn = $('#btnSaveOt'); 
  if (saveBtn.disabled) return;
  saveBtn.disabled = true;

  try {
    // ===================================================================
    // ==                  BẮT ĐẦU PHẦN SỬA LỖI                       ==
    // ===================================================================

    // [SỬA LỖI] Biến ở đây tên là 'name', không phải 'originalName'
    const name = currentOtEditor.name;
    const index = currentOtEditor.editingIndex;
    if (!name) return;

    // ===================================================================
    // ==                   KẾT THÚC PHẦN SỬA LỖI                       ==
    // ===================================================================

    const startInput = $('#otStart').value;
    const endInput = $('#otEnd').value;

    const start = normalizeOtInput(startInput);
    const end = normalizeOtInput(endInput);

    if (!start || !end) {
      showToast('Giờ nhập không hợp lệ. Dùng: 18, 18h, 18:30, 18h30.');
      return; 
    }
    
    const duration = calculateDuration(start, end);
    if (duration <= 0) {
      showToast('Giờ kết thúc phải sau giờ bắt đầu.');
      return; 
    }
    if (duration > 5) {
      showToast(`Ca OT không được quá 5 tiếng (${duration.toFixed(1)}h).`);
      return; 
    }

    const newShift = { start, end };
    
    // ===================================================================
    // ==                  BẮT ĐẦU PHẦN SỬA LỖI                       ==
    // ===================================================================

    // [SỬA LỖI] Phải dùng biến 'name'
    const allShifts = state.statuses[name]?.ot || [];
    
    if (isOverlapping(newShift, allShifts, index)) {
      showToast('Giờ OT mới bị trùng với một ca đã có.');
      return; 
    }

    // [SỬA LỖI] Phải dùng biến 'name'
    state.statuses[name] = normStatus(state.statuses[name]); 

    if (index === -1) { 
      // [SỬA LỖI] Phải dùng biến 'name'
      state.statuses[name].ot.push(newShift);
    } else { 
      // [SỬA LỖI] Phải dùng biến 'name'
      state.statuses[name].ot[index] = newShift;
    }

    // [SỬA LỖI] Phải dùng biến 'name'
    state.statuses[name].ot.sort((a, b) => {
        return getTimeValueMinutes(a.start) - getTimeValueMinutes(b.start);
    });
    // ===================================================================
    // ==                   KẾT THÚC PHẦN SỬA LỖI                       ==
    // ===================================================================

    await saveDay();
    renderTable();
    currentOtEditor.editingIndex = -1;
    
    closeOtModal();

  } finally {
    saveBtn.disabled = false;
  }
});

// // Nút "Đóng" (dấu X) trên header
// $('#btnCancelOt').addEventListener('click', closeOtPopover);

// Đóng popover khi click ra ngoài
document.addEventListener('click', (e) => {
    const otModal = document.getElementById('otModal');
    // Kiểm tra xem modal có đang mở không và người dùng có click ra ngoài vùng nội dung không
    if (
        otModal && !otModal.classList.contains('hidden') &&
        !e.target.closest('.modal-card') &&
        !e.target.closest('.btn-ot')
    ) {
        closeOtModal(); // <--- SỬA THÀNH TÊN HÀM ĐÚNG
    }
}, true);

// --- Main Table Listeners ---
tbody.addEventListener('change', async (e) => {
  const target = e.target;
  const tr = target.closest('tr');
  if (!tr) return;
  const name = tr.dataset.name;
  if (!name) return;

  state.statuses[name] = state.statuses[name] || { off: null, evening: false };

  if (target.matches('.sel-off')) {
    const val = target.value || null; // "", "morning", "afternoon", "allday"
    state.statuses[name].off = val;

    // Nếu OFF chiều/cả ngày thì buộc bỏ chiều tối
    if (val === 'afternoon' || val === 'allday') {
      state.statuses[name].evening = false;
    }
  } else if (target.matches('.cb-eve')) {
    // Chỉ cho phép if không OFF chiều/cả ngày (UI đã disable; đây là safeguard)
    const offVal = state.statuses[name].off;
    if (offVal === 'afternoon' || offVal === 'allday') {
      state.statuses[name].evening = false;
    } else {
      state.statuses[name].evening = target.checked;
    }
  }

  await saveDay();
  renderTable();
});

tbody.addEventListener('click', async (e) => {
  const tr = e.target.closest('tr');
  if (!tr) return;
  const name = tr.dataset.name;
  if (!name) return;
  if (e.target.closest('.action-edit')) {
    const emp = state.employees.find(x => x.name === name) || { name, team: '' };
    openEmpModal({ mode: 'edit', name: emp.name, team: emp.team || '' });
    return;
  }
  if (e.target.closest('.action-del')) {
    if (!await customConfirm(`Xóa nhân viên "${name}"?`)) return;
    state.employees = (state.employees || []).filter(x => x.name !== name);
    delete state.statuses[name];
    await saveRosterLocal();
    await saveDay();
    renderTable();
    showToast('Đã xóa.');
  }
});

// --- Toolbar Listeners ---
searchInput.addEventListener('input', (e) => {
  filterText = e.target.value;
  renderTable();
});

datePicker.addEventListener('change', async (e) => {
  state.dateISO = e.target.value || todayISO();
  await loadDay();
  renderTable();
});

// --- Quick Action Listeners ---
$('#btnAllOn').addEventListener('click', async () => {
  (state.employees || []).forEach(emp => {
    const k = emp.name;
    state.statuses[k] = state.statuses[k] || { off: null, evening: false };
    state.statuses[k].off = null;
  });
  await saveDay(); renderTable();
});

$('#btnAllOff').addEventListener('click', async () => {
  (state.employees || []).forEach(emp => {
    const k = emp.name;
    state.statuses[k] = state.statuses[k] || { off: null, evening: false };
    state.statuses[k].off = 'allday';
    state.statuses[k].evening = false;
  });
  await saveDay(); renderTable();
});

$('#btnClearEve').addEventListener('click', async () => {
  (state.employees || []).forEach(emp => {
    const k = emp.name;
    state.statuses[k] = state.statuses[k] || { off: null, evening: false };
    state.statuses[k].evening = false;
  });
  await saveDay(); renderTable();
});

// [THÊM ĐOẠN MỚI NÀY VÀO]
$('#btnClearAllOT').addEventListener('click', async () => {
  // 1. Hỏi xác nhận (vì đây là hành động nguy hiểm)
  if (!await customConfirm('Bạn có chắc muốn XÓA TOÀN BỘ ca OT của tất cả nhân viên trong ngày này không?', 'Xóa tất cả OT')) return;

  // 2. Xóa OT
  (state.employees || []).forEach(emp => {
    const k = emp.name;
    if (state.statuses[k]) {
      state.statuses[k].ot = []; // Đặt mảng OT về rỗng
    }
  });
  
  // 3. Lưu và render
  await saveDay(); 
  renderTable();
  showToast('Đã xóa tất cả ca OT của ngày này.');
});

// --- Team Dialog Modal Listeners ---
function openTeamDialog() {
  renderTeamDialog({ filter: '' });
  dlg.classList.remove('hidden');
  dlg.setAttribute('aria-hidden', 'false');
}
function closeTeamDialog() {
  dlg.classList.add('hidden');
  dlg.setAttribute('aria-hidden', 'true');
}
$('#btnOpenTeamDialog').addEventListener('click', openTeamDialog);
dlgBackdrop.addEventListener('click', closeTeamDialog);
dlgX.addEventListener('click', closeTeamDialog);

$('#teamSearch').addEventListener('input', (e) => {
  renderTeamDialog({ filter: e.target.value });
});

$('#btnAddTeam').addEventListener('click', async () => {
  const nameInput = $('#newTeamInput');
  const colorInput = $('#newTeamColor');
  const newTeamName = nameInput.value.trim();
  const newTeamColor = colorInput.value;
  if (!newTeamName) return showToast('Vui lòng nhập tên đội.');
  if ((state.teams || []).find(t => t.name.toLowerCase() === newTeamName.toLowerCase())) {
    return showToast('Tên đội này đã tồn tại.');
  }
  state.teams.push({ name: newTeamName, color: newTeamColor });
  state.teams.sort(compareTeamNames);
  await saveRosterLocal();
  nameInput.value = '';
  renderTeamDialog({ filter: $('#teamSearch').value });
  showToast(`Đã thêm đội "${newTeamName}".`);
});

const handleRename = async (input) => {
  const originalName = input.dataset.originalName;
  let newName = input.value.trim();
  if (!newName || newName === originalName) { /* Giữ nguyên */ }
  else if (state.teams.find(t => t.name.toLowerCase() === newName.toLowerCase())) { /* Giữ nguyên */ }
  else {
    const teamIndex = state.teams.findIndex(t => t.name === originalName);
    if (teamIndex > -1) {
      state.teams[teamIndex].name = newName;
      state.employees = state.employees.map(emp => (emp.team === originalName ? { ...emp, team: newName } : emp));
      await saveRosterLocal();
      activeTeamTab = newName;
      showToast(`Đã đổi tên đội thành "${newName}".`);
    }
  }
  renderTeamDialog({ filter: $('#teamSearch').value });
};

function openTeamColorPopover({ anchorEl, teamName, current = '#888888', onPick }) {
  closeTeamColorPopover(); // dọn cái cũ nếu có

  const presets = ['#dc2626', '#a855f7', '#2563eb', '#16a34a', '#6b7280', '#3c719a', '#f59e0b', '#0ea5e9', '#ef4444', '#10b981'];

  const pop = document.createElement('div');
  pop.className = 'team-color-popover';
  pop.innerHTML = `
    <div class="title">Màu đội: ${teamName}</div>
    <div class="swatches">
      ${presets.map(c => `<button class="sw" data-color="${c}" style="background:${c}" title="${c}"></button>`).join('')}
    </div>
    <div class="hex-row">
      <input type="text" class="hex-input" value="${current}" maxlength="7" placeholder="#rrggbb" />
      <button class="btn small ok">Áp dụng</button>
    </div>
  `;

  document.body.appendChild(pop);

  // đặt vị trí theo anchor
  const rect = anchorEl.getBoundingClientRect();
  const top = window.scrollY + rect.bottom + 6;
  const left = window.scrollX + rect.left;
  pop.style.top = `${top}px`;
  pop.style.left = `${left}px`;

  const onClickOutside = (ev) => {
    if (!pop.contains(ev.target)) closeTeamColorPopover();
  };
  setTimeout(() => document.addEventListener('mousedown', onClickOutside, { once: true }), 0);

  // chọn preset
  pop.querySelectorAll('.sw').forEach(btn => {
    btn.addEventListener('click', async () => {
      const hex = btn.dataset.color;
      if (typeof onPick === 'function') onPick(hex);
      closeTeamColorPopover();
    });
  });

  // nhập HEX
  const hexInput = pop.querySelector('.hex-input');
  const btnOk = pop.querySelector('.btn.ok');
  btnOk.addEventListener('click', async () => {
    let hex = (hexInput.value || '').trim();
    if (!/^#[0-9a-f]{6}$/i.test(hex)) {
      // cho phép #abc dạng rút gọn
      if (/^#[0-9a-f]{3}$/i.test(hex)) {
        hex = '#' + hex.slice(1).split('').map(ch => ch + ch).join('');
      } else {
        hexInput.focus();
        return;
      }
    }
    if (typeof onPick === 'function') onPick(hex.toLowerCase());
    closeTeamColorPopover();
  });

  // ESC để đóng
  pop.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeTeamColorPopover();
  });

  // lưu ref để đóng
  window.__teamColorPopover = { el: pop };
}
function closeTeamColorPopover() {
  const p = window.__teamColorPopover?.el;
  if (p && p.parentNode) p.parentNode.removeChild(p);
  window.__teamColorPopover = null;
}

teamDialogBody.addEventListener('click', async (e) => {
  const target = e.target;

  // 1) Click vào chấm màu → mở popover chọn màu (preset + nhập HEX)
  const colorLabel = target.closest('.team-color-label');
  if (colorLabel) {
    const parentTab = colorLabel.closest('.team-tab');
    if (!parentTab) return;
    const teamName = parentTab.dataset.teamName;
    const team = state.teams.find(t => t.name === teamName);
    if (!team) return;

    openTeamColorPopover({
      anchorEl: colorLabel,
      teamName,
      current: team.color || '#888888',
      onPick: async (hex) => {
  team.color = hex;
  const dot = parentTab.querySelector('.team-color-dot');
  if (dot) dot.style.backgroundColor = hex;

  // 🔥 cập nhật bảng ngay
  renderTable();

  // rồi mới lưu/sync
  await saveRosterLocal();
  showToast(`Đã đổi màu đội "${teamName}" → ${hex}`);
}
    });
    return;
  }

  // 2) Chuyển Tab (nhưng không ăn khi bấm vào vùng tab-actions / chấm màu)
  const tab = target.closest('.team-tab');
  if (tab && !target.closest('.tab-actions') && !target.closest('.team-color-label')) {
    activeTeamTab = tab.dataset.teamName;
    renderTeamDialog({ filter: $('#teamSearch').value });
    return;
  }

  // 3) Đổi tên đội
  const renameBtn = target.closest('.rename-team-btn');
  if (renameBtn) {
    const parentTab = renameBtn.closest('.team-tab');
    const span = parentTab.querySelector('.team-name-text');
    if (span) {
      const teamName = span.textContent;
      const input = document.createElement('input');
      input.className = 'team-name-input';
      input.value = teamName;
      input.dataset.originalName = teamName;
      span.replaceWith(input);
      input.focus();
      input.select();
    }
    return;
  }

  // 4) Xóa đội
  const deleteBtn = target.closest('.delete-team-btn');
  if (deleteBtn) {
    const teamNameToDelete = deleteBtn.closest('.team-tab').dataset.teamName;
    if (!await customConfirm(`Bạn có chắc muốn xóa đội "${teamNameToDelete}" không?`, 'Xóa đội')) return;
    state.teams = state.teams.filter(t => t.name !== teamNameToDelete);
    state.employees = state.employees.map(e => (e.team === teamNameToDelete ? { ...e, team: '' } : e));
    await saveRosterLocal();
    activeTeamTab = null;
    renderTeamDialog({ filter: $('#teamSearch').value });
    return;
  }

  // 5) Gỡ thành viên khỏi đội (ở panel bên phải)
  const removeMemberBtn = target.closest('.remove-member-btn');
  if (removeMemberBtn) {
    const memberName = removeMemberBtn.closest('.team-member-item').dataset.name;
    const empIndex = state.employees.findIndex(emp => emp.name === memberName);
    if (empIndex > -1) {
      state.employees[empIndex].team = '';
      await saveRosterLocal();
      renderTeamDialog({ filter: $('#teamSearch').value });
    }
    return;
  }
});

// Thêm gần nhóm Data Persistence (ngay dưới saveDay / pullRosterFromCloud)
async function syncRoster({ render = true } = {}) {
  // 1) Lưu local (fallback)
  const localArr = (state.employees || []).map(e => ({ name: e.name, team: e.team || '' }));
  await window.api.saveRoster({ employees: localArr, teams: state.teams });

  // 2) Đẩy cloud
  if (window.cloud) {
    try {
      await Promise.all([
        window.cloud.bulkReplace(state.employees),
        window.cloud.saveTeams(state.teams),
      ]);

      // 3) Kéo lại dữ liệu chuẩn từ server (phòng server migrate/chuẩn hóa)
      const [employeesList, teamsList] = await Promise.all([
        window.cloud.listEmployees(),
        window.cloud.getTeams(),
      ]);
      state.employees = (employeesList || []).map(e => ({ name: e.name, team: e.team || '' }));
      state.teams = Array.isArray(teamsList) ? teamsList : state.teams;

      // 4) Ghi lại local phiên bản chuẩn
      await window.api.saveRoster({ employees: state.employees, teams: state.teams });
    } catch (err) {
      console.warn('[cloud] syncRoster error:', err?.message || err);
    }
  }

  if (render) renderTable();
}


teamDialogBody.addEventListener('input', async (e) => {
  if (!e.target.matches('.color-picker-tab-hidden')) return;

  const picker = e.target;
  const teamName = picker.closest('.team-tab')?.dataset.teamName;
  const team = state.teams.find(t => t.name === teamName);
  if (!team) return;

  // 1) Cập nhật state + DOT trong tab ngay lập tức
  team.color = picker.value;
  const dot = picker.previousElementSibling?.querySelector('.team-color-dot');
  if (dot) dot.style.backgroundColor = picker.value;

  // 2) 🔥 Re-render bảng chính ngay lập tức (không đợi debounce)
  renderTable();

  // 3) Lưu + đẩy cloud (nếu muốn tránh spam khi kéo, có thể giữ debounce ở đây)
  debouncedSaveRoster();
});

teamDialogBody.addEventListener('change', async (e) => {
  if (!e.target.matches('.color-picker-tab-hidden')) return;

  const picker = e.target;
  const teamName = picker.closest('.team-tab')?.dataset.teamName;
  const team = state.teams.find(t => t.name === teamName);
  if (!team) return;

  team.color = picker.value;
  const dot = picker.previousElementSibling?.querySelector('.team-color-dot');
  if (dot) dot.style.backgroundColor = picker.value;

  // 🔥 đảm bảo khi thả chuột vẫn cập nhật ngay
  renderTable();

  // Lưu/sync NGAY (không debounce) khi user đã thả chuột
  await saveRosterLocal();
});

teamDialogBody.addEventListener('keydown', (e) => {
  if (e.target.matches('.team-name-input') && e.key === 'Enter') {
    e.preventDefault();
    handleRename(e.target);
  }
});

// Xử lý sự kiện FOCUSOUT (chỉ dành cho đổi tên)
teamDialogBody.addEventListener('focusout', (e) => {
  if (e.target.matches('.team-name-input')) {
    handleRename(e.target);
  }
  // ĐÃ XÓA LOGIC XỬ LÝ COLOR PICKER KHỎI ĐÂY
});

employeeListBox.addEventListener('dragstart', (e) => {
  const target = e.target.closest('.listitem');
  if (target) {
    draggedEmployeeName = target.dataset.name;
    e.dataTransfer.setData('text/plain', draggedEmployeeName);
    setTimeout(() => target.classList.add('dragging'), 0);
  }
});
employeeListBox.addEventListener('dragend', (e) => {
  const target = e.target.closest('.listitem');
  if (target) {
    target.classList.remove('dragging');
  }
  draggedEmployeeName = null;
});
tabContentContainer.addEventListener('dragover', (e) => {
  e.preventDefault();
  tabContentContainer.classList.add('drag-over');
});
tabContentContainer.addEventListener('dragleave', () => {
  tabContentContainer.classList.remove('drag-over');
});
tabContentContainer.addEventListener('drop', async (e) => {
  e.preventDefault();
  tabContentContainer.classList.remove('drag-over');
  if (activeTeamTab && draggedEmployeeName) {
    const empIndex = state.employees.findIndex(emp => emp.name === draggedEmployeeName);
    if (empIndex > -1) {
      state.employees[empIndex].team = activeTeamTab;
      await saveRosterLocal();
      renderTeamDialog({ filter: $('#teamSearch').value });
    }
  }
});

// --- Tab Slider Listeners ---
$('#teamTabsPrev').addEventListener('click', () => {
  const container = $('#teamTabsContainer');
  container.scrollLeft -= container.clientWidth * 0.7;
});
$('#teamTabsNext').addEventListener('click', () => {
  const container = $('#teamTabsContainer');
  container.scrollLeft += container.clientWidth * 0.7;
});
$('#teamTabsContainer').addEventListener('scroll', updateTabNavButtons);
function updateTabNavButtons() {
  const container = $('#teamTabsContainer');
  const prevBtn = $('#teamTabsPrev');
  const nextBtn = $('#teamTabsNext');
  if (!container || !prevBtn || !nextBtn) return;
  prevBtn.disabled = container.scrollLeft <= 0;
  nextBtn.disabled = container.scrollLeft + container.clientWidth >= container.scrollWidth - 5;
}

// --- Employee Modal Listeners ---
function openEmpModal({ mode, name = '', team = '' }) {
  editingOldName = (mode === 'edit') ? name : null;
  empTitle.textContent = (mode === 'edit') ? 'Sửa nhân viên' : 'Thêm nhân viên';
  empName.value = name;
  empTeam.value = team || '';
  empModal.classList.remove('hidden');
  empModal.setAttribute('aria-hidden', 'false');
  setTimeout(() => empName.focus(), 0);
}
function closeEmpModal() {
  empModal.classList.add('hidden');
  empModal.setAttribute('aria-hidden', 'true');
  editingOldName = null;
}
btnEmpOpen.addEventListener('click', () => openEmpModal({ mode: 'add' }));
btnEmpCancel.addEventListener('click', closeEmpModal);
empModalX.addEventListener('click', closeEmpModal);
empBackdrop.addEventListener('click', closeEmpModal);
btnEmpSave.addEventListener('click', async () => {
  const name = (empName.value || '').trim();
  const team = (empTeam.value || '').trim();
  if (!name) { showToast('Nhập tên trước nhé!'); return; }
  if (editingOldName) {
    if (editingOldName !== name && state.employees.some(e => e.name === name)) {
      return showToast('Tên mới này đã tồn tại.');
    }
    const i = state.employees.findIndex(e => e.name === editingOldName);
    if (i >= 0) {
      state.employees[i] = { name, team };
      if (editingOldName !== name) {
        state.statuses[name] = state.statuses[editingOldName] || { off: false, evening: false };
        delete state.statuses[editingOldName];
      }
    }
  } else {
    if (state.employees.some(e => e.name === name)) {
      showToast('Tên này đã tồn tại.'); return;
    }
    state.employees.push({ name, team });
  }
  state.employees.sort(sortByNameFixed);
  await saveRosterLocal();
  await saveDay();
  renderTable();
  showToast(editingOldName ? 'Đã cập nhật.' : 'Đã thêm nhân viên.');
  closeEmpModal();
});


// --- Export Modal Listeners ---
function openExportModal() {
  exportModal.classList.remove('hidden');
  exportModal.setAttribute('aria-hidden', 'false');
}
function closeExportModal() {
  exportModal.classList.add('hidden');
  exportModal.setAttribute('aria-hidden', 'true');
}
btnOpenExportModal.addEventListener('click', openExportModal);
$('#exportModalBackdrop').addEventListener('click', closeExportModal);
$('#exportModalX').addEventListener('click', closeExportModal);
$('#btnCancelExport').addEventListener('click', closeExportModal);

exportModal.addEventListener('change', (e) => {
  if (e.target.name === 'reportType') {
    const simpleOptions = $('#simpleReportOptions');
    const detailedOptions = $('#detailedReportOptions'); // <— thêm
    if (e.target.value === 'detailed') {
      simpleOptions.style.display = 'none';
      detailedOptions.style.display = 'block'; // <— thêm
    } else {
      simpleOptions.style.display = 'block';
      detailedOptions.style.display = 'none'; // <— thêm
    }
  }
});

// Tìm đoạn btnConfirmExport.addEventListener và thay thế bằng code này:

btnConfirmExport.addEventListener('click', async () => {
  const selectedFormat = document.querySelector('input[name="exportFormat"]:checked')?.value || 'copy';
  const mode = document.querySelector('input[name="detailedMode"]:checked')?.value || 'onl_eve';
  const dateStr = state.dateISO || new Date().toISOString().slice(0,10);

  const selectedDate = new Date(state.dateISO + 'T12:00:00');
  const dayOfWeek = selectedDate.getDay(); 
  const isSunday = dayOfWeek === 0;

  // Helpers
  const normSt = (st0) => {
    const st = { off: null, evening: false, ot: [], ...(st0 || {}) };
    if (typeof st.off === 'boolean') st.off = st.off ? 'allday' : null;
    return st;
  };
  const eveningAllowed = (off) => !(off === 'afternoon' || off === 'allday');
  const offLabel = (off) => {
    if (off === 'morning')   return 'OFF sáng';
    if (off === 'afternoon') return 'OFF chiều';
    if (off === 'allday')    return 'OFF';
    return '';
  };
  const vnCompare = (a, b) => (a.label || a.name).localeCompare(b.label || b.name, 'vi');
  
  // Helper lấy chuỗi OT (đã sort)
  const getActiveOtLabel = (shifts) => {
      if (!shifts || !shifts.length) return '';
      let activeShifts = [...shifts]; 
      // Sort: 1h30 (25h30) > 21h
      activeShifts.sort((a, b) => getTimeValueMinutes(a.start) - getTimeValueMinutes(b.start));
      const label = activeShifts.map(s => `${formatOtTime(s.start)}-${formatOtTime(s.end)}`).join(' | ');
      return `(OT: ${label})`;
  };

  const groupA_data = []; 
  const groupB_data = []; 

  for (const e of (state.employees || [])) {
    const emp  = (typeof e === 'string') ? { name: e, team: '' } : { name: e.name, team: e.team || '' };
    const st  = normSt(state.statuses[emp.name]);
    const off = st.off;
    const isEvening = eveningAllowed(off) && !!st.evening;
    const otShifts = st.ot || [];
    const activeOtLabel = getActiveOtLabel(otShifts);
    const hasActiveOT = activeOtLabel !== '';

    switch (mode) {
      case 'onl_eve': 
        if (EXCLUDED_TEAMS.has(emp.team)) continue;
        if (HC_WEEKEND_EXCLUDED_TEAMS.has(emp.team) && !isSunday) continue;

        const isOnl = !off && !isEvening;
        const isHalfDayOff = (off === 'morning' || off === 'afternoon');

        if (isEvening) groupB_data.push({ name: emp.name, label: `${emp.name} - Chiều tối ${activeOtLabel}`.trim() });
        else if (isOnl) groupA_data.push({ name: emp.name, off: off, label: `${emp.name} ${activeOtLabel}`.trim() });
        else if (isHalfDayOff) groupA_data.push({ name: emp.name, off: off, label: `${emp.name} ${offLabel(off)} ${activeOtLabel}`.trim() });
        break;
      
      case 'off_eve': 
        if (off) groupA_data.push({ name: emp.name, off: off, label: `${emp.name} ${offLabel(off)} ${activeOtLabel}`.trim(), sortKey: hasActiveOT ? 2 : 1 });
        else if (isEvening) groupB_data.push({ name: emp.name, label: `${emp.name} - Chiều tối ${activeOtLabel}`.trim() });
        break;

      case 'eve_ot': 
        if (isEvening) groupA_data.push({ name: emp.name, label: `${emp.name} - Chiều tối ${activeOtLabel}`.trim() });
        else if (hasActiveOT) groupB_data.push({ name: emp.name, label: `${emp.name} ${activeOtLabel}`.trim() });
        break;

      // === CASE CHỦ NHẬT (Đã sửa) ===
      case 'sun_hc_ot':
        // 1. Nhóm A: Làm HC (Dựa vào trạng thái OFF)
        // off == 'allday' -> Không làm HC -> Bỏ qua
        // off == null -> Làm cả ngày
        // off == 'afternoon' -> Nghỉ chiều = Làm sáng
        // off == 'morning' -> Nghỉ sáng = Làm chiều
        
        if (off !== 'allday') {
           let note = '';
           if (off === 'afternoon') note = ' (Làm sáng)'; // Quan trọng: Nghỉ chiều = Làm sáng
           else if (off === 'morning') note = ' (Làm chiều)'; // Quan trọng: Nghỉ sáng = Làm chiều
           
           groupA_data.push({ 
               name: emp.name, 
               label: `${emp.name}${note}`.trim() 
           });
        }

        // 2. Nhóm B: OT
        if (hasActiveOT) {
           groupB_data.push({ 
               name: emp.name, 
               label: `${emp.name} ${activeOtLabel}`.trim() 
           });
        }
        break;
    }
  }

  // --- SẮP XẾP ---
  if (mode === 'onl_eve') {
    const getSortRank = (off) => (off === null) ? 1 : (off === 'afternoon') ? 2 : (off === 'morning') ? 3 : 4;
    groupA_data.sort((a, b) => {
      const rankA = getSortRank(a.off);
      const rankB = getSortRank(b.off);
      if (rankA !== rankB) return rankA - rankB;
      return vnCompare(a, b);
    });
  } else if (mode === 'off_eve') {
    groupA_data.sort((a, b) => {
      const sortKeyA = a.sortKey; const sortKeyB = b.sortKey; 
      if (sortKeyA !== sortKeyB) return sortKeyA - sortKeyB;
      const getSortRank = (off) => (off === 'morning') ? 1 : (off === 'afternoon') ? 2 : (off === 'allday') ? 3 : 4;
      const rankA = getSortRank(a.off); const rankB = getSortRank(b.off);
      if (rankA !== rankB) return rankA - rankB;
      return vnCompare(a, b);
    });
  } else {
    groupA_data.sort(vnCompare);
  }
  groupB_data.sort(vnCompare);

  // Xuất file/Copy
  function listToString(data) { return data.map(item => item.label).join('\n'); }

  const parts = [];
  
  if (mode === 'sun_hc_ot') {
      // === FORMAT MỚI CHO CHỦ NHẬT ===
      if (groupA_data.length > 0) {
          parts.push('HC:');
          parts.push(listToString(groupA_data));
          parts.push('');
      }
      if (groupB_data.length > 0) {
          parts.push('OT:');
          parts.push(listToString(groupB_data));
          parts.push('');
      }
  } else if (mode === 'onl_eve') {
    if (groupA_data.length) { parts.push(`Hành chính:\n`); parts.push(listToString(groupA_data)); parts.push(''); }
    if (groupB_data.length) { parts.push(`Chiều tối:\n`); parts.push(listToString(groupB_data)); parts.push(''); } 
  } else if (mode === 'off_eve') { 
    if (groupA_data.length) { parts.push(`OFF:\n`); parts.push(listToString(groupA_data)); parts.push(''); } 
    if (groupB_data.length) { parts.push(`Chiều tối:\n`); parts.push(listToString(groupB_data)); parts.push(''); } 
  } else if (mode === 'eve_ot') {
    if (groupA_data.length) { parts.push(`Chiều tối:\n`); parts.push(listToString(groupA_data)); parts.push(''); }
    if (groupB_data.length) { parts.push(`OT:\n`); parts.push(listToString(groupB_data)); parts.push(''); }
  }

  const reportText = parts.join('\n').trim();

  try {
    if (selectedFormat === 'copy') {
      await window.api.copyText(reportText);
      showToast('Đã sao chép báo cáo vào clipboard.');
    } else {
      const fileBaseName = `BaoCao-${dateStr}`;
      await window.api.exportTxt({ defaultName: fileBaseName, content: reportText });
      showToast('Đã xuất báo cáo TXT.');
    }
  } catch (err) {
    console.error('[Export] fail:', err);
    showToast('Xuất báo cáo lỗi.');
  } finally {
    closeExportModal();
  }
});

function normalizeNameForMatching(name) {
  if (!name) return '';
  return name.toLowerCase()
    // 1. Bỏ cụm từ khóa đặc biệt "Easy Dễ Mùa Sale" trước
    .replace(/\s*-\s*easy dễ mùa sale/gi, '') 
    // 2. Bỏ các hậu tố trong ngoặc như (DK), (NVT)...
    .replace(/\s*\([^)]*\)/g, '')             
    // 3. Bỏ các hậu tố ngăn cách bằng dấu gạch ngang (VD: - Team Đào Tạo)
    .split(' - ')[0]                          
    .trim();
}

function openPasteModal() {
  pasteModal.classList.remove('hidden');
  pasteModal.setAttribute('aria-hidden', 'false');
  $('#pasteTextarea').value = '';
  setTimeout(() => $('#pasteTextarea').focus(), 50);
}

function closePasteModal() {
  pasteModal.classList.add('hidden');
  pasteModal.setAttribute('aria-hidden', 'true');
}

function extractOtFromText(text) {
  const shifts = [];
  // Regex bắt giờ linh hoạt:
  // - Chấp nhận: 21h30, 21:30, 21, 1h30, 1
  // - Dấu ngăn cách: - hoặc –
  const otRegex = /(\d{1,2})(?:h|:)?(\d{1,2})?\s*(?:-|–)\s*(\d{1,2})(?:h|:)?(\d{1,2})?/gi;
  
  let match;
  while ((match = otRegex.exec(text)) !== null) {
    // Group 1,2: Giờ, Phút bắt đầu
    const startH = (match[1] || '0').padStart(2, '0');
    const startM = (match[2] || '00').padEnd(2, '0');
    
    // Group 3,4: Giờ, Phút kết thúc
    const endH = (match[3] || '0').padStart(2, '0');
    const endM = (match[4] || '00').padEnd(2, '0');

    // Bỏ qua nếu định dạng giờ không tưởng (vd: 88h)
    if (parseInt(startH) > 23 || parseInt(endH) > 23) continue;

    const start = `${startH}:${startM}`;
    const end = `${endH}:${endM}`;
    
    // Tính thời lượng
    // Hàm calculateDuration có sẵn trong code cũ đã xử lý logic qua đêm:
    // Nếu End < Start (vd 01:30 < 21:30) => Tự động +24h cho End.
    const duration = calculateDuration(start, end);

    // Chỉ lấy ca > 0 và <= 6 tiếng (nới lỏng lên 6h để bắt các ca gộp nếu có)
    if (duration > 0 && duration <= 6) {
      shifts.push({ start, end });
    }
  }
  return shifts;
}

// --- HÀM XỬ LÝ DÁN THÔNG MINH (ALL-IN-ONE) ---
async function handlePasteApply() {
  const text = $('#pasteTextarea').value.trim();
  if (!text) return closePasteModal();

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  // 1. Nhận diện Excel: Nếu dòng có nhiều hơn 5 dấu Tab -> Là bảng Excel
  const isExcelTable = lines.some(l => l.split('\t').length > 5);

  if (isExcelTable) {
      await handlePasteScheduleTable(lines); // Gọi logic Excel cũ (đã có)
  } else {
      await handlePasteSmartText(lines);     // Gọi logic Text mới
  }
}

// --- HÀM XỬ LÝ TEXT THÔNG MINH ---
async function handlePasteSmartText(lines) {
  const d = new Date(state.dateISO);
  const isSunday = d.getDay() === 0;

  // A. NẾU LÀ CHỦ NHẬT: Reset toàn bộ về OFF trước
  // (Vì CN mặc định nghỉ, chỉ ai có tên trong list mới đi làm)
  if (isSunday) {
     (state.employees || []).forEach(emp => {
         state.statuses[emp.name] = { off: 'allday', evening: false, ot: [] };
     });
  }

  let updatedCount = 0;
  
  // Map tên để tra cứu
  const employeeNameMap = new Map();
  (state.employees || []).forEach(e => {
    employeeNameMap.set(normalizeNameForMatching(e.name), e.name);
  });

  for (const line of lines) {
      // 1. Chuẩn hóa dòng text để dễ xử lý
      const normLine = normalizeNameForMatching(line);
      const contentUpper = line.toUpperCase();

      // 2. Dò tìm tên nhân viên trong dòng (Khớp dài nhất)
      let matchedOriginalName = null;
      let maxLen = 0;

      for (const [normKey, origName] of employeeNameMap) {
          if (normLine.startsWith(normKey)) {
              if (normKey.length > maxLen) {
                  maxLen = normKey.length;
                  matchedOriginalName = origName;
              }
          }
      }

      if (!matchedOriginalName) continue; // Không tìm thấy tên -> Bỏ qua

      // Lấy trạng thái hiện tại (Lưu ý: Nếu CN thì đã bị reset về OFF ở bước A)
      let currentSt = state.statuses[matchedOriginalName] || { off: null, evening: false, ot: [] };

      // --- BƯỚC 3: PHÂN TÍCH NỘI DUNG ---
      
      // a. Check Giờ OT (VD: 18h-22h, 20-0h, 8h-12h...)
      const foundShifts = extractOtFromText(contentUpper);
      
      // b. Check Từ khóa
      const hasBT = contentUpper.includes('BT'); // Bình thường
      
      // Check OFF
      const hasOff = contentUpper.includes('OFF');
      const hasOffSang = contentUpper.includes('OFF SÁNG') || contentUpper.includes('OFF SANG');
      const hasOffChieu = contentUpper.includes('OFF CHIỀU') || contentUpper.includes('OFF CHIEU');
      
      // Check Chiều tối
      const hasEve = contentUpper.includes('CHIỀU TỐI') || contentUpper.includes('CHIEU TOI');

      // --- BƯỚC 4: ÁP DỤNG LOGIC ---

      if (isSunday) {
          // === LOGIC CHỦ NHẬT ===
          
          // 1. Xác định có đi làm HC không?
          // - Có chữ "BT" -> Làm
          // - Có giờ hành chính trong list OT (8h, 13h) -> Làm
          const hasHCHours = foundShifts.some(s => s.start.startsWith('08') || s.start.startsWith('13') || s.start.startsWith('8') || s.start.startsWith('13'));
          
          if (hasBT || hasHCHours) {
              currentSt.off = null; // Bỏ OFF -> ONL
          }

          // 2. Lưu OT (Nếu có)
          if (foundShifts.length > 0) {
              currentSt.ot = foundShifts;
          }
          
          // 3. Nếu dòng text chỉ có tên và giờ OT tối (VD: "Tên: 18h-22h")
          // -> Trạng thái vẫn là OFF (nghỉ ngày), nhưng có OT. (Đúng logic thực tế)

      } else {
          // === LOGIC NGÀY THƯỜNG (T2-T7) ===
          
          // 1. Cập nhật trạng thái OFF (Chỉ cập nhật nếu dòng text có ghi OFF)
          if (hasOffSang) currentSt.off = 'morning';
          else if (hasOffChieu) currentSt.off = 'afternoon';
          else if (hasOff && !hasEve) currentSt.off = 'allday'; // Tránh nhầm "Chiều tối"
          else if (hasBT) currentSt.off = null; // Có BT -> Bỏ OFF

          // 2. Cập nhật Chiều tối
          if (hasEve) currentSt.evening = true;

          // 3. Cập nhật OT (Nếu có giờ thì ghi đè OT cũ)
          if (foundShifts.length > 0) {
              currentSt.ot = foundShifts;
          }
      }

      // Sắp xếp OT: 18h -> 20h -> 0h (24h) -> 1h (25h)
      currentSt.ot.sort((a, b) => getTimeValueMinutes(a.start) - getTimeValueMinutes(b.start));

      // Lưu lại
      state.statuses[matchedOriginalName] = currentSt;
      updatedCount++;
  }

  await saveDay();
  renderTable();
  closePasteModal();
  
  const dayLabel = isSunday ? 'Chủ Nhật' : 'Thường';
  if (updatedCount > 0) {
      showToast(`✅ Đã cập nhật (${dayLabel}) cho ${updatedCount} nhân viên.`);
  } else {
      showToast('⚠️ Không tìm thấy dữ liệu hợp lệ.');
  }
}

// 2. HÀM XỬ LÝ OT DẠNG TEXT (Đây chính là code cũ của bạn, giữ nguyên logic)
async function handlePasteOtText(lines) {
  let updatedCount = 0;

  // 1. Chuẩn bị Map tra cứu tên
  const employeeNameMap = new Map();
  (state.employees || []).forEach(e => {
    employeeNameMap.set(normalizeNameForMatching(e.name), e.name);
  });

  // 2. Biến tạm để GOM (GỘP) tất cả các ca OT tìm thấy
  const batchOT = {}; 

  for (const line of lines) {
    const upperLine = line.toUpperCase();
    if (upperLine.includes('HO VA TEN') || upperLine.includes('OT CA SANG')) continue;

    let rawName = '';
    let textToScanForOT = '';

    // --- PHÂN LOẠI INPUT ---
    if (line.includes('\t')) {
      const parts = line.split('\t');
      rawName = parts[0]; 
      textToScanForOT = parts.slice(1).join(' '); 
    } else {
      let tempName = line;
      if (tempName.includes('(OT:')) tempName = tempName.split('(OT:')[0];
      // Các bước làm sạch tên đặc thù của bạn
      tempName = tempName.replace(/\s*-\s*Chiều tối/i, '').replace(/\s*-\s*Team.*/i, '');
      tempName = tempName.replace(/\s*-\s*Easy Dễ Mùa Sale/i, '');
      
      rawName = tempName.trim();
      const otMatch = line.match(/\(OT:\s*(.*?)\)/i);
      textToScanForOT = otMatch ? otMatch[1] : line.substring(rawName.length); 
    }

    // --- TÌM TÊN GỐC ---
    const normalizedInputName = normalizeNameForMatching(rawName);
    const originalName = employeeNameMap.get(normalizedInputName);

    if (!originalName) {
       // Logic log skip cũ
       if (rawName && rawName.length > 3 && isNaN(parseInt(rawName[0]))) {
         // console.log('Skip:', rawName); 
       }
       continue;
    }

    // --- QUÉT GIỜ OT ---
    const foundShifts = extractOtFromText(textToScanForOT);
    
    if (foundShifts.length > 0) {
        if (!batchOT[originalName]) {
            batchOT[originalName] = [];
        }
        batchOT[originalName].push(...foundShifts);
    }
  }

  // 3. ÁP DỤNG VÀO STATE (Sau khi đã gom hết)
  for (const [name, rawShifts] of Object.entries(batchOT)) {
      const uniqueShifts = [];
      const seenShift = new Set();
      
      rawShifts.forEach(s => {
          const formatH = (t) => t.split(':').map(x => x.padStart(2, '0')).join(':');
          const key = `${formatH(s.start)}-${formatH(s.end)}`;
          
          if(!seenShift.has(key)){
              seenShift.add(key);
              uniqueShifts.push(s);
          }
      });

      // === LOGIC SẮP XẾP XỊN CỦA BẠN ===
      // Dùng hàm getTimeValueMinutes để xếp đúng giờ qua đêm (1h30 > 21h00)
      uniqueShifts.sort((a, b) => {
          return getTimeValueMinutes(a.start) - getTimeValueMinutes(b.start);
      });

      // Lưu vào state
      state.statuses[name] = normStatus(state.statuses[name]);
      state.statuses[name].ot = uniqueShifts; // Lưu object {start, end} nếu code render hỗ trợ, hoặc convert sang string
      // LƯU Ý: Nếu code render của bạn cần chuỗi "HH:mm-HH:mm", hãy map lại ở đây:
      // state.statuses[name].ot = uniqueShifts.map(s => ...); 
      // Nhưng theo đoạn code bạn gửi thì bạn đang gán thẳng uniqueShifts. Tôi sẽ giữ nguyên.
      
      updatedCount++;
  }

  // 4. LƯU & RENDER
  await saveDay();
  renderTable();
  closePasteModal();

  if (updatedCount > 0) {
      showToast(`✅ Đã gộp và cập nhật OT cho ${updatedCount} nhân viên.`);
  } else {
      showToast('⚠️ Không tìm thấy dữ liệu OT hợp lệ nào.');
  }
}

// --- HÀM XỬ LÝ DÁN BẢNG LỊCH TRÌNH (FIX: TỰ ĐỘNG DÒ CỘT CHỦ NHẬT & LOGIC BT) ---
async function handlePasteScheduleTable(lines) {
  const d = new Date(state.dateISO);
  const isSunday = d.getDay() === 0;

  // 1. Reset Chủ Nhật: Mặc định OFF hết, Tắt đèn tối, Xóa OT cũ
  if (isSunday) {
     (state.employees || []).forEach(emp => {
         state.statuses[emp.name] = { off: 'allday', evening: false, ot: [] };
     });
  }

  let updatedCount = 0;
  const employeeNameMap = new Map();
  (state.employees || []).forEach(e => {
    employeeNameMap.set(normalizeNameForMatching(e.name), e.name);
  });

  for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length < 2) continue;
      
      const rawName = parts[1].trim();
      // Bỏ qua dòng tiêu đề và dòng Tổng
      if (!rawName || rawName.toUpperCase().includes('HỌ VÀ TÊN') || rawName.toUpperCase().includes('TỔNG')) continue;

      const originalName = employeeNameMap.get(normalizeNameForMatching(rawName));
      if (!originalName) continue;

      let currentSt = state.statuses[originalName] || { off: 'allday', evening: false, ot: [] };
      currentSt.ot = []; // Reset OT để nạp mới

      let isHcMorn = false;
      let isHcAft = false;
      
      // --- THUẬT TOÁN TỰ DÒ CỘT (AUTO-DETECT) ---
      // Mục tiêu: Tìm xem cột "OT CA SÁNG" của ngày đang chọn nằm ở index nào.
      let baseIdx = 2; // Mặc định cho Thứ 7 (Cột 2)

      if (isSunday) {
          // Hàm kiểm tra xem ô này có phải là ô Số Lượng (SL) không
          // (Ô SL thường là số: 0, 4, 8 hoặc rỗng)
          const isSLColumn = (idx) => {
              const val = (parts[idx] || '').trim().replace(',', '.');
              return !val || !isNaN(parseFloat(val));
          };

          // Dò tìm vị trí bắt đầu của Chủ Nhật (thường rơi vào 10, 11, hoặc 12)
          // Ta kiểm tra cặp: [Trạng thái] [SL]
          // Nếu ô i là Trạng thái (không phải số) VÀ ô i+1 là Số -> Đó là Base
          
          if (!isSLColumn(11) && isSLColumn(12)) {
              baseIdx = 11; // Trường hợp của bạn (Tăng Duy Khánh: Index 10 là khoảng trắng)
          } else if (!isSLColumn(12) && isSLColumn(13)) {
              baseIdx = 12; // Trường hợp copy chuẩn không lệch
          } else if (!isSLColumn(13) && isSLColumn(14)) {
              baseIdx = 13; // Trường hợp T7 có 5 cột
          } else {
              baseIdx = 11; // Fallback về trường hợp phổ biến nhất của bạn
          }
      }

      // Cấu hình các ca (Offset tính từ cột Base vừa dò được)
      const shiftsConfig = [
          { offset: 0, type: 'morn' },   // Sáng
          { offset: 2, type: 'aft' },    // Chiều
          { offset: 4, type: 'eve' },    // Tối
          { offset: 6, type: 'night' },  // Đêm
          { offset: 8, type: 'night2' }  // Đêm 2 (nếu có)
      ];

      shiftsConfig.forEach(conf => {
          const statusCell = (parts[baseIdx + conf.offset] || '').trim(); 
          const slCell = (parts[baseIdx + conf.offset + 1] || '').trim();
          const combinedText = `${statusCell} ${slCell}`.toUpperCase();
          
          // 1. XỬ LÝ OT (Quét giờ ở TẤT CẢ các cột: Sáng, Chiều, Tối, Đêm)
          // Tìm giờ dạng: 18-22h, 20-0h, 0h-4h...
          const foundOts = extractOtFromText(combinedText);
          if (foundOts.length > 0) {
              currentSt.ot.push(...foundOts);
          }

          // 2. XỬ LÝ HÀNH CHÍNH (Chỉ xét cột SÁNG & CHIỀU)
          // Nếu cột Sáng có BT -> isHcMorn = true
          // Nếu cột Chiều có BT -> isHcAft = true
          if (conf.type === 'morn' || conf.type === 'aft') {
              if (combinedText.includes('BT')) {
                  if (conf.type === 'morn') isHcMorn = true;
                  if (conf.type === 'aft')  isHcAft = true;
              }
          }
      });

      // --- TỔNG HỢP TRẠNG THÁI ---
      
      // Tính toán OFF/ONL dựa trên kết quả quét BT
      if (isHcMorn && isHcAft) {
          currentSt.off = null; // Có BT Sáng + BT Chiều -> Đi làm cả ngày (ONL)
      } else if (isHcMorn && !isHcAft) {
          currentSt.off = 'afternoon'; // Chỉ BT Sáng -> Làm sáng, Nghỉ chiều
      } else if (!isHcMorn && isHcAft) {
          currentSt.off = 'morning'; // Chỉ BT Chiều -> Làm chiều, Nghỉ sáng
      } else {
          currentSt.off = 'allday'; // Không có BT -> Nghỉ cả ngày
      }

      // Đèn chiều tối LUÔN TẮT (theo yêu cầu của bạn)
      currentSt.evening = false; 

      // Sắp xếp lại OT (để 20h lên trước 0h)
      currentSt.ot.sort((a, b) => getTimeValueMinutes(a.start) - getTimeValueMinutes(b.start));

      state.statuses[originalName] = currentSt;
      updatedCount++;
  }

  await saveDay();
  renderTable();
  closePasteModal();
  
  const dayName = isSunday ? 'Chủ Nhật' : 'Thứ 7';
  if (updatedCount > 0) {
      showToast(`✅ Đã cập nhật lịch ${dayName} cho ${updatedCount} nhân viên!`);
  } else {
      showToast(`⚠️ Không tìm thấy dữ liệu phù hợp.`);
  }
}

function setupChipFilters() {
  const searchInput = document.getElementById('searchInput');
  const chipAll = document.getElementById('countTotal')?.parentElement;
  const chipOnl = document.getElementById('countOnl')?.parentElement;
  const chipOff = document.getElementById('countOff')?.parentElement;
  const chipEve = document.getElementById('countEvening')?.parentElement;

  // đồng bộ trạng thái .active theo ô lọc hiện tại
  const syncChipActive = () => {
    const p = parseSmartQuery(searchInput.value || '');
    chipAll?.classList.toggle('active', !(p.onlyOnl || p.onlyOff || p.eve || p.notEve || p.teams?.size || p.notTeams?.size || (p.others||'').trim()));
    chipOnl?.classList.toggle('active', !!p.onlyOnl);
    chipOff?.classList.toggle('active', !!p.onlyOff);
    chipEve?.classList.toggle('active', !!p.eve && !p.notEve);
  };

  // tiện ích: xóa/đổi token trong chuỗi lọc
  const hasWord = (raw, re) => re.test(raw);
  const cleanSpaces = s => s.replace(/\s{2,}/g, ' ').trim();

  const removeToken = (raw, token) => {
    // token thường
    if (token === 'onl' || token === 'off') {
      const re = new RegExp(`(?:^|\\s)${token}(?=\\s|$)`, 'gi');
      return cleanSpaces(raw.replace(re, ' '));
    }
    // “Chiều tối” và các biến thể
    if (token === 'Chiều tối') {
      const syns = ['Chiều tối','chiều tối','chiều-tối','chieu toi','chieu-toi'];
      const re = new RegExp(`(?:^|\\s)(?:${syns.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')})(?=\\s|$)`, 'gi');
      return cleanSpaces(raw.replace(re, ' '));
    }
    return raw;
  };

  const addToken = (raw, token) => cleanSpaces(`${removeToken(raw, token)} ${token}`);

  // NV: xóa 3 token lọc “chế độ” (không đụng team/tên)
  chipAll?.addEventListener('click', () => {
    let v = searchInput.value || '';
    v = removeToken(v, 'onl');
    v = removeToken(v, 'off');
    v = removeToken(v, 'Chiều tối');
    searchInput.value = v;
    filterText = v;
    renderTable();
    syncChipActive();
  });
  // ONL
  chipOnl?.addEventListener('click', () => {
    let v = searchInput.value || '';
    const re = /(?:^|\s)onl(?=\s|$)/i;
    v = hasWord(v, re) ? removeToken(v, 'onl') : addToken(v, 'onl');
    searchInput.value = v; filterText = v; renderTable(); syncChipActive();
  });
  // OFF
  chipOff?.addEventListener('click', () => {
    let v = searchInput.value || '';
    const re = /(?:^|\s)off(?=\s|$)/i;
    v = hasWord(v, re) ? removeToken(v, 'off') : addToken(v, 'off');
    searchInput.value = v; filterText = v; renderTable(); syncChipActive();
  });
  // Chiều tối (đã thay thế hoàn toàn “eve”)
  chipEve?.addEventListener('click', () => {
    let v = searchInput.value || '';
    const syns = ['Chiều tối','chiều tối','chiều-tối','chieu toi','chieu-toi'];
    const re = new RegExp(`(?:^|\\s)(?:${syns.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')})(?=\\s|$)`,'i');
    v = hasWord(v, re) ? removeToken(v, 'Chiều tối') : addToken(v, 'Chiều tối');
    searchInput.value = v; filterText = v; renderTable(); syncChipActive();
  });

  // đồng bộ khi người dùng gõ tay
  searchInput?.addEventListener('input', syncChipActive);
  // chạy lần đầu
  syncChipActive();
}

function setupWeekendRemoveHandler(){
  const listEl = document.getElementById('weekendList');
  if (!listEl) return;
  
  // Xóa listener cũ (nếu có) bằng cách clone node (mẹo nhanh) hoặc đảm bảo logic chỉ chạy 1 lần
  // Ở đây ta viết lại logic xử lý sự kiện ủy quyền (delegation)
  listEl.onclick = async (e) => {
    const btn = e.target.closest('.remove-candidate');
    if (!btn) return;

    const item = btn.closest('.weekend-item');
    const nameToRemove = item?.dataset?.name; // Lấy tên từ data-name

    if (nameToRemove) {
      // Lọc bỏ người có tên này khỏi danh sách gốc
      weekendPool.remaining = weekendPool.remaining.filter(p => p.name !== nameToRemove);
      
      // Ghi log
      const logEl = document.getElementById('weekendLog');
      if (logEl) logEl.textContent = `Đã bỏ: ${nameToRemove}`;
      
      // Render lại giao diện
      renderWeekendList();
      await saveWeekendPool();
    }
  };
}
// Gọi hàm này 1 lần ở cuối file (trong hàm init) hoặc để nguyên IIFE nếu muốn
setupWeekendRemoveHandler();


function setupWeekendAutoRefresh() {
  if (weekendAutoRefreshTimer) clearInterval(weekendAutoRefreshTimer);
  
  // Chạy mỗi 30 giây để kiểm tra
  weekendAutoRefreshTimer = setInterval(async () => {
    const modal = document.getElementById('weekendModal');
    // 1. Nếu modal đang đóng hoặc đang quay thưởng thì không làm gì cả
    if (!modal || modal.classList.contains('hidden') || isSpinning) return;

    const currentPeriod = getCurrentTimePeriod();
    const savedBuiltFor = weekendPool.builtFor;

    // 2. TRƯỜNG HỢP 1: CHUYỂN CA LỚN (Ví dụ: 11:59 -> 12:00)
    // Nếu giai đoạn thời gian (builtFor) đã thay đổi so với lúc tạo pool
    if (savedBuiltFor && savedBuiltFor !== currentPeriod) {
      console.log(`[AutoRefresh] Phát hiện chuyển ca: ${savedBuiltFor} -> ${currentPeriod}`);
      // Gọi lại hàm mở modal để nó tự động chạy logic "Lọc và Gộp danh sách"
      await openWeekendModal(); 
      showToast(`Đã cập nhật danh sách sang ca: ${currentPeriod === 'afternoon_hc_ct' ? 'Chiều' : 'Tối/OT'}`);
      return;
    }

    // 3. TRƯỜNG HỢP 2: TRONG CÙNG CA NHƯNG CÓ NGƯỜI HẾT GIỜ (Ví dụ: OT đến 18:30, giờ là 18:31)
    // Lấy danh sách những người "còn sống" dựa trên giờ hiện tại
    const liveCandidates = getLiveWeekendCandidates();
    
    // Đếm số lượng phần tử đang hiển thị trên giao diện
    const currentRenderedCount = document.querySelectorAll('#weekendList .weekend-item').length;

    // Nếu số lượng thực tế khác số lượng đang hiển thị -> Có người vừa hết giờ
    if (liveCandidates.length !== currentRenderedCount) {
       console.log('[AutoRefresh] Phát hiện có nhân viên hết giờ làm, render lại danh sách.');
       renderWeekendList(); // Vẽ lại để ẩn những người vừa hết giờ
    }

  }, 30000); // Check mỗi 30 giây
}


// === 4. KHỞI TẠO ỨNG DỤNG ===
async function init() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.style.display = 'flex';

  // --- GẮN SỰ KIỆN WEEKEND NGAY LẬP TỨC ---
  document.getElementById('btnWeekendDuty')?.addEventListener('click', (e) => {
    e.preventDefault();
    openWeekendModal();
  });

  // --- THÊM ĐOẠN NÀY VÀO ĐÂY (Logic nút Ghim) ---
  const btnPinWeekend = document.getElementById('btnPinWeekend');
  if (btnPinWeekend) {
    btnPinWeekend.addEventListener('click', async () => {
      // Đảo ngược trạng thái
      isMiniMode = !isMiniMode;
      
      // 1. Gọi xuống Main để resize cửa sổ
      await window.api.setMiniMode(isMiniMode);

      // 2. Cập nhật giao diện (CSS Class & Nút bấm)
      if (isMiniMode) {
        document.body.classList.add('mini-mode');
        btnPinWeekend.title = "Bỏ ghim (Quay lại giao diện đầy đủ)";
        btnPinWeekend.style.background = "#e0e7ff"; // Highlight nút màu xanh nhạt
        btnPinWeekend.innerHTML = "📌"; // Có thể đổi icon nếu muốn
      } else {
        document.body.classList.remove('mini-mode');
        btnPinWeekend.title = "Ghim ra màn hình";
        btnPinWeekend.style.background = "";
      }
    });
  }
  // ------------------------------------------------

  document.getElementById('weekendClose')?.addEventListener('click', closeWeekendModal);
  document.getElementById('weekendBackdrop')?.addEventListener('click', closeWeekendModal);
  document.getElementById('weekendSpinBtn')?.addEventListener('click', spinWeekendOnce);
  document.getElementById('weekendResetBtn')?.addEventListener('click', resetWeekendPool);
  // --- HẾT PHẦN MỚI ---

  setupWeekendAutoRefresh();

  try {
    // 1) Thiết lập ngày
    datePicker.value = todayISO();
    state.dateISO = datePicker.value;

    // 2) Thử tải Cloud trước
    const cloudSuccess = await pullRosterFromCloud();

    if (!cloudSuccess) {
      const resp = await window.api.loadRoster();
      state.employees = (resp.employees || []).map(normalizeEmployee);
      state.teams = resp.teams || [
        { name: 'Lead', color: '#dc2626' },
        { name: 'Vẽ', color: '#a855f7' },
        { name: 'Lịch', color: '#2563eb' },
        { name: 'Đào tạo', color: '#16a34a' },
        { name: '2D', color: '#6b7280' },
      ];
    }

    // 3) Tải trạng thái ngày hôm nay
    await loadDay();
    const { history } = await window.api.loadDutyHistory();
    dutyHistory = history || {};
    // 4) Render lại giao diện
    renderTable();
    setupChipFilters();

  } catch (err) {
    console.error('Init error:', err);
    // Có lỗi vẫn cho dùng modal weekend vì listener đã gắn ở trên
  } finally {
    if (overlay) overlay.style.display = 'none';
  }
}

// --- Hàm tiện ích: Xóa dấu Tiếng Việt ---
function removeVietnameseTones(str) {
    if (!str) return '';
    str = str.toLowerCase();
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    // Bỏ các ký tự đặc biệt nếu cần, nhưng giữ lại dấu cách
    str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, ""); 
    str = str.replace(/\u02C6|\u0306|\u031B/g, ""); 
    return str.trim();
}

function setupDateRangeSelector() {
  const selector = document.querySelector('.date-range-selector');
  if (!selector) return;

  selector.addEventListener('click', (e) => {
    const target = e.target.closest('.range-btn');
    if (!target) return;

    // Bỏ active ở tất cả các nút
    selector.querySelectorAll('.range-btn').forEach(btn => btn.classList.remove('active'));
    // Thêm active cho nút được click
    target.classList.add('active');

    const days = parseInt(target.dataset.days, 10);
    // Vẽ lại biểu đồ với số ngày mới
    fetchAndRenderStatsChart(days);
  });
}

// Gọi hàm setup này
setupDateRangeSelector();

function openStatsModal() {
  const modal = $('#statsModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');

  // Lấy số ngày từ nút đang active và vẽ biểu đồ
  const activeButton = document.querySelector('.range-btn.active');
  const days = activeButton ? parseInt(activeButton.dataset.days, 10) : 7;
  fetchAndRenderStatsChart(days);

  // === THÊM ĐOẠN CODE NÀY VÀO ===
  // Bắt đầu tự động tải lại sau mỗi 30 giây
  if (statsAutoReloadInterval) clearInterval(statsAutoReloadInterval); // Xóa interval cũ nếu có
  statsAutoReloadInterval = setInterval(reloadTodayStats, 30000); // 30000ms = 30 giây
  // === KẾT THÚC PHẦN THÊM MỚI ===
}

function closeStatsModal() {
  const modal = $('#statsModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');

  // === THÊM ĐOẠN CODE NÀY VÀO ===
  // Dừng tự động tải lại khi đóng modal
  if (statsAutoReloadInterval) {
    clearInterval(statsAutoReloadInterval);
    statsAutoReloadInterval = null; // Dọn dẹp ID
  }
  // === KẾT THÚC PHẦN THÊM MỚI ===
}

// ==========================================================
// === LOGIC CHECK PULL MỚI (Dán Text -> Phân tích) ===
// ==========================================================

const pullCheckModal = $('#pullCheckModal');
const pasteMeearArea = $('#pasteMeearArea');
const pasteBlurArea = $('#pasteBlurArea');
const pullCheckResult = $('#pullCheckResult');
const listMissingHC = $('#listMissingHC');
const listMissingEve = $('#listMissingEve');
const countMissingHC = $('#countMissingHC');
const countMissingEve = $('#countMissingEve');

const pullCheckDateDisplay = $('#pullCheckDateDisplay'); // <--- Thêm biến này

// 1. Hàm mở Modal (ĐÃ CẬP NHẬT: Không reset dữ liệu)
function openPullCheckModal() {
  // Lấy ngày đang chọn trên lịch để hiển thị cho đúng context
  const currentDate = $('#datePicker').value; 
  const [y, m, d] = currentDate.split('-');
  pullCheckDateDisplay.textContent = `${d}/${m}/${y}`;

  // --- ĐÃ XÓA CÁC DÒNG RESET DƯỚI ĐÂY ---
  // pasteMeearArea.value = '';
  // pasteBlurArea.value = '';
  // pullCheckResult.style.display = 'none';
  // ---------------------------------------
  
  // Nếu trước đó đã có kết quả phân tích (đang hiện), thì giữ nguyên
  // Nếu chưa có (display='none') thì thôi.
  
  pullCheckModal.classList.remove('hidden');
  pullCheckModal.setAttribute('aria-hidden', 'false');
  
  // Chỉ focus nếu ô trống
  if (!pasteMeearArea.value) {
    setTimeout(() => pasteMeearArea.focus(), 50);
  }
}

// 2. Hàm đóng Modal
function closePullCheckModal() {
  pullCheckModal.classList.add('hidden');
  pullCheckModal.setAttribute('aria-hidden', 'true');
}

// 3. Hàm Parse dữ liệu (Quan trọng)
// Input: Text dán từ bảng
// Output: Mảng các tên đã chuẩn hóa
function parsePullData(text) {
  const lines = text.split('\n');
  const foundNames = new Set();

  lines.forEach(line => {
    line = line.trim();
    if (!line) return;
    
    // Bỏ qua các dòng tiêu đề hoặc tổng
    if (line.startsWith('Designer') || line.startsWith('Tổng cộng')) return;

    // Xử lý dòng: "Nguyễn Văn A (Mã) 2 0 1..."
    // Thường copy từ bảng sẽ ngăn cách bởi Tab (\t)
    let rawName = '';
    
    if (line.includes('\t')) {
      // Nếu có Tab, tên là cột đầu tiên
      rawName = line.split('\t')[0];
    } else {
      // Nếu không có Tab (copy space), cố gắng lấy phần text trước số đầu tiên
      // Regex: Lấy từ đầu dòng đến trước chữ số đầu tiên
      const match = line.match(/^([^\d]+)/); 
      if (match) {
        rawName = match[1];
      } else {
        rawName = line; // Fallback
      }
    }

    // Làm sạch tên bằng hàm cleanNameForMatching (đã có ở bài trước)
    // Nếu chưa có hàm đó thì dùng logic đơn giản này:
    const clean = rawName
      .toLowerCase()
      .replace(/\(.*?\)/g, '') // Bỏ (NKH)...
      .split('-')[0]           // Bỏ - 3D...
      .trim();

    if (clean) foundNames.add(clean);
  });

  return foundNames;
}

// --- Code mới cho file renderer.js ---

// 1. Hàm Phân tích (Core Logic) - Đã cập nhật để lấy thêm thông tin Team
function analyzePullData() {
  const meearText = $('#pasteMeearArea').value;
  const blurText = $('#pasteBlurArea').value;

  if (!meearText && !blurText) {
    showToast('⚠️ Bạn chưa dán dữ liệu nào cả!');
    return;
  }

  const pulledMeear = parsePullData(meearText);
  const pulledBlur = parsePullData(blurText);

  const missingHC = [];
  const missingEve = [];

  (state.employees || []).forEach(emp => {
    // Lọc bỏ Lead/Vẽ
    const team = (emp.team || '').trim(); // Lấy tên team chuẩn
    const teamLower = team.toLowerCase();
    if (teamLower.includes('lead') || teamLower === 'vẽ' || teamLower === 've' || teamLower.includes('team vẽ')) {
        return; 
    }

    const st = normStatus(state.statuses[emp.name] || {});
    const offVal = st.off || null;
    const isEvening = !!st.evening;
    const empNameClean = cleanNameForMatching(emp.name);

    const inMeear = [...pulledMeear].some(n => empNameClean.includes(n) || n.includes(empNameClean));
    const inBlur = [...pulledBlur].some(n => empNameClean.includes(n) || n.includes(empNameClean));

    if (inMeear && inBlur) return; 

    let missingType = 'both';
    if (inMeear && !inBlur) missingType = 'blur';
    if (!inMeear && inBlur) missingType = 'meear';

    // Đẩy đủ thông tin: Tên, Team, Loại thiếu
    const missingItem = { name: emp.name, type: missingType, team: team };

    if (offVal === 'allday') return;

    if (isEvening) {
      if (offVal !== 'afternoon' && offVal !== 'allday') {
         missingEve.push(missingItem);
      }
    } else {
      if (offVal !== 'allday') { 
         missingHC.push(missingItem);
      }
    }
  });

  // Gọi hàm render mới với ID suffix ('HC' hoặc 'Eve')
  renderPullResult('HC', missingHC);
  renderPullResult('Eve', missingEve);

  $('#pullCheckResult').style.display = 'block';
}

// 2. Hàm Render Kết Quả Pull (Đã Fix lỗi tìm kiếm Tiếng Việt)
function renderPullResult(suffix, listData) {
  const ul = document.getElementById(`listMissing${suffix}`);
  const countSpan = document.getElementById(`countMissing${suffix}`);
  const tagsDiv = document.getElementById(`tagsMissing${suffix}`);
  const searchInput = document.getElementById(`searchMissing${suffix}`);
  const btnCopy = document.getElementById(`btnCopyMissing${suffix}`); // Lấy nút copy

  if (!ul) return;

  // Reset UI
  ul.innerHTML = '';
  tagsDiv.innerHTML = '';
  searchInput.value = ''; 
  
  const updateCount = () => {
    // Chỉ đếm những dòng đang hiển thị (không bị ẩn bởi search)
    const visibleItems = ul.querySelectorAll('li:not(.hidden-by-search)');
    countSpan.textContent = visibleItems.length;
    
    if (visibleItems.length === 0 && ul.children.length === 0) {
       ul.innerHTML = `
        <div class="empty-state-small">
          <span style="font-size: 20px;">✅</span>
          <span>Đã pull đủ cả 2 site!</span>
        </div>`;
    }
  };

  if (listData.length === 0) {
    updateCount();
    return;
  }

  // --- RENDER LIST ---
  listData.forEach(item => {
    const li = document.createElement('li');
    li.className = 'missing-item';
    li.dataset.team = item.team; 
    
    // Tạo chuỗi tìm kiếm không dấu
    const searchString = removeVietnameseTones(`${item.name} ${item.team}`);
    li.dataset.search = searchString; 

    let badgeClass = '', badgeText = '';
    if (item.type === 'both')  { badgeClass = 'missing-both'; badgeText = 'Thiếu cả 2'; }
    else if (item.type === 'meear') { badgeClass = 'missing-meear'; badgeText = 'Thiếu Meear'; }
    else if (item.type === 'blur')  { badgeClass = 'missing-blur'; badgeText = 'Thiếu Blur'; }

    // Thay nút 🗑️ thành ✅
    li.innerHTML = `
      <div class="missing-content">
        <div style="display:flex; flex-direction:column; line-height:1.2;">
           <span class="missing-name">${item.name}</span>
           <span style="font-size:10px; color:#9ca3af;">${item.team}</span>
        </div>
        <span class="tag-note ${badgeClass}">${badgeText}</span>
      </div>
      <button class="btn-mark-done" title="Đã check / Xin đơn" tabindex="-1">✅</button>
    `;

    // Sự kiện Click dấu Tick (Check) -> Xóa dòng
    li.querySelector('.btn-mark-done').addEventListener('click', () => {
        // Hiệu ứng mờ dần rồi biến mất
        li.style.opacity = '0';
        setTimeout(() => {
             li.remove();
             updateCount();
        }, 150);
    });

    ul.appendChild(li);
  });
  
  countSpan.textContent = listData.length;

  // --- RENDER TAGS ---
  const teams = [...new Set(listData.map(i => i.team).filter(Boolean))].sort();
  teams.forEach(teamName => {
    const tag = document.createElement('span');
    tag.className = 'team-filter-tag';
    tag.textContent = `Bỏ ${teamName}`;
    tag.title = `Check tất cả người thuộc team ${teamName}`;
    tag.addEventListener('click', () => {
        const itemsToRemove = ul.querySelectorAll(`li[data-team="${teamName}"]`);
        itemsToRemove.forEach(el => el.remove());
        tag.remove();
        updateCount();
    });
    tagsDiv.appendChild(tag);
  });

  // --- LOGIC TÌM KIẾM ---
  const newSearch = searchInput.cloneNode(true);
  searchInput.parentNode.replaceChild(newSearch, searchInput);

  newSearch.addEventListener('input', (e) => {
    const term = removeVietnameseTones(e.target.value);
    const items = ul.querySelectorAll('li.missing-item');
    
    items.forEach(li => {
       const searchSource = li.dataset.search || '';
       if (searchSource.includes(term)) {
         li.classList.remove('hidden-by-search');
         li.style.display = '';
       } else {
         li.classList.add('hidden-by-search');
         li.style.display = 'none';
       }
    });
    // Cập nhật lại số lượng hiển thị khi search
    const visibleNow = ul.querySelectorAll('li:not(.hidden-by-search)').length;
    countSpan.textContent = visibleNow;
  });

  // --- LOGIC NÚT COPY (MỚI) ---
  if (btnCopy) {
      // Clone để xóa event listener cũ nếu có
      const newBtnCopy = btnCopy.cloneNode(true);
      btnCopy.parentNode.replaceChild(newBtnCopy, btnCopy);

      newBtnCopy.addEventListener('click', async () => {
          // Chỉ copy những người đang HIỂN THỊ (không bị ẩn bởi search)
          const visibleItems = ul.querySelectorAll('li:not(.hidden-by-search) .missing-name');
          
          if (visibleItems.length === 0) {
              showToast('⚠️ Danh sách trống, không có gì để copy!');
              return;
          }

          // Tạo nội dung copy
          const names = Array.from(visibleItems).map(span => span.textContent.trim());
          const content = `Pull thiếu\n\n${names.join('\n')}`;

          try {
              await window.api.copyText(content);
              showToast(`✅ Đã copy ${names.length} cái tên!`);
          } catch (err) {
              showToast('❌ Lỗi copy clipboard');
          }
      });
  }
}

// --- DÁN VÀO CUỐI FILE renderer.js ---

// Hàm làm sạch tên để so sánh (Bỏ ngoặc, bỏ đuôi team...)
function cleanNameForMatching(fullName) {
  if (!fullName) return '';
  return fullName
    .toLowerCase()             // Chuyển thành chữ thường
    .replace(/\(.*?\)/g, '')   // Bỏ phần trong ngoặc như (DK), (NH)
    .split('-')[0]             // Cắt bỏ phần sau dấu gạch ngang ( - 2D)
    .replace(/\d+$/, '')       // Bỏ số ở cuối tên nếu có
    .trim();                   // Xóa khoảng trắng thừa
}

// ==========================================================
// === KPI CALCULATION MODULE (FINAL VERSION) ===
// ==========================================================

// 1. Danh sách MẶC ĐỊNH (Dùng khi chưa có cấu hình riêng hoặc khi reset)
const DEFAULT_LIST_2D = [
  "Tăng Duy Khánh (DK)", "Ngô Sĩ Hùng (NH)", "Hà Duy Nam (DN)", "Nguyễn Xuân Vinh (XV)",
  "Trần Hồng Quân (TQ)", "Đoàn Thanh Huyền (TH)", "Lê Minh Hiếu (LH)", "Phạm Thị Lan Phương (LP) - Online",
  "Trần Đức Tuấn (TT)", "Hoàng Anh Toàn (AT)", "Nguyễn Hải Nam (NN) - Team Đào Tạo",
  "Nguyễn Dạ Thảo (NT)", "Đặng Ngọc Huyền Trinh (HT)", "Nguyễn Xuân Duy (XD)",
  "Vũ Thị Huyền Trang 2K (VT) - Team Đào Tạo", "Trần Thị Huyền Trang (THT) - Team Đào Tạo",
  "Vũ Tiến Đạt (TD)", "Nguyễn Ánh Dương (AD)", "Vũ Minh Trí (MT)", "Phan Nhật Anh (PA)",
  "Kiều Quang Khanh (KQK)", "Đỗ Đắc Đức (DDD)", "Nguyễn Đức Huy (DH)", "Chu Hoàng Nam (NC)",
  "Nguyễn Phương Thúy (TNP)", "Nguyễn Văn Tú 01 (NVT)", "Nguyễn Anh Tú (NAT)",
  "Nguyễn Quang Duy (NQD)", "Nguyễn Thị Hằng Ngân (NTHN)", "Bùi Văn Tân (BVT) - Idea",
  "Trần Thị Thùy Trang (TTT) - Team Đào Tạo", "Nguyễn Kim Hoàng ( NKH ) - Team Đào Tạo",
  "Bùi Thị Tú Anh ( BTTA ) - Team Đào Tạo", "Lê Quang Huy (QH) - Team Đào Tạo",
  "Nguyễn Hoàng Huy (NHH) - Team Đào Tạo", "Nguyễn Thị Diệp (NTD)", "Nguyễn Văn Định (NVD)",
  "Nguyễn Ngọc Phụng (NNP)", "Lê Thị Quyên (LTQ) - Team Đào Tạo", "Đặng Ngọc Long (ĐNL)",
  "Đỗ Minh Quyền (ĐMQ)", "Vũ Văn Ninh (VVN)", "Nguyễn Trung Hưởng (NTH)", "Nguyễn Xuân Sơn (XS)",
  "Đỗ Thị Thảo (DT)", "Mai Hồng Khanh (MHK) - Vẽ", "Hoàng Thị Thùy Linh ( HTL ) - Vẽ",
  "Hoàng Yến Linh (YL) - Vẽ", "Nguyễn Hoàng Phương - Vẽ - Video 2D", "Nguyễn Thục Mỹ (NTM) - Vẽ",
  "Phạm Minh Hiếu (PMH) - Vẽ", "Nguyễn Thị Nga (NTN)", "Bùi Thu Phương (BTP) - Lịch",
  "Nguyễn Ngọc Ánh (NNA) - Lịch", "Nguyễn Văn Lịch (NVL) - Lịch", "Trịnh Thu Hà (TTH) - Lịch",
  "Nguyễn Thị Thúy (NTT2) - Lịch", "Trần Ngọc Trà My (TM) - 2D - Online - Team Gỗ",
  "Trần Kim Đức(TKĐ) - 2D - Online", "Phạm Thị Hồng Nhung (PTHN) - 2D - Online",
  "Vũ Thu Uyên (VTU)", "Nguyễn Ngọc Duy (NND)", "Đặng Thị Minh Thanh - (ĐTMT) Idea",
  "Vũ Minh Đức (VMĐ)", "Trần Quang Huy (TQH) - Vẽ", "Hồ Thu Hà (HTH) - Vẽ"
];

const DEFAULT_LIST_3D = [
  "Chu Thị Giang (CG) - 3D", "Nguyễn Ngọc Anh (NA) - 3D - Team Đào Tạo",
  "Phạm Thị Thùy Trang (PTT) - 3D", "Phạm Thị Hoài (PH) - 3D", "Lê Thanh Tùng ( LT ) - 3D",
  "Nguyễn Thúy Quỳnh (NQ) - 3D", "Nguyễn Thị Toàn (NTT) - 3D - Team Đào Tạo",
  "Chu Bá Chiến - 3D", "Trần Minh Hiếu (TMH) - 3D", "Trần Đình Thắng (TDT) - 3D - Team Đào Tạo",
  "Nguyễn Hải Yến (NHY) - 3D", "Đinh Thương Huyền ( DTH) - 3D", "Nguyễn Hoàng Phi (NHP) - 3D",
  "Nguyễn Xuân Hậu (XH) - 3D", "Nguyễn Phương Nam (NPN) - 3D", "Nguyễn Trường Sơn ( NTS ) - 3D",
  "Nguyễn Nho Tùng (NNT) - 3D", "Đỗ Hoài Nam (DHN) - 3D", "Khổng Đức Anh (KDA) - 3D",
  "Nguyễn Thị Thương (TTN) - 3D", "Vũ Hồng Thái (TV) - 3D", "Nguyễn Thị Khánh Ly (NTKL) - 3D",
  "Trần Thị Ngọc Trâm (TTNT) - 3D", "Nguyễn Đức Công (NDC) - 3D", "Nguyễn Hữu Cường (NHC) - 3D",
  "Phạm Văn Trường (PVT) - 3D", "Trần Ngọc Trung Hiếu (TNTH) - 3D", "Trần Đức Thắng (DT) - 3D",
  "Đặng Hải Yến (DHY) - 3D", "Nguyễn Thị Yến (NTY) - 3D", "Nguyễn Văn Tú 02 (NVT2) - 3D",
  "Phạm Thị Trang Anh (PTTA) - 3D", "Nguyễn Văn Tuấn ( VTTV) - 3D", "Nguyễn Thành Minh (NTM) - 3D",
  "Lê Anh Tuấn (LAT) - 3D", "Nguyễn Thanh Hương (NTH) - 3D", "Dương Thị Giang (DTG)- 3D",
  "Trần Thành Đạt (TTĐ) - 3D", "Vũ Công Toàn (VCT) - 3D", "Nguyễn Văn Duy (NVD) - 3D",
  "Trần Thị Giang (TTG) - 3D", "Nguyễn Trọng Dũng (NTD) - 3D"
];

// Biến lưu danh sách đang sử dụng (Load từ Store hoặc dùng Default)
let activeList2D = [...DEFAULT_LIST_2D];
let activeList3D = [...DEFAULT_LIST_3D];
let currentKpiData = [];

// Hàm khởi tạo: Tải danh sách tùy chỉnh từ Store (nếu có)
async function loadKpiLists() {
  try {
    if (window.api && window.api.getKpiLists) {
        const data = await window.api.getKpiLists();
        if (data.list2d && Array.isArray(data.list2d) && data.list2d.length > 0) {
          activeList2D = data.list2d;
        }
        if (data.list3d && Array.isArray(data.list3d) && data.list3d.length > 0) {
          activeList3D = data.list3d;
        }
        console.log("Đã tải danh sách KPI tùy chỉnh.");
    }
  } catch (e) {
    console.error("Không thể tải danh sách KPI (có thể do chưa setup main.js), dùng mặc định.", e);
  }
}
// Gọi ngay khi chạy
loadKpiLists();

// 2. Các hàm xử lý
const kpiModal = $('#kpiModal');

// Hàm Parse dữ liệu text sang Map { name_clean: kpi_value }
// (Phiên bản nâng cấp: Nhận diện header thông minh)
function parseKpiInput(text) {
  const map = new Map();
  if (!text) return map;

  const lines = text.split('\n');
  let nameIdx = -1;
  let kpiIdx = -1;
  let startRow = -1;

  // Cấu hình từ khóa để dò cột
  const kpiHeaders = ['kpi đã làm', 'kpi da lam', 'kpi', 'kpi thực đạt']; 
  const nameHeaders = ['designer', 'tên', 'ten', 'họ và tên', 'staff name'];

  // BƯỚC 1: Dò tìm dòng tiêu đề (quét 20 dòng đầu)
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const row = lines[i].toLowerCase().split(/\t/).map(c => c.trim());
    
    // Tìm vị trí cột KPI (ưu tiên chính xác)
    let foundK = -1;
    for (const kHeader of kpiHeaders) {
        const idx = row.indexOf(kHeader);
        if (idx !== -1) { foundK = idx; break; }
    }

    // Tìm vị trí cột Tên
    let foundN = -1;
    for (const nHeader of nameHeaders) {
        const idx = row.indexOf(nHeader);
        if (idx !== -1) { foundN = idx; break; }
    }

    if (foundK !== -1 && foundN !== -1) {
        kpiIdx = foundK;
        nameIdx = foundN;
        startRow = i + 1;
        break;
    }
  }

  // BƯỚC 2: Nếu không tìm thấy header, thử fallback sang logic cũ (nếu cần) hoặc trả về rỗng
  if (startRow === -1) return map; 

  // BƯỚC 3: Quét dữ liệu
  for (let i = startRow; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(/\t/);
    if (parts.length <= Math.max(nameIdx, kpiIdx)) continue;

    const rawName = parts[nameIdx].trim();
    let rawVal = parts[kpiIdx].trim();

    // Xử lý số liệu (bỏ dấu phẩy)
    rawVal = rawVal.replace(/,/g, '');
    const val = parseFloat(rawVal) || 0;

    const cleanKey = cleanNameForKpi(rawName);
    if (cleanKey) {
        const current = map.get(cleanKey) || 0;
        map.set(cleanKey, current + val);
    }
  }
  return map;
}

// Hàm làm sạch tên để khớp lệnh
function cleanNameForKpi(name) {
  if (!name) return '';
  return name.toLowerCase()
    .replace(/\(.*?\)/g, '')    // Bỏ (DK), (NH)...
    .split('-')[0]              // Bỏ tất cả phần sau dấu gạch ngang
    .replace(/2d|3d/g, '')      // Bỏ chữ 2d, 3d
    .trim();
}

// Hàm logic chính: Tính và Render
function calculateAndRenderKpi() {
  const meearMap = parseKpiInput($('#txtKpiMeear').value);
  const blurMap = parseKpiInput($('#txtKpiBlur').value);
  const printMap = parseKpiInput($('#txtKpiPrint').value);

  const tbody = $('#tbodyKpi');
  tbody.innerHTML = '';
  currentKpiData = [];

  // Helper render từng dòng
  const renderRow = (originalName, index) => {
    const cleanKey = cleanNameForKpi(originalName);
    
    const vMeear = meearMap.get(cleanKey) || 0;
    const vBlur = blurMap.get(cleanKey) || 0;
    const vPrint = printMap.get(cleanKey) || 0;
    const total = vMeear + vBlur + vPrint;

    // Lưu data (Thứ tự trong object JS không quan trọng)
    currentKpiData.push({ name: originalName, meear: vMeear, blur: vBlur, print: vPrint, total });

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index}</td>
      <td style="font-weight:500">${originalName}</td>
      <td class="col-num" style="color:#16a34a">${vPrint > 0 ? vPrint : '-'}</td>
      <td class="col-num" style="color:#2563eb">${vBlur > 0 ? vBlur : '-'}</td>
      <td class="col-num" style="color:#ea580c">${vMeear > 0 ? vMeear : '-'}</td>
      <td class="col-num" style="font-weight:bold">${total > 0 ? total : '-'}</td>
    `;
    return tr;
  };

  // Render theo activeList2D
  const trHead2D = document.createElement('tr');
  trHead2D.className = 'row-group-header';
  trHead2D.innerHTML = `<td colspan="6">TEAM 2D (${activeList2D.length})</td>`;
  tbody.appendChild(trHead2D);
  activeList2D.forEach((name, i) => tbody.appendChild(renderRow(name, i + 1)));

  // Render theo activeList3D
  const trHead3D = document.createElement('tr');
  trHead3D.className = 'row-group-header';
  trHead3D.innerHTML = `<td colspan="6">TEAM 3D (${activeList3D.length})</td>`;
  tbody.appendChild(trHead3D);
  activeList3D.forEach((name, i) => tbody.appendChild(renderRow(name, i + 1)));

  $('#kpiResultContainer').classList.remove('hidden');
}

// Hàm Copy (Thứ tự: Print -> Blur -> Meear)
async function copyKpiToClipboard() {
  if (!currentKpiData.length) return;
  
  // Format: Tên [TAB] Print [TAB] Blur [TAB] Meear
  const text = currentKpiData.map(item => {
    return `${item.name}\t${item.print}\t${item.blur}\t${item.meear}`;
  }).join('\n');

  try {
    await window.api.copyText(text);
    showToast('✅ Đã copy! (Thứ tự: Print ➔ Blur ➔ Meear)');
  } catch (err) {
    showToast('❌ Lỗi copy.');
  }
}

// --- XỬ LÝ SỰ KIỆN ---

// Mở modal KPI
$('#btnOpenKpiModal')?.addEventListener('click', () => {
  kpiModal.classList.remove('hidden');
  kpiModal.setAttribute('aria-hidden', 'false');
});

// Đóng modal KPI
const closeKpiModal = () => {
  kpiModal.classList.add('hidden');
  kpiModal.setAttribute('aria-hidden', 'true');
};
$('#kpiModalX')?.addEventListener('click', closeKpiModal);
$('#kpiModalBackdrop')?.addEventListener('click', closeKpiModal);
$('#btnKpiCancel')?.addEventListener('click', closeKpiModal);

// Nút Tính toán & Copy
$('#btnAnalyzeKpi')?.addEventListener('click', calculateAndRenderKpi);
$('#btnCopyKpi')?.addEventListener('click', copyKpiToClipboard);


// --- XỬ LÝ CẤU HÌNH DANH SÁCH (Config Modal) ---
const kpiConfigModal = $('#kpiConfigModal');

// Mở modal config
$('#btnConfigKpiList')?.addEventListener('click', () => {
  $('#txtConfig2D').value = activeList2D.join('\n');
  $('#txtConfig3D').value = activeList3D.join('\n');
  kpiConfigModal.classList.remove('hidden');
});

// Đóng modal config
const closeConfig = () => kpiConfigModal.classList.add('hidden');
$('#btnCloseKpiConfig')?.addEventListener('click', closeConfig);
$('#btnCancelKpiConfig')?.addEventListener('click', closeConfig);

// Lưu danh sách mới
$('#btnSaveKpiConfig')?.addEventListener('click', async () => {
  const newList2D = $('#txtConfig2D').value.split('\n').map(s => s.trim()).filter(s => s);
  const newList3D = $('#txtConfig3D').value.split('\n').map(s => s.trim()).filter(s => s);

  if (newList2D.length === 0 && newList3D.length === 0) {
    showToast('⚠️ Danh sách trống!');
    return;
  }

  activeList2D = newList2D;
  activeList3D = newList3D;

  if (window.api && window.api.saveKpiLists) {
      await window.api.saveKpiLists({ list2d: activeList2D, list3d: activeList3D });
  }
  
  showToast('✅ Đã lưu danh sách mới!');
  closeConfig();
  
  if (!$('#kpiResultContainer').classList.contains('hidden')) {
      calculateAndRenderKpi();
  }
});

// Reset về mặc định
$('#btnResetDefaultList')?.addEventListener('click', () => {
  if(confirm('Khôi phục về danh sách gốc ban đầu?')) {
      $('#txtConfig2D').value = DEFAULT_LIST_2D.join('\n');
      $('#txtConfig3D').value = DEFAULT_LIST_3D.join('\n');
  }
});

// 3. Gắn sự kiện
$('#btnOpenKpiModal')?.addEventListener('click', () => {
  kpiModal.classList.remove('hidden');
  kpiModal.setAttribute('aria-hidden', 'false');
});

$('#kpiModalX')?.addEventListener('click', () => {
  kpiModal.classList.add('hidden');
  kpiModal.setAttribute('aria-hidden', 'true');
});

$('#kpiModalBackdrop')?.addEventListener('click', () => {
  kpiModal.classList.add('hidden');
  kpiModal.setAttribute('aria-hidden', 'true');
});

$('#btnKpiCancel')?.addEventListener('click', () => {
  kpiModal.classList.add('hidden');
});

$('#btnAnalyzeKpi')?.addEventListener('click', calculateAndRenderKpi);
$('#btnCopyKpi')?.addEventListener('click', copyKpiToClipboard);

// 6. Gắn sự kiện
$('#btnOpenPullCheck')?.addEventListener('click', openPullCheckModal);
$('#pullCheckX')?.addEventListener('click', closePullCheckModal);
$('#pullCheckCancel')?.addEventListener('click', closePullCheckModal);
$('#btnAnalyzePull')?.addEventListener('click', analyzePullData);

// Gắn sự kiện cho các nút
$('#btnReloadStats')?.addEventListener('click', reloadTodayStats);
$('#btnOpenStatsModal')?.addEventListener('click', openStatsModal);
$('#statsModalClose')?.addEventListener('click', closeStatsModal);
$('#statsModalBackdrop')?.addEventListener('click', closeStatsModal);
$('#btnOpenPasteModal')?.addEventListener('click', openPasteModal);
$('#pasteModalBackdrop')?.addEventListener('click', closePasteModal);
$('#pasteModalX')?.addEventListener('click', closePasteModal);
$('#pasteModalCancel')?.addEventListener('click', closePasteModal);
$('#pasteModalApply')?.addEventListener('click', handlePasteApply);
$('#btnCancelOt').addEventListener('click', closeOtModal);
// Chạy hàm khởi tạo
init();
