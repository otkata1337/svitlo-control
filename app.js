// app.js — СвітлоКонтроль (з інтеграцією API сервера)

const CITIES = {
    'smila': 'м. Сміла',
    'cherkasy': 'м. Черкаси',
    'umany': 'м. Умань',
    'zolotonosha': 'м. Золотоноша',
    'kaniv': 'м. Канів',
    'smila_district': 'Смілянський район'
};

// Конфігурація API (локальна розробка або хостинг)
const API_BASE_URL = 'https://svitlo-control-production.up.railway.app'; // Змінити на URL сервера при деплою

let userConfig = {
    city: localStorage.getItem('svitlo_city') || 'smila',
    queue: localStorage.getItem('svitlo_queue') || '3.1'
};

let schedules = {}; // Графіки з сервера

// DOM Elements
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const citySelect = document.getElementById('city-select');
const queueSelect = document.getElementById('queue-select');
const currentLocationLabel = document.getElementById('current-location-label');

const statusCard = document.getElementById('status-card');
const statusGlow = document.getElementById('status-glow');
const statusBadge = document.getElementById('status-badge');
const statusIconContainer = document.getElementById('status-icon-container');
const statusIcon = document.getElementById('status-icon');
const statusTitle = document.getElementById('status-title');
const statusSubtitle = document.getElementById('status-subtitle');
const updateTime = document.getElementById('update-time');
const nextEventTime = document.getElementById('next-event-time');
const nextEventDesc = document.getElementById('next-event-desc');

const todayDateStr = document.getElementById('today-date-str');
const timelineBar = document.getElementById('timeline-bar');
const outageIntervalsEl = document.getElementById('outage-intervals');

