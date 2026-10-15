// app.js — СвітлоКонтроль (Мттєвий старт + Підказка пошуку + Оптимізація)

const API_BASE_URL = './schedules_cache.json';

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

// Швидке завантаження графіків напряму з файлу кешу у репозиторії
async function fetchSchedules() {
    const cached = localStorage.getItem('svitlo_schedules_cache');
    if (cached) {
        try {
            schedules = JSON.parse(cached);
        } catch(e) {}
    }

    if (Object.keys(schedules).length === 0) {
        schedules = getDefaultSchedules();
    }

    renderSchedule();

    try {
        const response = await fetch(`${API_BASE_URL}?t=${Date.now()}`, { signal: AbortSignal.timeout(5000) });
        if (response.ok) {
            const data = await response.json();
            // Якщо файл містить дані безпосередньо або у форматі {success: true, data: ...}
            const actualData = data.success && data.data ? data.data : data;
            if (actualData && Object.keys(actualData).length > 0) {
                schedules = actualData;
                localStorage.setItem('svitlo_schedules_cache', JSON.stringify(schedules));
                renderSchedule();
                console.log('✅ Графіки успішно оновлено з schedules_cache.json');
            }
        }
    } catch (error) {
        console.warn('⚠ Не вдалося оновити з файлу, використовуємо локальні дані.');
    }
}

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
    populateLocationSelects();

    citySelect.value = userConfig.city;
    queueSelect.value = userConfig.queue;
    updateLocationLabel();

    const now = new Date();
    todayDateStr.textContent = now.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });

    schedules = getDefaultSchedules();
    renderSchedule();

    await fetchSchedules();

    setInterval(fetchSchedules, 60000); // Оновлювати кожну хвилину з кешу
    setInterval(renderSchedule, 30000);
}

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

// Запуск при завантаженні
document.addEventListener('DOMContentLoaded', initApp);
