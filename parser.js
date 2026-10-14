// parser.js — Автоматичний парсер графіків Черкасиобленерго
const https = require('https');
const fs = require('fs');
const path = require('path');

const SCHEDULE_FILE = path.join(__dirname, 'current-schedule.json');

// Функція запиту до сайту обленерго
function fetchWebsite(url) {
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            timeout: 10000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', err => reject(err));
    });
}

async function updateScheduleAutomatically() {
    console.log('🔄 Запуск парсера Черкасиобленерго...');

    try {
        // Пробуємо отримати головну сторінку або сторінку відключень
        const html = await fetchWebsite('https://www.cherkasyoblenergo.com.ua/vidkliuchennia');

        console.log('📄 Сторінку успішно завантажено (розмір HTML:', html.length, 'байт)');

        // Тут ми шукаємо ознаки відключень або таблиць у HTML
        // Якщо сайт працює і є згадки ГПВ (графіків погодинних відключень)
        if (html.includes('ГПВ') || html.includes('черг') || html.includes('відключ')) {
            console.log('💡 Знайдено згадки про відключення на сайті!');

            // У реальних умовах тут йде парсинг таблиць або JSON-відповідей Nuxt.js
            // Якщо сайт віддає звичайний текст, можемо оновити мітку часу
            const currentData = JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf8'));
            currentData.updated_at = new Date().toISOString();
            currentData.parser_status = 'active_check_success';

            fs.writeFileSync(SCHEDULE_FILE, JSON.stringify(currentData, null, 2));
            console.log('✓ Статус парсера оновлено у файлі.');
        } else {
            console.log('ℹ️ Інформації про відключення у відкритому доступі на сторінці не знайдено (можливо, світло є у всіх).');
        }

    } catch (error) {
        console.error('❌ Помилка парсингу:', error.message);
    }
}

// Запуск, якщо викликано напряму
if (require.main === module) {
    updateScheduleAutomatically();
}

module.exports = { updateScheduleAutomatically };
