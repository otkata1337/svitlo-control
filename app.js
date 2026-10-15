// app.js — СвітлоКонтроль

const API_BASE_URL = './schedules_cache.json';
const ALL_QUEUES = ['1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '4.1', '4.2', '5.1', '5.2', '6.1', '6.2'];

let schedules = {};
let selectedQueue = localStorage.getItem('svitlo_queue') || '1.1';

console.log('✅ app.js loaded. Queue:', selectedQueue);

function isOutageNow(intervals) {
    const now = new Date();
    const totalMinutes = now.getHours() * 60 + now.getMinutes();
    for (const [sH, sM, eH, eM] of intervals) {
        if (totalMinutes >= sH * 60 + sM && totalMinutes < eH * 60 + eM) return true;
    }
    return false;
}

function getNextOutage(intervals) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    for (const [sH, sM, eH, eM] of intervals.sort((a, b) => a[0] * 60 + a[1] - (b[0] * 60 + b[1]))) {
        if (sH * 60 + sM > currentMinutes) {
            return { h: sH, m: sM, duration: (eH * 60 + eM) - (sH * 60 + sM) };
        }
    }
    return null;
}

function render() {
    if (!selectedQueue) return;

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const todayData = schedules[dateStr] || {};
    const intervals = todayData[selectedQueue] || [];

    const isOff = isOutageNow(intervals);
    const nextOutage = getNextOutage(intervals);

    // Update status badge
    const statusBadge = document.getElementById('status-badge');
    if (statusBadge) {
        if (isOff) {
            statusBadge.textContent = 'СВІТЛО ВІДКЛЮЧЕНО';
            statusBadge.className = 'status-pill off';
        } else {
            statusBadge.textContent = 'Світло є';
            statusBadge.className = 'status-pill on';
        }
    }

    // Update status icon
    const statusIcon = document.getElementById('status-icon');
    if (statusIcon) statusIcon.textContent = isOff ? '🔌' : '💡';

    // Update status subtitle
    const statusSubtitle = document.getElementById('status-subtitle');
    if (statusSubtitle) {
        if (isOff) {
            statusSubtitle.textContent = 'За розкладом світло відсутнє';
        } else if (nextOutage) {
            statusSubtitle.textContent = `Наступне відключення о ${String(nextOutage.h).padStart(2, '0')}:${String(nextOutage.m).padStart(2, '0')}`;
        } else {
            statusSubtitle.textContent = 'Сьогодні без перерв';
        }
    }

    // Update last refresh time
    const updateTimeEl = document.getElementById('update-time');
    if (updateTimeEl) {
        const now = new Date();
        updateTimeEl.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // Check if we're using stale data
        const lastError = localStorage.getItem('svitlo_lastError');
        const cacheTimestamp = localStorage.getItem('svitlo_cache_timestamp');

        if (lastError && !updateTimeEl.classList.contains('text-red-500')) {
            // Show stale data warning
            updateTimeEl.classList.add('text-red-500', 'animate-pulse');
            updateTimeEl.title = 'Дані є старім (помилка завантаження)';
        } else if (cacheTimestamp) {
            const cacheDate = new Date(cacheTimestamp);
            const daysOld = Math.floor((now - cacheDate) / (1000 * 60 * 60 * 24));
            if (daysOld > 0 && !updateTimeEl.classList.contains('text-green-500')) {
                updateTimeEl.classList.add('text-yellow-400');
                updateTimeEl.title = `Кеш ${daysOld} днів`;
            }
        }
    }

    // Update queue display
    const statusQueue = document.getElementById('status-queue');
    if (statusQueue) {
        statusQueue.innerHTML = `Черга: <span class="font-mono font-bold text-blue-400">${selectedQueue}</span>`;
    }

    // Update date
    const dateEl = document.getElementById('today-date-str');
    if (dateEl) {
        const dayMonth = now.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
        dateEl.textContent = `${dayMonth}`;
    }

    // Update time
    const timeEl = document.getElementById('update-time');
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

    // Update next event
    const nextTimeEl = document.getElementById('next-event-time');
    const nextDescEl = document.getElementById('next-event-desc');
    if (nextTimeEl && nextDescEl) {
        if (nextOutage) {
            nextTimeEl.textContent = `${String(nextOutage.h).padStart(2, '0')}:${String(nextOutage.m).padStart(2, '0')}`;
            const hours = Math.floor(nextOutage.duration / 60);
            const mins = nextOutage.duration % 60;
            nextDescEl.textContent = `${hours}г ${mins}хв`;
        } else {
            nextTimeEl.textContent = '—';
            nextDescEl.textContent = 'Немає подій';
        }
    }

    renderTimeline(intervals);
    renderOutages(intervals);
    renderQueues(todayData);
}

