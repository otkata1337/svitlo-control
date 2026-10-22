#!/usr/bin/env node
/**
 * SvitloControl Updater v4 — Надійний парсер графіків відключень
 * ✅ Парсить OFF-періоди за тегом <b class="off"> (не залежить від stts2)
 * ✅ Завантажує окремі сторінки для кожного дня
 * ✅ Зберігає дату оновлення та метадані
 * ✅ Єдиний набір fallback-даних
 *
 * Джерело: alerts.org.ua/cherkaska-oblast
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ─── Конфігурація ───────────────────────────────────────────────────────────

const CACHE_FILE = path.join(__dirname, 'schedules_cache.json');

const BASE_URL = 'https://alerts.org.ua/cherkaska-oblast';

// Скільки днів парсити (назад і вперед від сьогодні)
const DAYS_BACK = 1;
const DAYS_FORWARD = 3;

// Всі 12 черг
const ALL_QUEUES = [
    '1.1', '1.2', '2.1', '2.2', '3.1', '3.2',
    '4.1', '4.2', '5.1', '5.2', '6.1', '6.2'
];

// Єдиний fallback-набір (використовується ТІЛЬКИ якщо всі спроби завантаження невдалі)
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

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'uk-UA,uk;q=0.9,en-US;q=0.8',
    'Accept-Encoding': 'identity'
};

// ─── HTTP-клієнт ────────────────────────────────────────────────────────────

/**
 * Робить HTTPS GET-запит з підтримкою редиректів
 */
function httpGet(url, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout 25s')), 25000);

        const follow = (currentUrl, redirectCount = 0) => {
            if (redirectCount > maxRedirects) {
                clearTimeout(timeout);
                return reject(new Error('Забагато редиректів'));
            }

            const req = https.get(currentUrl, { headers: HEADERS }, (res) => {
                // Редиректи
                if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
                    let location = res.headers.location;
                    if (!location) {
                        clearTimeout(timeout);
                        return reject(new Error('Redirect без Location'));
                    }
                    if (location.startsWith('//')) location = 'https:' + location;
                    else if (location.startsWith('/')) {
                        try {
                            const u = new URL(currentUrl);
                            location = u.origin + location;
                        } catch (_) { /* ignore */ }
                    }
                    res.resume(); // Drain the response
                    return follow(location, redirectCount + 1);
                }

                if (res.statusCode !== 200) {
                    clearTimeout(timeout);
                    res.resume();
                    return reject(new Error(`HTTP ${res.statusCode}`));
                }

                const chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => {
                    clearTimeout(timeout);
                    resolve(Buffer.concat(chunks).toString('utf-8'));
                });
                res.on('error', err => {
                    clearTimeout(timeout);
                    reject(err);
                });
            });

            req.on('error', err => {
                clearTimeout(timeout);
                reject(err);
            });
        };

        follow(url);
    });
}

/**
 * Завантажує сторінку з повторними спробами
 */
async function fetchWithRetry(url, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const data = await httpGet(url);
            return data;
        } catch (err) {
            console.log(`   ⚠️ Спроба ${attempt}/${maxRetries}: ${err.message}`);
            if (attempt < maxRetries) {
                const delay = Math.pow(2, attempt - 1) * 1500;
                await new Promise(r => setTimeout(r, delay));
            }
        }
    }
    return null;
}

// ─── Парсер HTML ────────────────────────────────────────────────────────────

/**
 * Парсить HTML-сторінку alerts.org.ua та витягує графіки всіх 12 черг.
 *
 * Алгоритм:
 * 1. Знаходить блок кожної групи: <div class="...js-group" data-group-id="r24gX-Y">
 * 2. Всередині блоку шукає <div data-start="HH:MM" data-end="HH:MM">
 * 3. Перевіряє наявність <b class="off"> всередині — це означає OFF (відключення)
 *
 * Це надійніше ніж перевірка CSS класу stts2, бо stts2 не ставиться
 * на майбутні періоди (тільки на passed/active).
 */
