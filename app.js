// app.js — СвітлоКонтроль (з інтеграцією API сервера + пошук черги)

const API_BASE_URL = 'https://svitlo-control-production.up.railway.app';

let userConfig = {
    city: localStorage.getItem('svitlo_city') || 'smila',
    queue: localStorage.getItem('svitlo_queue') || '3.1'
};

let schedules = {};
let foundQueueForApply = null;

// DOM Elements
const findQueueBtn = document.getElementById('find-queue-btn');
const findQueueModal = document.getElementById('find-queue-modal');
const closeFindQueueBtn = document.getElementById('close-find-queue-btn');
const findQueueLocationSelect = document.getElementById('find-queue-location');
const findQueueAddressInput = document.getElementById('find-queue-address');
const searchQueueBtn = document.getElementById('search-queue-btn');
const findQueueResult = document.getElementById('find-queue-result');
const findQueueResultText = document.getElementById('find-queue-result-text');
const findQueueError = document.getElementById('find-queue-error');
const findQueueErrorText = document.getElementById('find-queue-error-text');
const useFoundQueueBtn = document.getElementById('use-found-queue-btn');

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

const lastUpdateTimeEl = document.getElementById('last-update-time');
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');

let lastDataUpdateTime = null;

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
            lastDataUpdateTime = new Date();
            console.log('✓ Графіки завантажено з сервера');
            localStorage.setItem('svitlo_schedules_cache', JSON.stringify(schedules));
            localStorage.setItem('svitlo_last_update', lastDataUpdateTime.toISOString());
            updateLastUpdateDisplay();
            return true;
        }
    } catch (error) {
        console.warn('⚠ Не вдалося завантажити графіки з сервера:', error.message);

        const cached = localStorage.getItem('svitlo_schedules_cache');
        if (cached) {
            schedules = JSON.parse(cached);
            const savedTime = localStorage.getItem('svitlo_last_update');
            if (savedTime) {
                lastDataUpdateTime = new Date(savedTime);
                updateLastUpdateDisplay();
            }
            console.log('✓ Використовуємо кешовані графіки');
            return true;
        }

        schedules = getDefaultSchedules();
        console.log('⚠ Використовуємо дефолтні графіки');
        return false;
    }
}

// Дефолтні графіки
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

// Ініціалізація
async function initApp() {
    populateLocationSelects();

    citySelect.value = userConfig.city;
    queueSelect.value = userConfig.queue;
    updateLocationLabel();

    const now = new Date();
    todayDateStr.textContent = now.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });

    await fetchSchedules();
    renderSchedule();

    setInterval(renderSchedule, 30000);
    setInterval(fetchSchedules, 1800000);
}

// Заповнення dropdown з локаціями
function populateLocationSelects() {
    const locations = getAllLocations();

    citySelect.innerHTML = '';
    findQueueLocationSelect.innerHTML = '';

    locations.forEach(loc => {
        const option1 = document.createElement('option');
        option1.value = loc.key;
        option1.textContent = loc.name;
        citySelect.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = loc.key;
        option2.textContent = loc.name;
        findQueueLocationSelect.appendChild(option2);
    });
}

function updateLocationLabel() {
    const locationInfo = getLocationInfo(userConfig.city);
    const locationName = locationInfo ? locationInfo.name : 'м. Сміла';
    currentLocationLabel.textContent = `${locationName} • ${userConfig.queue}`;
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

    // Таймлайн
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

    // Список
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

// Модаль пошуку черги
findQueueBtn.addEventListener('click', () => {
    findQueueModal.classList.remove('hidden');
    findQueueAddressInput.focus();
});

closeFindQueueBtn.addEventListener('click', () => {
    findQueueModal.classList.add('hidden');
    findQueueResult.classList.add('hidden');
    findQueueError.classList.add('hidden');
    useFoundQueueBtn.classList.add('hidden');
});

searchQueueBtn.addEventListener('click', () => {
    const location = findQueueLocationSelect.value;
    const address = findQueueAddressInput.value;

    findQueueResult.classList.add('hidden');
    findQueueError.classList.add('hidden');
    useFoundQueueBtn.classList.add('hidden');

    if (!address.trim()) {
        findQueueErrorText.textContent = 'Введіть адресу';
        findQueueError.classList.remove('hidden');
        return;
    }

    const queue = findQueueByAddress(address, location);

    if (queue) {
        foundQueueForApply = { location, queue };
        findQueueResultText.textContent = queue;
        findQueueResult.classList.remove('hidden');
        useFoundQueueBtn.classList.remove('hidden');
    } else {
        findQueueErrorText.textContent = 'Адреса не знайдена. Спробуйте іншу назву вулиці або району.';
        findQueueError.classList.remove('hidden');
    }
});

useFoundQueueBtn.addEventListener('click', () => {
    if (foundQueueForApply) {
        userConfig.city = foundQueueForApply.location;
        userConfig.queue = foundQueueForApply.queue;

        localStorage.setItem('svitlo_city', userConfig.city);
        localStorage.setItem('svitlo_queue', userConfig.queue);

        citySelect.value = userConfig.city;
        queueSelect.value = userConfig.queue;

        updateLocationLabel();
        renderSchedule();

        findQueueModal.classList.add('hidden');
    }
});

// Модаль налаштувань
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

// Функція для оновлення часу останнього оновлення
function updateLastUpdateDisplay() {
    if (!lastDataUpdateTime) {
        lastUpdateTimeEl.textContent = 'ніколи';
        return;
    }

    const now = new Date();
    const diffMs = now - lastDataUpdateTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) {
        lastUpdateTimeEl.textContent = 'щойно';
    } else if (diffMins < 60) {
        lastUpdateTimeEl.textContent = `${diffMins}м тому`;
    } else if (diffHours < 24) {
        lastUpdateTimeEl.textContent = `${diffHours}г тому`;
    } else {
        lastUpdateTimeEl.textContent = lastDataUpdateTime.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    }
}

// Кнопка оновлення
refreshBtn.addEventListener('click', async () => {
    refreshIcon.style.transform = 'rotate(0deg)';
    refreshIcon.style.transition = 'transform 0.6s linear';
    refreshIcon.style.transform = 'rotate(360deg)';

    await fetchSchedules();
    renderSchedule();

    setTimeout(() => {
        refreshIcon.style.transition = 'none';
        refreshIcon.style.transform = 'rotate(0deg)';
    }, 600);
});

// Оновлення часу кожну хвилину
setInterval(updateLastUpdateDisplay, 60000);
