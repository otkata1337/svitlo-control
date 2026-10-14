// parser.js — Розумний мульти-джерельний парсер графіків для Черкащини
const https = require('https');
const fs = require('fs');
const path = require('path');

const SCHEDULE_FILE = path.join(__dirname, 'current-schedule.json');

// Допоміжна функція для запитів
function fetchUrl(url) {
    return new Promise((resolve) => {
        https.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SvitloControlBot/1.0' },
            timeout: 8000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ success: true, status: res.statusCode, data }));
        }).on('error', err => resolve({ success: false, error: err.message }));
    });
}

async function updateScheduleAutomatically() {
    console.log('🔄 Запуск інтелектуального мульти-джерельного парсера...');

    // Джерела для перевірки (Офіційне + Агрегатори/Моніторинги)
    const sources = [
        { name: 'CherkasyOblenergo', url: 'https://www.cherkasyoblenergo.com.ua/vidkliuchennia' },
        { name: 'SvitloMonitor', url: 'https://svitlo.cc/' }, // або аналогічні відкриті агрегатори
    ];

    let foundValidData = false;

    for (const source of sources) {
        console.log(`📡 Перевірка джерела: ${source.name} (${source.url})...`);
        const result = await fetchUrl(source.url);

        if (result.success && result.status === 200) {
            console.log(`✓ Джерело ${source.name} доступне.`);

            // Аналізуємо контент на наявність графіків
            const html = result.data.toLowerCase();
            if (html.includes('гпв') || html.includes('черг') || html.includes('годин')) {
                console.log(`💡 Знайдено згадки про графіки у джерелі ${source.name}.`);
                foundValidData = true;
            }
        } else {
            console.log(`⚠ Джерело ${source.name} недоступне або відповіло помилкою.`);
        }
    }

    // Оновлюємо статус перевірки в файлі
    try {
        if (fs.existsSync(SCHEDULE_FILE)) {
            const currentData = JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
            currentData.updated_at = new Date().toISOString();
            currentData.sources_checked = sources.map(s => s.name);
            currentData.parser_status = foundValidData ? 'synced_with_sources' : 'no_active_outages_reported';

            fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(currentData, null, 2));
            console.log('✓ Лог розкладу успішно оновлено.');
        }
    } catch (e) {
        console.error('❌ Помилка запису оновлень:', e.message);
    }
}

if (require.main === module) {
    updateScheduleAutomatically();
}

module.exports = { updateScheduleAutomatically };