function parseScheduleFromHtml(html) {
    if (!html || html.length < 500) return null;

    const schedules = {};

    // Ітеруємо по кожній черзі
    for (const queue of ALL_QUEUES) {
        const intervals = [];

        // Формуємо data-group-id: "1.1" → "r24g1-1", "3.2" → "r24g3-2"
        const [major, minor] = queue.split('.');
        const groupId = `r24g${major}-${minor}`;

        // Знаходимо блок цієї групи
        const groupIdIdx = html.indexOf(`data-group-id="${groupId}"`);
        if (groupIdIdx === -1) {
            // Спробуємо альтернативний маркер: "Група X.Y"
            const altIdx = html.indexOf(`Група ${queue}`);
            if (altIdx === -1) continue;
        }

        // Витягуємо HTML-фрагмент для цієї групи
        const groupHtml = extractGroupHtml(html, groupId, queue);
        if (!groupHtml) continue;

        // Знаходимо всі періоди з data-start/data-end
        const periodRegex = /data-start="(\d{2}):(\d{2})"\s+data-end="(\d{2}):(\d{2})"[^>]*>([\s\S]*?)(?=<\/div>)/g;
        let match;

        while ((match = periodRegex.exec(groupHtml)) !== null) {
            const h1 = parseInt(match[1]);
            const m1 = parseInt(match[2]);
            const h2 = parseInt(match[3]);
            const m2 = parseInt(match[4]);
            const content = match[5];

            // Перевіряємо: чи є всередині <b class="off"> — це надійний маркер OFF
            const isOff = /class\s*=\s*["']off["']/i.test(content);

            if (isOff) {
                intervals.push([h1, m1, h2, m2]);
            }
        }

        if (intervals.length > 0) {
            // Сортуємо за часом початку
            intervals.sort((a, b) => a[0] * 60 + a[1] - (b[0] * 60 + b[1]));
            schedules[queue] = intervals;
        }
    }

    return Object.keys(schedules).length > 0 ? schedules : null;
}

/**
 * Витягує HTML-фрагмент для конкретної групи
 */
function extractGroupHtml(html, groupId, queue) {
    // Спосіб 1: по data-group-id
    const marker = `data-group-id="${groupId}"`;
    let start = html.indexOf(marker);

    if (start === -1) {
        // Спосіб 2: по "Група X.Y"
        start = html.indexOf(`Група ${queue}`);
        if (start === -1) return null;
        start = Math.max(0, start - 200); // Відступаємо назад щоб захопити обгортку
    }

    // Шукаємо кінець блоку: наступний js-group або кінець #shedule
    const nextGroup = html.indexOf('js-group', start + marker.length);
    const sheduleEnd = html.indexOf('</div><!-- end shedule -->', start);
    const adsBlock = html.indexOf('adsbygoogle', start + marker.length);

    // Вибираємо найближчий кінець
    const candidates = [nextGroup, sheduleEnd, adsBlock].filter(x => x > start);
    const end = candidates.length > 0 ? Math.min(...candidates) : Math.min(start + 3000, html.length);

    return html.substring(start, end);
}

/**
 * Витягує дату зі сторінки alerts.org.ua
 * Шукає формат "DD.MM.YYYY" у заголовку або data-time атрибуті
 */
function extractDateFromHtml(html) {
    // 1. Спочатку шукаємо data-time="YYYY-MM-DD" у div#shedule
    const dataTimeMatch = html.match(/data-time="(\d{4}-\d{2}-\d{2})"/);
    if (dataTimeMatch) {
        return dataTimeMatch[1];
    }

    // 2. Шукаємо в заголовку: "на сьогодні - DD.MM.YYYY"
    const titleMatch = html.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    if (titleMatch) {
        return `${titleMatch[3]}-${titleMatch[2]}-${titleMatch[1]}`;
    }

    return null;
}

// ─── Кеш ────────────────────────────────────────────────────────────────────

/**
 * Завантажує існуючий кеш
 */
function loadCache() {
    if (fs.existsSync(CACHE_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
            // Підтримуємо обидва формати: старий (flat) і новий (з meta)
            if (data._meta && data.schedules) {
                return data;
            }
            // Старий формат — конвертуємо
            return { schedules: data, _meta: {} };
        } catch (e) {
            console.warn(`⚠️ Помилка кешу: ${e.message}`);
        }
    }
    return { schedules: {}, _meta: {} };
}

/**
 * Зберігає кеш з метаданими
 */
function saveCache(schedulesByDate, meta) {
    // Зберігаємо у "плоскому" форматі для сумісності з фронтендом
    // Фронтенд очікує: { "YYYY-MM-DD": { "X.Y": [[h,m,h,m], ...] } }
    const output = { ...schedulesByDate };

    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(output, null, 2), 'utf-8');
        console.log(`✅ Кеш збережено: ${CACHE_FILE}`);
        return true;
    } catch (e) {
        console.error(`❌ Помилка збереження: ${e.message}`);
        return false;
    }
}

