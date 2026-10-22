#!/usr/bin/env node
/**
 * Тест парсера v4 на збереженому HTML з alerts.org.ua
 * Перевіряє, що всі OFF-періоди правильно розпізнаються
 */

const fs = require('fs');
const path = require('path');

// Завантажуємо HTML з файлу
const htmlPath = path.join(__dirname, 'alerts-page.html');
if (!fs.existsSync(htmlPath)) {
    console.error('❌ Файл alerts-page.html не знайдено!');
    process.exit(1);
}
const html = fs.readFileSync(htmlPath, 'utf-8');
console.log(`📄 Завантажено HTML: ${(html.length / 1024).toFixed(1)} KB\n`);

// === Парсер (копія логіки з updater.js для ізольованого тесту) ===

const ALL_QUEUES = [
    '1.1', '1.2', '2.1', '2.2', '3.1', '3.2',
    '4.1', '4.2', '5.1', '5.2', '6.1', '6.2'
];

function extractGroupHtml(html, groupId, queue) {
    const marker = `data-group-id="${groupId}"`;
    let start = html.indexOf(marker);

    if (start === -1) {
        start = html.indexOf(`Група ${queue}`);
        if (start === -1) return null;
        start = Math.max(0, start - 200);
    }

    const nextGroup = html.indexOf('js-group', start + marker.length);
    const sheduleEnd = html.indexOf('</div><!-- end shedule -->', start);
    const adsBlock = html.indexOf('adsbygoogle', start + marker.length);

    const candidates = [nextGroup, sheduleEnd, adsBlock].filter(x => x > start);
    const end = candidates.length > 0 ? Math.min(...candidates) : Math.min(start + 3000, html.length);

    return html.substring(start, end);
}

function parseScheduleFromHtml(html) {
    const schedules = {};

    for (const queue of ALL_QUEUES) {
        const intervals = [];
        const [major, minor] = queue.split('.');
        const groupId = `r24g${major}-${minor}`;

        const groupHtml = extractGroupHtml(html, groupId, queue);
        if (!groupHtml) {
            console.log(`   ⚠️ Група ${queue}: блок не знайдено`);
            continue;
        }

        const periodRegex = /data-start="(\d{2}):(\d{2})"\s+data-end="(\d{2}):(\d{2})"[^>]*>([\s\S]*?)(?=<\/div>)/g;
        let match;

        while ((match = periodRegex.exec(groupHtml)) !== null) {
            const h1 = parseInt(match[1]);
            const m1 = parseInt(match[2]);
            const h2 = parseInt(match[3]);
            const m2 = parseInt(match[4]);
            const content = match[5];

            const isOff = /class\s*=\s*["']off["']/i.test(content);
            const hasStts2 = /stts2/.test(match[0]);

            const status = isOff ? '🔴 OFF' : '🟢 ON ';
            const sttsMark = hasStts2 ? ' [stts2]' : ' [no-stts]';
            console.log(`   ${queue}: ${String(h1).padStart(2,'0')}:${String(m1).padStart(2,'0')}-${String(h2).padStart(2,'0')}:${String(m2).padStart(2,'0')} ${status}${isOff ? sttsMark : ''}`);

            if (isOff) {
                intervals.push([h1, m1, h2, m2]);
            }
        }

        if (intervals.length > 0) {
            intervals.sort((a, b) => a[0] * 60 + a[1] - (b[0] * 60 + b[1]));
            schedules[queue] = intervals;
        } else {
            schedules[queue] = [];
        }
    }

    return schedules;
}

// === Виконання тесту ===

console.log('🔍 Парсинг всіх груп...\n');
const result = parseScheduleFromHtml(html);

// === Порівняння з очікуваними даними (з HTML) ===
console.log('\n' + '═'.repeat(70));
console.log('📊 РЕЗУЛЬТАТ ПАРСИНГУ (нова логіка v4):');
console.log('═'.repeat(70));

// Очікувані OFF-періоди з alerts-page.html (manual verification)
const expected = {
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

let allPassed = true;

for (const queue of ALL_QUEUES) {
    const got = result[queue] || [];
    const exp = expected[queue] || [];

    const gotStr = JSON.stringify(got);
    const expStr = JSON.stringify(exp);

    const match = gotStr === expStr;
    const icon = match ? '✅' : '❌';

    if (!match) allPassed = false;

    const intervals = got.map(i =>
        `${String(i[0]).padStart(2,'0')}:${String(i[1]).padStart(2,'0')}-${String(i[2]).padStart(2,'0')}:${String(i[3]).padStart(2,'0')}`
    ).join(', ');

    console.log(`${icon} ${queue}: ${intervals || '(немає відключень)'}`);

    if (!match) {
        const expIntervals = exp.map(i =>
            `${String(i[0]).padStart(2,'0')}:${String(i[1]).padStart(2,'0')}-${String(i[2]).padStart(2,'0')}:${String(i[3]).padStart(2,'0')}`
        ).join(', ');
        console.log(`   Очікувалось: ${expIntervals}`);
        console.log(`   Отримано:    ${intervals}`);
    }
}

console.log('\n' + (allPassed
    ? '🎉 Всі 12 черг спарсені ПРАВИЛЬНО!'
    : '⚠️ Деякі черги спарсені неправильно — потрібна корекція'));

// Виводимо дату зі сторінки
const dataTimeMatch = html.match(/data-time="(\d{4}-\d{2}-\d{2})"/);
const titleMatch = html.match(/(\d{2})\.(\d{2})\.(\d{4})/);
console.log(`\n📅 data-time: ${dataTimeMatch ? dataTimeMatch[1] : 'не знайдено'}`);
console.log(`📅 title date: ${titleMatch ? `${titleMatch[3]}-${titleMatch[2]}-${titleMatch[1]}` : 'не знайдено'}`);