function renderTimeline(intervals) {
    const bar = document.getElementById('timeline-bar');
    if (!bar) return;
    bar.innerHTML = '';

    // Pre-compute outage status for each 15-min slot across 24 hours
    // Slot index = hour * 4 + quarter (0-95)
    const slotStatus = new Array(96).fill('on');
    const slotNextOutage = new Array(96).fill(null); // { h, m, duration }

    for (let h = 0; h < 24; h++) {
        for (let q = 0; q < 4; q++) {
            const checkMin = h * 60 + q * 15;
            let nearestOutageStart = null;
            let nearestOutageDuration = 0;

            for (const [sH, sM, eH, eM] of intervals) {
                const slotStart = sH * 60 + sM;
                const slotEnd = eH * 60 + eM;

                if (checkMin >= slotStart && checkMin < slotEnd) {
                    // This slot is inside an outage
                    slotStatus[h * 4 + q] = 'off';
                    nearestOutageStart = { h: sH, m: sM };
                    nearestOutageDuration = slotEnd - slotStart;
                }

                // Check if this outage starts after current slot (for next outage)
                if (slotStart > checkMin) {
                    if (!nearestOutageStart || slotStart < nearestOutageStart.h * 60 + nearestOutageStart.m) {
                        nearestOutageStart = { h: sH, m: sM };
                        nearestOutageDuration = slotEnd - slotStart;
                    }
                }
            }

            // If no future outage found in this hour, look in remaining hours
            if (!nearestOutageStart) {
                for (let hh = h + 1; hh < 24; hh++) {
                    for (const [sH, sM, eH, eM] of intervals) {
                        if (sH * 60 + sM > h * 60 + q * 15) {
                            nearestOutageStart = { h: sH, m: sM };
                            nearestOutageDuration = (eH * 60 + eM) - (sH * 60 + sM);
                            break;
                        }
                    }
                    if (nearestOutageStart) break;
                }
            }

            slotNextOutage[h * 4 + q] = nearestOutageDuration > 0 ? nearestOutageStart : null;
        }
    }

    for (let h = 0; h < 24; h++) {
        for (let q = 0; q < 4; q++) {
            const slot = document.createElement('div');
            const slotIndex = h * 4 + q;
            slot.className = `timeline-slot ${slotStatus[slotIndex] ? 'off' : 'on'}`;
            slot.title = '';

            // Add tooltip with next outage info
            if (slotStatus[slotIndex] === 'off') {
                slot.title = `У цей час відключення`;
            } else if (slotNextOutage[slotIndex]) {
                const { h: nextH, m: nextM } = slotNextOutage[slotIndex];
                const hours = Math.floor(slotNextOutage[slotIndex] / 60);
                const mins = slotNextOutage[slotIndex] % 60;
                slot.title = `Наступне відключення о ${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;
                if (hours > 0) {
                    slot.title += ` на ${hours}г ${mins}хв`;
                }
            }

            // Add click handler for detail view
            slot.onclick = () => {
                if (slotStatus[slotIndex] === 'off') {
                    showOutageDetail(slotIndex, intervals);
                } else if (slotNextOutage[slotIndex]) {
                    showNextOutageDetail(slotIndex, intervals);
                }
            };

            bar.appendChild(slot);
        }
    }
}

function showOutageDetail(slotIndex, intervals) {
    const h = Math.floor(slotIndex / 4);
    const q = slotIndex % 4;
    const checkMin = h * 60 + q * 15;

    // Find the outage containing this slot
    for (const [sH, sM, eH, eM] of intervals) {
        if (checkMin >= sH * 60 + sM && checkMin < eH * 60 + eM) {
            const duration = (eH * 60 + eM) - (sH * 60 + sM);
            const hours = Math.floor(duration / 60);
            const mins = duration % 60;
            alert(`Вий час відключення: ${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')} — ${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}\nТривалість: ${hours}г ${mins}хв`);
            return;
        }
    }
}

function showNextOutageDetail(slotIndex, intervals) {
    // Find the next outage after this slot
    const h = Math.floor(slotIndex / 4);
    const q = slotIndex % 4;
    const checkMin = h * 60 + q * 15;

    // Search forward for next outage
    for (let hh = h; hh < 24; hh++) {
        const hourIntervals = intervals.filter(([sH, sM, eH, eM]) => sH === hh || (hh === 23 && sH < 24));
        for (const [sH, sM, eH, eM] of intervals) {
            if (sH * 60 + sM > checkMin) {
                const duration = (eH * 60 + eM) - (sH * 60 + sM);
                const hours = Math.floor(duration / 60);
                const mins = duration % 60;
                alert(`Наступне відключення: ${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')} — ${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}\nТривалість: ${hours}г ${mins}хв`);
                return;
            }
        }
    }
}

function renderOutages(intervals) {
    const container = document.getElementById('outages-container');
    if (!container) return;

    container.innerHTML = '';

    if (intervals.length === 0) {
        container.innerHTML = '<div class="glass-effect rounded-xl p-6 text-center text-slate-400">Сьогодні без перерв ✓</div>';
        return;
    }

    intervals.forEach(([sH, sM, eH, eM]) => {
        const duration = (eH * 60 + eM) - (sH * 60 + sM);
        const hours = Math.floor(duration / 60);
        const mins = duration % 60;

        const item = document.createElement('div');
        item.className = 'outage-item';
        item.innerHTML = `
            <span class="outage-time">${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')} — ${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}</span>
            <span class="outage-duration">${hours}г ${mins}хв</span>
        `;
        container.appendChild(item);
    });
}

function renderQueues(todayData) {
    const container = document.getElementById('queues-grid');
    if (!container) return;
    container.innerHTML = '';

    ALL_QUEUES.forEach(q => {
        const intervals = todayData[q] || [];
        const isActive = q === selectedQueue;

        let isOff = false;
        const now = new Date();
        const currentMin = now.getHours() * 60 + now.getMinutes();
        for (const [sH, sM, eH, eM] of intervals) {
            if (currentMin >= sH * 60 + sM && currentMin < eH * 60 + eM) {
                isOff = true;
                break;
            }
        }

        const badge = document.createElement('div');
        badge.className = `queue-badge card-hover ${isActive ? 'active' : ''} ${isOff ? 'off' : 'on'}`;
        badge.textContent = q;
        badge.title = `${intervals.length} перерв(и)`;

        badge.onclick = () => {
            selectedQueue = q;
            localStorage.setItem('svitlo_queue', q);
            render();
        };

        container.appendChild(badge);
    });
}

async function loadSchedules() {
    const MAX_RETRIES = 3;
    const BASE_DELAY = 1000; // 1 секунда

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(`${API_BASE_URL}?t=${Date.now()}`, {
                signal: AbortSignal.timeout(5000)
            });

            if (response.ok) {
                schedules = await response.json();
                localStorage.setItem('svitlo_cache', JSON.stringify(schedules));
                localStorage.setItem('svitlo_cache_timestamp', new Date().toISOString());
                // Успішне завантаження — скидаємо лічильник невидань
                localStorage.setItem('svitlo_lastError', '');
                return;
            }
            // Якщо статус не 200, обробляємо як помилку та продовжуємо цикл
            throw new Error(`HTTP ${response.status}`);
        } catch (e) {
            const errorMessage = e.message || 'Unknown error';
            console.warn(`⚠️ Спроба ${attempt}/${MAX_RETRIES}: ${errorMessage}`);

            if (attempt < MAX_RETRIES) {
                // Експоненціальна затримка з джиттером (+/- 20%)
                const jitter = Math.random() * 0.2 * BASE_DELAY;
                const delay = BASE_DELAY * Math.pow(2, attempt - 1) + jitter;
                await new Promise(r => setTimeout(r, delay));
            } else {
                // Всі спроби вичерпані — завантажуємо кеш
                const cached = localStorage.getItem('svitlo_cache');
                if (cached) {
                    schedules = JSON.parse(cached);
                    console.log('📦 Використовуємо кешові дані через неудачу запиту');
                } else {
                    console.error('❌ Немає кешованих даних та не вдалося завантажить');
                }
                // Збероємо повідомлення про останню помилку
                localStorage.setItem('svitlo_lastError', errorMessage);
                // Also store timestamp of when cache was created
                const cachedCache = localStorage.getItem('svitlo_cache_timestamp');
                if (!cachedCache) {
                    // Estimate: mark cache as old if no timestamp
                    localStorage.setItem('svitlo_cache_timestamp', new Date(Date.now() - 86400000).toISOString()); // 1 day ago
                }
            }
        }
    }
}

async function init() {
    // Skip first-launch modal entirely - it was causing issues with blank screens
    // Load schedules from cache or API
    await loadSchedules();

    // If we have schedule data, render immediately
    if (Object.keys(schedules).length > 0) {
        render();
        const statusSubtitle = document.getElementById('status-subtitle');
        if (statusSubtitle) {
            statusSubtitle.textContent = 'Обновлено ' + new Date().toLocaleString('uk-UA');
        }
        return;
    }

    // No data available - show empty state
    render();
    const statusSubtitle = document.getElementById('status-subtitle');
    if (statusSubtitle) {
        statusSubtitle.textContent = 'Данные недоступны';
    }
    console.warn('⚠️ Не вдалося завантажити розклад, показано пусте значення');
}

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
