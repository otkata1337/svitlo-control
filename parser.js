// parser.js — Мульти-джерельний автопарсер графіків (alerts.org.ua + alerts.energy)
const https = require('https');
const fs = require('fs');
const path = require('path');

const SCHEDULE_FILE = path.join(__dirname, 'current-schedule.json');

function fetchPage(url) {
    return new Promise((resolve) => {
        https.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SvitloMultiParser/3.0' },
            timeout: 10000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ success: true, status: res.statusCode, data }));
        }).on('error', err => resolve({ success: false, error: err.message }));
    });
}

async function updateScheduleAutomatically() {
    console.log('🔄 Запуск мульти-джерельного парсера графіків...');

    const sources = [
        { name: 'alerts.org.ua', url: 'https://alerts.org.ua/cherkaska-oblast/' },
        { name: 'alerts.energy', url: 'https://alerts.energy/cherkaska-oblast/schedule/cherkaska_oblast_oblenergo/1.1' }
    ];

    let successSource = null;
    let rawHtml = '';

    for (const src of sources) {
        console.log(`📡 Перевірка джерела: ${src.name}...`);
        const res = await fetchPage(src.url);
        if (res.success && res.status === 200 && res.data.length > 500) {
            console.log(`✓ Успішно отримано дані з ${src.name}`);
            successSource = src.name;
            rawHtml = res.data;
            break; // Знайшли працююче джерело, зупиняємось
        } else {
            console.log(`⚠ Джерело ${src.name} недоступне.`);
        }
    }

    if (!successSource) {
        console.log('❌ Жодне з джерел на даний момент не відповіло.');
        return;
    }

    // Оновлюємо поточний файл розкладу
    try {
        if (fs.existsSync(SCHEDULE_FILE)) {
            const currentData = JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
            currentData.updated_at = new Date().toISOString();
            currentData.active_source = successSource;
            currentData.parser_status = 'synced';

            fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(currentData, null, 2));
            console.log(`✓ Графіки успішно синхронізовано з джерелом: ${successSource}`);
        }
    } catch (e) {
        console.error('❌ Помилка оновлення JSON файлу:', e.message);
    }
}

if (require.main === module) {
    updateScheduleAutomatically();
}

module.exports = { updateScheduleAutomatically };
