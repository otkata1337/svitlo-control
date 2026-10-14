// app.js — СвітлоКонтроль (Мінімальний)

const API_BASE_URL = './schedules_cache.json';
const ALL_QUEUES = ['1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '4.1', '4.2', '5.1', '5.2', '6.1', '6.2'];

let schedules = {};
let selectedQueue = localStorage.getItem('svitlo_queue');

console.log('App loaded. Queue:', selectedQueue);

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
    if (!selectedQueue) {
        console.log('No queue, skipping render');
        return;
    }

    console.log('Rendering queue:', selectedQueue);

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const todayData = schedules[dateStr] || {};
    const intervals = todayData[selectedQueue] || [];

    const isOff = isOutageNow(intervals);
    const nextOutage = getNextOutage(intervals);

    // Обновить статус
    const sb = document.getElementById('status-badge');
    const si = document.getElementById('status-icon');
    const ss = document.getElementById('status-subtitle');
    const sic = document.getElementById('status-icon-container');

    if (!sb) console.error('status-badge not found');
    if (!si) console.error('status-icon not found');
    if (!ss) console.error('status-subtitle not found');
    if (!sic) console.error('status-icon-container not found');

    if (!sb || !si || !ss || !sic) {
        console.error('Some status elements missing, retrying in 200ms');
        setTimeout(render, 200);
        return;
    }

    if (isOff) {
        sb.textContent = 'Світло відключено!';
        sb.className = 'status-badge off';
        si.textContent = '🔌';
        ss.textContent = 'Світло відсутнє за розкладом';
        sic.style.borderColor = 'rgba(239, 68, 68, 0.3)';
    } else {
        sb.textContent = 'Світло є';
        sb.className = 'status-badge on';
        si.textContent = '💡';
        ss.textContent = nextOutage
            ? `Наступне о ${String(nextOutage.h).padStart(2, '0')}:${String(nextOutage.m).padStart(2, '0')}`
            : 'Відключень сьогодні не буде';
        sic.style.borderColor = 'rgba(59, 130, 246, 0.3)';
    }

    // Обновить дату
    const dateEl = document.getElementById('today-date-str');
    if (dateEl) dateEl.textContent = now.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });

    // Обновить время
    const timeEl = document.getElementById('update-time');
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

    // Обновить текущую чергу
    const labelEl = document.getElementById('current-location-label');
    if (labelEl) labelEl.textContent = `Черга ${selectedQueue}`;

    // Обновить следующее событие
    const nextTimeEl = document.getElementById('next-event-time');
    const nextDescEl = document.getElementById('next-event-desc');
    if (nextTimeEl && nextDescEl) {
        if (nextOutage) {
            nextTimeEl.textContent = `${String(nextOutage.h).padStart(2, '0')}:${String(nextOutage.m).padStart(2, '0')}`;
            const hours = Math.floor(nextOutage.duration / 60);
            const mins = nextOutage.duration % 60;
            nextDescEl.textContent = `На ${hours}г ${mins}м`;
        } else {
            nextTimeEl.textContent = '—';
            nextDescEl.textContent = 'Немає подій';
        }
    }

    renderTimeline(intervals);
    renderOutages(intervals);
    renderQueues(todayData);

    console.log('✅ Render complete');
}

function renderTimeline(intervals) {
    const bar = document.getElementById('timeline-bar');
    if (!bar) return;
    bar.innerHTML = '';
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    for (let h = 0; h < 24; h++) {
        const hourDiv = document.createElement('div');
        hourDiv.className = 'flex-1 h-full flex gap-0.5';
        for (let q = 0; q < 4; q++) {
            const checkMin = h * 60 + q * 15;
            let isOutage = false;
            for (const [sH, sM, eH, eM] of intervals) {
                if (checkMin >= sH * 60 + sM && checkMin < eH * 60 + eM) {
                    isOutage = true;
                    break;
                }
            }
            const slot = document.createElement('div');
            slot.className = `flex-1 time-slot ${isOutage ? 'off' : 'on'}`;
            if (h === currentHour && Math.floor(currentMinute / 15) === q) {
                slot.style.boxShadow = '0 0 8px rgba(250, 204, 21, 0.8)';
            }
            hourDiv.appendChild(slot);
        }
        bar.appendChild(hourDiv);
    }
}

