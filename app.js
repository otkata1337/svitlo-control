// app.js — СвітлоКонтроль

const API_BASE_URL = './schedules_cache.json';
const ALL_QUEUES = ['1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '4.1', '4.2', '5.1', '5.2', '6.1', '6.2'];

let schedules = {};
let selectedQueue = localStorage.getItem('svitlo_queue');

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

    for (let h = 0; h < 24; h++) {
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
            slot.className = `timeline-slot ${isOutage ? 'off' : 'on'}`;
            bar.appendChild(slot);
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
    try {
        const response = await fetch(`${API_BASE_URL}?t=${Date.now()}`, { signal: AbortSignal.timeout(5000) });
        if (response.ok) {
            schedules = await response.json();
            localStorage.setItem('svitlo_cache', JSON.stringify(schedules));
        }
    } catch (e) {
        const cached = localStorage.getItem('svitlo_cache');
        if (cached) schedules = JSON.parse(cached);
    }
}

async function init() {
    const modal = document.getElementById('first-launch-modal');
    const select = document.getElementById('first-queue-select');
    const btn = document.getElementById('first-launch-btn');

    if (!modal || !select || !btn) {
        console.error('Modal elements missing');
        return;
    }

    await loadSchedules();

    if (selectedQueue) {
        modal.style.display = 'none';
        render();
    } else {
        select.onchange = () => btn.disabled = !select.value;
        btn.onclick = () => {
            selectedQueue = select.value;
            if (!selectedQueue) return;
            localStorage.setItem('svitlo_queue', selectedQueue);
            modal.style.display = 'none';
            render();
        };
    }

    // Settings modal handlers
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const settingsContent = document.getElementById('settings-content');
    const closeBtn = document.getElementById('settings-close-btn');
    const queueSelect = document.getElementById('queue-select');

    if (settingsBtn && settingsModal && closeBtn && queueSelect) {
        settingsBtn.onclick = () => {
            queueSelect.value = selectedQueue;
            settingsModal.classList.remove('hidden');
            settingsModal.classList.add('pointer-events-auto');
            settingsModal.classList.remove('opacity-0');
            setTimeout(() => {
                settingsContent.classList.remove('opacity-0', 'scale-95');
                settingsContent.classList.add('opacity-100', 'scale-100');
            }, 10);
        };

        settingsModal.onclick = (e) => {
            if (e.target === settingsModal) {
                settingsContent.classList.add('opacity-0', 'scale-95');
                settingsContent.classList.remove('opacity-100', 'scale-100');
                setTimeout(() => {
                    settingsModal.classList.add('hidden', 'pointer-events-none');
                }, 300);
            }
        };

        closeBtn.onclick = () => {
            selectedQueue = queueSelect.value;
            localStorage.setItem('svitlo_queue', selectedQueue);
            settingsContent.classList.add('opacity-0', 'scale-95');
            settingsContent.classList.remove('opacity-100', 'scale-100');
            setTimeout(() => {
                settingsModal.classList.add('hidden', 'pointer-events-none');
                render();
            }, 300);
        };
    }

    setInterval(render, 60000);
    setInterval(loadSchedules, 300000);
}

document.addEventListener('DOMContentLoaded', init);
if (document.readyState !== 'loading') init();