// Завантаження графіків з сервера
async function fetchSchedules() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/schedules/cherkasy`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.data) {
            schedules = data.data;
            console.log('✓ Графіки завантажено з сервера');
            localStorage.setItem('svitlo_schedules_cache', JSON.stringify(schedules));
            return true;
        }
    } catch (error) {
        console.warn('⚠ Не вдалося завантажити графіки з сервера:', error.message);

        // Спробуємо завантажити кеш з LocalStorage
        const cached = localStorage.getItem('svitlo_schedules_cache');
        if (cached) {
            schedules = JSON.parse(cached);
            console.log('✓ Використовуємо кешовані графіки');
            return true;
        }

        // Якщо нічого немає — використовуємо дефолт
        schedules = getDefaultSchedules();
        console.log('⚠ Використовуємо дефолтні графіки');
        return false;
    }
}

// Дефолтні графіки (якщо сервер недоступний)
function getDefaultSchedules() {
    const today = new Date();
    const result = {};

    const queues = ['1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '4.1', '4.2', '5.1', '5.2', '6.1', '6.2'];
    const patterns = {
        1: [[6, 0, 8, 0], [12, 0, 14, 0], [18, 0, 20, 0]],
        2: [[8, 0, 10, 0], [14, 0, 16, 0], [20, 0, 22, 0]],
        3: [[7, 0, 11, 0], [15, 0, 19, 0]],
        4: [[10, 0, 14, 0], [18, 0, 22, 0]],
        5: [[6, 0, 9, 0], [13, 0, 16, 0], [20, 0, 23, 0]],
        6: [[9, 0, 12, 0], [16, 0, 19, 0]]
    };

    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        result[dateStr] = {};
        queues.forEach(queue => {
            const queueGroup = Math.floor(parseFloat(queue));
            result[dateStr][queue] = patterns[queueGroup] || [[8, 0, 12, 0], [18, 0, 21, 0]];
        });
    }

    return result;
}

async function initApp() {
    citySelect.value = userConfig.city;
    queueSelect.value = userConfig.queue;
    updateLocationLabel();

    const now = new Date();
    todayDateStr.textContent = now.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });

    // Завантажуємо графіки перед рендеренням
    await fetchSchedules();
    renderSchedule();

    // Оновлення кожні 30 сек
    setInterval(renderSchedule, 30000);

    // Спробуємо оновити графіки кожні 30 хвилин
    setInterval(fetchSchedules, 1800000);
}

function updateLocationLabel() {
    const cityName = CITIES[userConfig.city] || 'м. Сміла';
    currentLocationLabel.textContent = `${cityName} • ${userConfig.queue}`;
}

function getScheduleForToday() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    return schedules[today] ? schedules[today][userConfig.queue] || [] : [];
}

function isOutageAtTime(hour, minute, intervals) {
    const totalMinutes = hour * 60 + minute;
    for (const [sH, sM, eH, eM] of intervals) {
        const start = sH * 60 + sM;
        const end = eH * 60 + eM;
        if (totalMinutes >= start && totalMinutes < end) return true;
    }
    return false;
}

function renderSchedule() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTotal = currentHour * 60 + currentMinute;

    const intervals = getScheduleForToday();
    const currentlyOut = isOutageAtTime(currentHour, currentMinute, intervals);

    // Зміна Hero-карти
    if (currentlyOut) {
        statusCard.className = "relative overflow-hidden rounded-3xl p-7 border transition-all duration-500 shadow-2xl bg-rose-950/40 border-rose-900/60";
        statusGlow.className = "absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-500 bg-rose-500";
        statusBadge.className = "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30";
        statusBadge.textContent = "Немає світла";
        statusIconContainer.className = "w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-inner shrink-0 bg-rose-500/10 border border-rose-500/20 text-rose-400";
        statusIcon.textContent = "🔌";
        statusTitle.textContent = "Електроенергія відсутня";
        statusSubtitle.textContent = `За графіком для черги ${userConfig.queue}`;
    } else {
        statusCard.className = "relative overflow-hidden rounded-3xl p-7 border transition-all duration-500 shadow-2xl bg-emerald-950/30 border-emerald-900/50";
        statusGlow.className = "absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-500 bg-emerald-500";
        statusBadge.className = "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
        statusBadge.textContent = "Світло є";
        statusIconContainer.className = "w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-inner shrink-0 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400";
        statusIcon.textContent = "💡";
        statusTitle.textContent = "Електроенергія є";
        statusSubtitle.textContent = `Мережа працює для черги ${userConfig.queue}`;
    }

    updateTime.textContent = `Оновлено о ${now.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}`;

    // Пошук наступної події
    let nextTimeStr = "—";
    let nextDescStr = "Графік не знайдено";

    if (intervals.length > 0) {
        for (const [sH, sM, eH, eM] of intervals) {
            const start = sH * 60 + sM;
            const end = eH * 60 + eM;

            if (currentlyOut) {
                if (end > currentTotal) {
                    const diff = end - currentTotal;
                    nextTimeStr = `${String(eH).padStart(2,'0')}:${String(eM).padStart(2,'0')}`;
                    nextDescStr = `Увімкнення через ${Math.floor(diff/60)}г ${diff%60}хв`;
                    break;
                }
            } else {
                if (start > currentTotal) {
                    const diff = start - currentTotal;
                    nextTimeStr = `${String(sH).padStart(2,'0')}:${String(sM).padStart(2,'0')}`;
                    nextDescStr = `Вимкнення через ${Math.floor(diff/60)}г ${diff%60}хв`;
                    break;
                }
            }
        }
    }

    nextEventTime.textContent = nextTimeStr;
    nextEventDesc.textContent = nextDescStr;

    // Рендер таймлайна
    timelineBar.innerHTML = '';
    for (let h = 0; h < 24; h++) {
        const hourCol = document.createElement('div');
        hourCol.className = "flex-1 h-full flex flex-col gap-0.5 relative group cursor-pointer";

        for (let q = 0; q < 4; q++) {
            const min = q * 15;
            const isOut = isOutageAtTime(h, min, intervals);

            const qDiv = document.createElement('div');
            qDiv.className = `flex-1 rounded-xs transition-all ${isOut ? 'bg-rose-500/90 hover:bg-rose-400' : 'bg-emerald-500/80 hover:bg-emerald-400'} ${h === currentHour && Math.floor(currentMinute/15) === q ? 'ring-2 ring-white z-10' : ''}`;
            hourCol.appendChild(qDiv);
        }

        timelineBar.appendChild(hourCol);
    }

    // Рендер списку
    outageIntervalsEl.innerHTML = '';
    if (intervals.length === 0) {
        outageIntervalsEl.innerHTML = `<p class="text-xs text-slate-400 col-span-2 py-2">Сьогодні графік не завантажено.</p>`;
    } else {
        intervals.forEach(([sH, sM, eH, eM]) => {
            const card = document.createElement('div');
            card.className = "flex items-center justify-between bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-2xl";

            const timeFormatted = `${String(sH).padStart(2,'0')}:${String(sM).padStart(2,'0')} — ${String(eH).padStart(2,'0')}:${String(eM).padStart(2,'0')}`;
            const durationMin = (eH * 60 + eM) - (sH * 60 + sM);
            const durText = `${Math.floor(durationMin/60) > 0 ? Math.floor(durationMin/60) + ' год ' : ''}${durationMin%60 > 0 ? (durationMin%60) + ' хв' : ''}`;

            card.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></div>
                    <span class="font-mono font-bold text-sm text-slate-200">${timeFormatted}</span>
                </div>
                <span class="text-xs font-medium text-slate-400 bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-800">${durText}</span>
            `;
            outageIntervalsEl.appendChild(card);
        });
    }
}

// Модальне вікно
settingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
closeModalBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) settingsModal.classList.add('hidden');
});

saveSettingsBtn.addEventListener('click', () => {
    userConfig.city = citySelect.value;
    userConfig.queue = queueSelect.value;

    localStorage.setItem('svitlo_city', userConfig.city);
    localStorage.setItem('svitlo_queue', userConfig.queue);

    settingsModal.classList.add('hidden');
    updateLocationLabel();
    renderSchedule();
});

document.addEventListener('DOMContentLoaded', initApp);