function renderOutages(intervals) {
    const el = document.getElementById('outage-intervals');
    if (!el) return;
    el.innerHTML = '';
    if (intervals.length === 0) {
        el.innerHTML = '<div class="glass-effect rounded-lg p-4 text-center text-slate-400">Сьогодні без перерв</div>';
        return;
    }
    intervals.forEach(([sH, sM, eH, eM]) => {
        const duration = (eH * 60 + eM) - (sH * 60 + sM);
        const hours = Math.floor(duration / 60);
        const mins = duration % 60;
        const item = document.createElement('div');
        item.className = 'glass-effect rounded-lg p-4 border border-red-500/30';
        item.innerHTML = `<div class="flex justify-between"><span class="font-bold">${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')} — ${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}</span><span class="text-xs text-slate-400">${hours}г ${mins}хв</span></div>`;
        el.appendChild(item);
    });
}

function renderQueues(todayData) {
    const container = document.getElementById('all-queues-container');
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
        const card = document.createElement('div');
        card.className = `queue-card ${isActive ? 'active' : ''} ${isOff ? 'off-status' : 'on-status'}`;
        card.innerHTML = `<div class="flex flex-col items-center gap-2"><span class="text-2xl">${isOff ? '🔌' : '💡'}</span><span class="font-bold text-lg">${q}</span><span class="text-xs text-slate-400">${intervals.length}</span>${isActive ? '<span class="text-xs text-blue-400">✓</span>' : ''}</div>`;
        card.onclick = () => {
            selectedQueue = q;
            localStorage.setItem('svitlo_queue', q);
            render();
        };
        container.appendChild(card);
    });
}

async function loadSchedules() {
    try {
        const response = await fetch(`${API_BASE_URL}?t=${Date.now()}`, { signal: AbortSignal.timeout(5000) });
        if (response.ok) {
            schedules = await response.json();
            localStorage.setItem('svitlo_cache', JSON.stringify(schedules));
            console.log('✅ Schedules loaded');
        }
    } catch (e) {
        const cached = localStorage.getItem('svitlo_cache');
        if (cached) {
            schedules = JSON.parse(cached);
            console.log('✅ Using cached schedules');
        }
    }
}

async function init() {
    console.log('=== Init ===');

    const modal = document.getElementById('first-launch-modal');
    const select = document.getElementById('first-queue-select');
    const btn = document.getElementById('first-launch-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const saveBtn = document.getElementById('save-settings-btn');
    const queueSelect = document.getElementById('queue-select');

    if (!modal || !select || !btn) {
        console.error('First launch modal elements missing');
        return;
    }

    // Завантажити дані
    await loadSchedules();
    console.log('Data loaded, selectedQueue:', selectedQueue);

    if (selectedQueue) {
        // Черга вже обрана
        modal.style.display = 'none';
        // Задержка для гарантії що DOM готовий
        setTimeout(() => render(), 300);
    } else {
        // Показати модальне вікно
        select.onchange = () => {
            btn.disabled = !select.value;
        };

        btn.onclick = () => {
            selectedQueue = select.value;
            localStorage.setItem('svitlo_queue', selectedQueue);
            modal.style.display = 'none';
            if (settingsBtn) settingsBtn.style.display = 'block';
            // Задержка перед render
            setTimeout(() => render(), 100);
        };
    }

    // Налаштування
    if (settingsBtn && settingsModal && saveBtn && queueSelect) {
        settingsBtn.onclick = () => {
            queueSelect.value = selectedQueue;
            settingsModal.classList.remove('hidden', 'opacity-0');
            settingsModal.classList.add('opacity-100');
        };

        settingsModal.onclick = (e) => {
            if (e.target === settingsModal) {
                settingsModal.classList.add('opacity-0');
                setTimeout(() => settingsModal.classList.add('hidden'), 300);
            }
        };

        saveBtn.onclick = () => {
            selectedQueue = queueSelect.value;
            localStorage.setItem('svitlo_queue', selectedQueue);
            settingsModal.classList.add('opacity-0');
            setTimeout(() => settingsModal.classList.add('hidden'), 300);
            setTimeout(() => render(), 100);
        };
    }

    console.log('=== Init complete ===');

    setInterval(render, 60000);
    setInterval(loadSchedules, 300000);
}

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
