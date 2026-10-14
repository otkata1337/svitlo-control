// app.js — СвітлоКонтроль (Простий інтерфейс)

const API_BASE_URL = './schedules_cache.json';
const ALL_QUEUES = ['1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '4.1', '4.2', '5.1', '5.2', '6.1', '6.2'];

let schedules = {};
let selectedQueue = localStorage.getItem('svitlo_queue');

function isOutageNow(intervals) {
    const now = new Date();
    const totalMinutes = now.getHours() * 60 + now.getMinutes();
    for (const [sH, sM, eH, eM] of intervals) {
        const start = sH * 60 + sM;
        const end = eH * 60 + eM;
        if (totalMinutes >= start && totalMinutes < end) {
            return true;
        }
    }
    return false;
}

function getNextOutage(intervals) {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    for (const [sH, sM, eH, eM] of intervals.sort((a, b) => a[0] * 60 + a[1] - (b[0] * 60 + b[1]))) {
        const start = sH * 60 + sM;
        if (start > currentMinutes) {
            const duration = (eH * 60 + eM) - start;
            return { h: sH, m: sM, duration };
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

    const statusBadge = document.getElementById('status-badge');
    const statusIcon = document.getElementById('status-icon');
    const statusSubtitle = document.getElementById('status-subtitle');
    const statusCard = document.getElementById('status-card');

    if (isOff) {
        statusBadge.textContent = 'Світло відключено!';
        statusBadge.className = 'status-badge off';
        statusIcon.textContent = '🔌';
        statusSubtitle.textContent = 'Світло відсутнє за розкладом';
        statusCard.className = 'glass-effect rounded-3xl p-8 sm:p-10 border-2 border-red-500/30';
    } else {
        statusBadge.textContent = 'Світло є';
        statusBadge.className = 'status-badge on';
        statusIcon.textContent = '💡';
        statusSubtitle.textContent = nextOutage
            ? `Наступне о ${String(nextOutage.h).padStart(2, '0')}:${String(nextOutage.m).padStart(2, '0')}`
            : 'Відключень сьогодні не буде';
        statusCard.className = 'glass-effect rounded-3xl p-8 sm:p-10 border-2 border-blue-500/20';
    }

    document.getElementById('today-date-str').textContent = now.toLocaleDateString('uk-UA', {
        day: 'numeric',
        month: 'short'
    });

    document.getElementById('update-time').textContent = now.toLocaleTimeString('uk-UA', {
        hour: '2-digit',
        minute: '2-digit'
    });

    document.getElementById('current-location-label').textContent = `Черга ${selectedQueue}`;

    renderTimeline(intervals);
    renderOutages(intervals);
    renderQueues(todayData);
}

function renderTimeline(intervals) {
    const bar = document.getElementById('timeline-bar');
    bar.innerHTML = '';

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    for (let h = 0; h < 24; h++) {
        const hourDiv = document.createElement('div');
        hourDiv.className = 'flex-1 h-full flex gap-0.5';

        for (let q = 0; q < 4; q++) {
            const minute = q * 15;
            let isOutage = false;

            for (const [sH, sM, eH, eM] of intervals) {
                const totalMin = sH * 60 + sM;
                const endMin = eH * 60 + eM;
                const checkMin = h * 60 + minute;
                if (checkMin >= totalMin && checkMin < endMin) {
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
        item.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="font-bold">${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')} — ${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}</span>
                <span class="text-xs text-slate-400">${hours}г ${mins}хв</span>
            </div>
        `;
        el.appendChild(item);
    });
}

function renderQueues(todayData) {
    const container = document.getElementById('all-queues-container');
    container.innerHTML = '';

    ALL_QUEUES.forEach(q => {
        const intervals = todayData[q] || [];
        const isActive = q === selectedQueue;

        let isOff = false;
        const now = new Date();
        const currentMin = now.getHours() * 60 + now.getMinutes();

        for (const [sH, sM, eH, eM] of intervals) {
            const start = sH * 60 + sM;
            const end = eH * 60 + eM;
            if (currentMin >= start && currentMin < end) {
                isOff = true;
                break;
            }
        }

        const card = document.createElement('div');
        card.className = `queue-card ${isActive ? 'active' : ''} ${isOff ? 'off-status' : 'on-status'}`;
        card.innerHTML = `
            <div class="flex flex-col items-center gap-2">
                <span class="text-2xl">${isOff ? '🔌' : '💡'}</span>
                <span class="font-bold text-lg">${q}</span>
                <span class="text-xs text-slate-400">${intervals.length}</span>
                ${isActive ? '<span class="text-xs text-blue-400">✓</span>' : ''}
            </div>
        `;

        card.addEventListener('click', () => {
            selectedQueue = q;
            localStorage.setItem('svitlo_queue', q);
            render();
        });

        container.appendChild(card);
    });
}

async function loadSchedules() {
    try {
        const response = await fetch(`${API_BASE_URL}?t=${Date.now()}`, {
            signal: AbortSignal.timeout(5000)
        });
        if (response.ok) {
            schedules = await response.json();
            localStorage.setItem('svitlo_cache', JSON.stringify(schedules));
        }
    } catch (e) {
        const cached = localStorage.getItem('svitlo_cache');
        if (cached) {
            schedules = JSON.parse(cached);
        }
    }
}

async function initApp() {
    console.log('🚀 Запуск додатку...');

    // Завантажити дані
    await loadSchedules();
    console.log('📊 Дані завантажені');

    // Якщо черга НЕ обрана
    if (!selectedQueue) {
        console.log('⚠️ Черга не обрана, показуємо модальне вікно');

        const select = document.getElementById('first-queue-select');
        const btn = document.getElementById('first-launch-btn');
        const modal = document.getElementById('first-launch-modal');

        console.log('Select:', select, 'Btn:', btn, 'Modal:', modal);

        if (!select || !btn || !modal) {
            console.error('❌ Елементи не знайдені!');
            return;
        }

        // Активувати кнопку при зміні селекту
        select.addEventListener('change', (e) => {
            console.log('Вибрано:', e.target.value);
            btn.disabled = !e.target.value;
        });

        // Обробка клику кнопки
        btn.addEventListener('click', (e) => {
            console.log('🔘 Клік на кнопку');
            e.preventDefault();

            const queue = select.value;
            console.log('Вибрана черга:', queue);

            if (!queue) {
                console.log('❌ Черга не вибрана');
                return;
            }

            selectedQueue = queue;
            localStorage.setItem('svitlo_queue', queue);
            console.log('✅ Черга збережена:', selectedQueue);

            modal.remove();
            console.log('🔚 Модальне вікно видалено');

            render();
            console.log('📱 Контент відрисований');
        });
    } else {
        console.log('✅ Черга вже обрана:', selectedQueue);
        const modal = document.getElementById('first-launch-modal');
        if (modal) {
            modal.remove();
        }
        render();
    }

    // Налаштування кнопки для змін черги
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const saveBtn = document.getElementById('save-settings-btn');
    const queueSelect = document.getElementById('queue-select');

    if (settingsBtn && settingsModal && saveBtn && queueSelect) {
        settingsBtn.addEventListener('click', () => {
            queueSelect.value = selectedQueue;
            settingsModal.classList.remove('hidden', 'opacity-0');
            settingsModal.classList.add('opacity-100');
        });

        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.classList.add('opacity-0');
                setTimeout(() => settingsModal.classList.add('hidden'), 300);
            }
        });

        saveBtn.addEventListener('click', () => {
            selectedQueue = queueSelect.value;
            localStorage.setItem('svitlo_queue', selectedQueue);
            settingsModal.classList.add('opacity-0');
            setTimeout(() => settingsModal.classList.add('hidden'), 300);
            render();
        });
    }

    // Оновлювати щохвилини
    setInterval(render, 60000);
    setInterval(loadSchedules, 300000);
}

// Запуск коли DOM готовий
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