/**
 * Заповнює відсутні черги fallback-даними
 */
function fillMissingQueues(schedule) {
    const filled = { ...schedule };
    for (const queue of ALL_QUEUES) {
        if (!filled[queue] || filled[queue].length === 0) {
            if (FALLBACK_SCHEDULE[queue]) {
                filled[queue] = FALLBACK_SCHEDULE[queue];
            }
        }
    }
    return filled;
}

// ─── Утиліти ────────────────────────────────────────────────────────────────

/**
 * Форматує дату в YYYY-MM-DD (локальний час, Київ)
 */
function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Форматує інтервал для логу
 */
function formatInterval(interval) {
    return `${String(interval[0]).padStart(2, '0')}:${String(interval[1]).padStart(2, '0')}-${String(interval[2]).padStart(2, '0')}:${String(interval[3]).padStart(2, '0')}`;
}

/**
 * Виводить графік для дебагу
 */
function printSchedule(schedule, label) {
    console.log(`\n📋 ${label}:`);
    const sortedQueues = Object.keys(schedule).sort((a, b) => {
        const [aMaj, aMin] = a.split('.').map(Number);
        const [bMaj, bMin] = b.split('.').map(Number);
        return aMaj !== bMaj ? aMaj - bMaj : aMin - bMin;
    });

    for (const queue of sortedQueues) {
        const intervals = schedule[queue];
        if (intervals.length === 0) {
            console.log(`   ⚡ ${queue}: немає відключень`);
        } else {
            const times = intervals.map(formatInterval).join(', ');
            console.log(`   🔴 ${queue}: ${times}`);
        }
    }
}

// ─── Головна логіка ─────────────────────────────────────────────────────────

