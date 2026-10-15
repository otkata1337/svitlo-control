#!/usr/bin/env node
/**
 * SvitloControl Updater v3 - Улучшенный парсер
 * Корректно парсит все 12 черг с alerts.org.ua
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, 'schedules_cache.json');

const URLS = [
    'https://alerts.org.ua/cherkaska-oblast',
    'https://alerts.org.ua/uk/cherkaska-oblast',
    'https://alerts.org.ua/cherkaska'
];

// Резервний графік
const FALLBACK_SCHEDULE = {
    '1.1': [[10, 0, 12, 0], [16, 0, 18, 0], [22, 0, 24, 0]],
    '1.2': [[10, 0, 12, 0], [16, 0, 18, 0], [22, 0, 24, 0]],
    '2.1': [[10, 0, 12, 0], [18, 0, 20, 0]],
    '2.2': [[6, 0, 8, 0], [18, 0, 20, 0]],
    '3.1': [[13, 0, 15, 0], [18, 0, 20, 0]],
    '3.2': [[8, 0, 10, 0], [15, 0, 18, 0], [22, 0, 24, 0]],
    '4.1': [[14, 0, 16, 0], [20, 0, 22, 0]],
    '4.2': [[12, 0, 14, 0], [16, 0, 18, 0], [20, 0, 22, 0]],
    '5.1': [[8, 0, 10, 0], [14, 0, 16, 0], [18, 0, 20, 0]],
    '5.2': [[8, 0, 10, 0], [14, 0, 16, 0]],
    '6.1': [[12, 0, 14, 0], [20, 0, 22, 0]],
    '6.2': [[12, 0, 14, 0], [20, 0, 22, 0]]
};

class ScheduleParser {
    constructor() {
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'uk-UA,uk;q=0.9,en-US;q=0.8'
        };
    }

    /**
     * Завантажує сторінку з редиректами та повторними спробами
     */
    async fetchPage(url, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`📥 Спроба ${attempt}/${maxRetries}: ${url}`);
                const data = await this.makeRequest(url);
                console.log(`✓ Завантажено (${(data.length / 1024).toFixed(1)} KB)`);
                return data;
            } catch (err) {
                console.log(`   ⚠️ ${err.message}`);
                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt - 1) * 1000;
                    await new Promise(r => setTimeout(r, delay));
                }
            }
        }
        return null;
    }

    /**
     * Робить HTTP запит з дотриманням редиректів
     */
    makeRequest(url, maxRedirects = 5) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Timeout'));
            }, 20000);

            const makeReq = (currentUrl, redirects = 0) => {
                if (redirects > maxRedirects) {
                    clearTimeout(timeout);
                    reject(new Error('Too many redirects'));
                    return;
                }

                https.get(currentUrl, { headers: this.headers }, (res) => {
                    if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
                        let location = res.headers.location;
                        if (location) {
                            // Обробляємо відносні редиректи
                            if (location.startsWith('//')) {
                                location = 'https:' + location;
                            } else if (location.startsWith('/')) {
                                try {
                                    const url = new URL(currentUrl);
                                    location = url.origin + location;
                                } catch (e) {
                                    // ignore
                                }
                            }
                            makeReq(location, redirects + 1);
                        } else {
                            clearTimeout(timeout);
                            reject(new Error('Redirect without location'));
                        }
                        return;
                    }

                    if (res.statusCode !== 200) {
                        clearTimeout(timeout);
                        reject(new Error(`HTTP ${res.statusCode}`));
                        return;
                    }

                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        clearTimeout(timeout);
                        resolve(data);
                    });
                }).on('error', err => {
                    clearTimeout(timeout);
                    reject(err);
                });
            };

            makeReq(url);
        });
    }

    /**
     * Парсить HTML та витягує графіки всіх 12 черг
     * Використовує data-start, data-end атрибути та stts2 клас для OFF періодів
     */
    parseSchedules(html) {
        if (!html) return null;

        const schedules = {};

        // Регулярне вираження для пошуку груп
        // Ловить: Група 1.1, Група 1.2, etc
        const groupRegex = /Група\s+([1-6]\.[1-2])/g;
        let groupMatch;

        // Шукаємо всі групи
        while ((groupMatch = groupRegex.exec(html)) !== null) {
            const queueNum = groupMatch[1];

            // Знаходимо позицію, де починається ця група
            const groupStart = groupMatch.index;

            // Шукаємо наступну групу або кінець документа
            const nextGroupMatch = new RegExp(`Група\\s+[1-6]\\.[1-2]`).exec(
                html.substring(groupStart + groupMatch[0].length)
            );

            const groupEnd = nextGroupMatch
                ? groupStart + groupMatch[0].length + nextGroupMatch.index
                : html.length;

            // Витягуємо текст цієї групи
            const groupHtml = html.substring(groupStart, groupEnd);

            // Парсимо інтервали для цієї групи
            const intervals = this.parseGroupIntervals(groupHtml);

            if (intervals && intervals.length > 0) {
                schedules[queueNum] = intervals;
            }
        }

        return Object.keys(schedules).length > 0 ? schedules : null;
    }

    /**
     * Парсить інтервали для однієї групи
     * Шукає data-start, data-end та перевіряє stts2 клас (OFF)
     */
    parseGroupIntervals(groupHtml) {
        const intervals = [];

        // Регулярне вираження для пошуку периодів з data-start та data-end
        // Приклад: <div data-start="00:00" data-end="10:00" class="passed stts0">
        const periodRegex = /data-start="(\d{2}):(\d{2})"\s+data-end="(\d{2}):(\d{2})"\s+class="[^"]*stts2[^"]*"/g;

        let match;
        while ((match = periodRegex.exec(groupHtml)) !== null) {
            const h1 = parseInt(match[1]);
            const m1 = parseInt(match[2]);
            const h2 = parseInt(match[3]);
            const m2 = parseInt(match[4]);

            // stts2 означає OFF (відключення), тому додаємо цей інтервал
            intervals.push([h1, m1, h2, m2]);
        }

        return intervals;
    }

    /**
     * Завантажує існуючий кеш
     */
    loadCache() {
        if (fs.existsSync(CACHE_FILE)) {
            try {
                return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
            } catch (e) {
                console.warn(`⚠️ Помилка при завантаженні кешу: ${e.message}`);
            }
        }
        return {};
    }

    /**
     * Зберігає кеш
     */
    saveCache(cache) {
        try {
            fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
            console.log(`✓ Кеш збережено: ${CACHE_FILE}`);
            return true;
        } catch (e) {
            console.error(`❌ Помилка при збереженні: ${e.message}`);
            return false;
        }
    }

    /**
     * Оновляє кеш новими даними
     */
    updateCache(parsedSchedules) {
        // Якщо не вдалося спарсити - використовуємо резервний
        if (!parsedSchedules || Object.keys(parsedSchedules).length === 0) {
            console.log('⚠️ Використовую резервний графік');
            parsedSchedules = FALLBACK_SCHEDULE;
        } else {
            // Заповняємо відсутні групи резервними даними
            for (const [queueKey, queueData] of Object.entries(FALLBACK_SCHEDULE)) {
                if (!(queueKey in parsedSchedules)) {
                    parsedSchedules[queueKey] = queueData;
                }
            }
        }

        const today = new Date();
        const result = {};

        // Генеруємо дані на 10 днів
        for (let i = -1; i < 9; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            result[dateStr] = parsedSchedules;
        }

        return result;
    }

    /**
     * Виводить деталь групи для дебугу
     */
    debugGroup(queueNum, intervals) {
        if (intervals.length === 0) {
            console.log(`   ❌ ${queueNum}: відключень не знайдено`);
        } else {
            const times = intervals.map(i => `${String(i[0]).padStart(2,'0')}:${String(i[1]).padStart(2,'0')}-${String(i[2]).padStart(2,'0')}:${String(i[3]).padStart(2,'0')}`).join(', ');
            console.log(`   ✓ ${queueNum}: ${times}`);
        }
    }

    /**
     * Головна функція
     */
    async run() {
        console.log('='.repeat(70));
        console.log('SvitloControl Updater v3 - Валідні Групи');
        console.log('='.repeat(70));
        console.log(`⏰ ${new Date().toLocaleString('uk-UA')}\n`);

        // Спробуємо завантажити з усіх URL
        let html = null;
        for (const url of URLS) {
            html = await this.fetchPage(url);
            if (html) break;
        }

        let parsedSchedules;
        if (!html) {
            console.log('❌ Не вдалося завантажити сторінку');
            console.log('💡 Використовую резервні дані');
            parsedSchedules = FALLBACK_SCHEDULE;
        } else {
            console.log('\n🔍 Парсимо графіки...\n');
            parsedSchedules = this.parseSchedules(html);

            if (!parsedSchedules || Object.keys(parsedSchedules).length === 0) {
                console.log('⚠️ Не вдалося спарсити дані');
                console.log('💡 Використовую резервні дані');
                parsedSchedules = FALLBACK_SCHEDULE;
            } else {
                console.log(`✓ Спарсено ${Object.keys(parsedSchedules).length} черг:\n`);
                for (const [queueNum, intervals] of Object.entries(parsedSchedules).sort()) {
                    this.debugGroup(queueNum, intervals);
                }
            }
        }

        // Оновляємо кеш (заповняємо відсутні групи)
        const cache = this.updateCache(parsedSchedules);

        // Зберігаємо
        if (this.saveCache(cache)) {
            console.log();
            console.log('📊 Статистика:');
            console.log(`   📅 Днів у кеші: ${Object.keys(cache).length}`);
            console.log(`   🔔 Черг: ${Object.keys(cache[Object.keys(cache)[0]]).length}`);
            const dates = Object.keys(cache).sort();
            console.log(`   🕐 З: ${dates[0]}`);
            console.log(`   🕐 До: ${dates[dates.length - 1]}`);
            console.log();
            console.log('✅ Оновлення успішно завершено!');
            return true;
        } else {
            console.log('❌ Збій!');
            return false;
        }
    }
}

async function main() {
    const parser = new ScheduleParser();
    try {
        const success = await parser.run();
        process.exit(success ? 0 : 1);
    } catch (e) {
        console.error(`❌ Помилка: ${e.message}`);
        process.exit(1);
    }
}

main();