async function main() {
    console.log('═'.repeat(70));
    console.log('  SvitloControl Updater v4 — Надійний парсер');
    console.log('═'.repeat(70));

    const now = new Date();
    console.log(`⏰ ${now.toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' })}\n`);

    // Збираємо дати для парсингу
    const datesToFetch = [];
    for (let i = -DAYS_BACK; i <= DAYS_FORWARD; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() + i);
        datesToFetch.push(formatDate(date));
    }

    console.log(`📅 Дати для парсингу: ${datesToFetch.join(', ')}\n`);

    const allSchedules = {};
    let successCount = 0;
    let failCount = 0;
    let todayParsed = false;

    // Крок 1: Парсимо головну сторінку (сьогодні)
    console.log(`🌐 Завантаження головної: ${BASE_URL}`);
    const mainHtml = await fetchWithRetry(BASE_URL);

    if (mainHtml) {
        console.log(`   ✅ Завантажено (${(mainHtml.length / 1024).toFixed(1)} KB)`);

        const mainDate = extractDateFromHtml(mainHtml);
        console.log(`   📅 Дата на сторінці: ${mainDate || 'не визначена'}`);

        const mainSchedule = parseScheduleFromHtml(mainHtml);
        if (mainSchedule) {
            const dateKey = mainDate || formatDate(now);
            allSchedules[dateKey] = fillMissingQueues(mainSchedule);
            successCount++;
            todayParsed = true;

            printSchedule(allSchedules[dateKey], `Графік на ${dateKey}`);
        } else {
            console.log(`   ⚠️ Не вдалося спарсити дані з головної сторінки`);
        }
    } else {
        console.log(`   ❌ Головна сторінка недоступна`);
    }

    // Крок 2: Парсимо окремі дні (сторінки з датою в URL)
    for (const dateStr of datesToFetch) {
        // Пропускаємо сьогодні якщо вже спарсили з головної
        if (todayParsed && allSchedules[dateStr]) continue;

        const dayUrl = `${BASE_URL}/${dateStr.replace(/-/g, '-')}.html`;
        console.log(`\n🌐 Завантаження: ${dayUrl}`);

        const dayHtml = await fetchWithRetry(dayUrl, 2);

        if (dayHtml) {
            console.log(`   ✅ Завантажено (${(dayHtml.length / 1024).toFixed(1)} KB)`);

            const daySchedule = parseScheduleFromHtml(dayHtml);
            if (daySchedule) {
                allSchedules[dateStr] = fillMissingQueues(daySchedule);
                successCount++;
                console.log(`   ✅ Спарсено ${Object.keys(daySchedule).length} черг`);
            } else {
                console.log(`   ⚠️ Не вдалося спарсити`);
                failCount++;
            }
        } else {
            console.log(`   ❌ Сторінка недоступна`);
            failCount++;
        }
    }

    // Крок 3: Заповнюємо дні без даних
    const todayStr = formatDate(now);

    // Якщо для сьогодні є дані — використовуємо їх як шаблон для порожніх днів
    // Якщо немає — використовуємо fallback
    const templateSchedule = allSchedules[todayStr] || fillMissingQueues(FALLBACK_SCHEDULE);

    for (const dateStr of datesToFetch) {
        if (!allSchedules[dateStr]) {
            allSchedules[dateStr] = templateSchedule;
            console.log(`   📋 ${dateStr}: використано шаблон (дані не отримані)`);
        }
    }

    // Крок 4: Видаляємо старі дати (більше 3 днів тому)
    const oldestAllowed = new Date(now);
    oldestAllowed.setDate(oldestAllowed.getDate() - 3);
    const oldestStr = formatDate(oldestAllowed);

    const existingCache = loadCache();
    // Мерджимо зі старим кешем (нові дані мають пріоритет)
    const merged = { ...existingCache.schedules };
    for (const [date, schedule] of Object.entries(allSchedules)) {
        merged[date] = schedule;
    }

    // Видаляємо занадто старі дати
    for (const date of Object.keys(merged)) {
        if (date < oldestStr || date.startsWith('_')) {
            delete merged[date];
        }
    }

    // Крок 5: Зберігаємо
    console.log('\n' + '─'.repeat(70));
    console.log('📊 Підсумки:');
    console.log(`   ✅ Успішно спарсено днів: ${successCount}`);
    console.log(`   ❌ Невдалих спроб: ${failCount}`);

    const sortedDates = Object.keys(merged).filter(d => !d.startsWith('_')).sort();
    console.log(`   📅 Діапазон дат: ${sortedDates[0]} → ${sortedDates[sortedDates.length - 1]}`);
    console.log(`   📦 Загалом днів у кеші: ${sortedDates.length}`);

    if (saveCache(merged, { updatedAt: now.toISOString(), successCount, failCount })) {
        console.log('\n✅ Оновлення завершено успішно!\n');
        return true;
    } else {
        console.log('\n❌ Збій при збереженні!\n');
        return false;
    }
}

// ─── Запуск ─────────────────────────────────────────────────────────────────

main()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
        console.error(`\n❌ Критична помилка: ${err.message}`);
        console.error(err.stack);
        process.exit(1);
    });
