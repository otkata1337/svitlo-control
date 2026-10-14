#!/usr/bin/env node
/**
 * Детальная проверка данных парсера
 * Выводит все периоды для каждой черги с указанием ON/OFF
 */

const fs = require('fs');

const html = fs.readFileSync('alerts-page.html', 'utf-8');

console.log('='.repeat(80));
console.log('ДЕТАЛЬНАЯ ПРОВЕРКА ДАННЫХ ВСЕХ ЧЕР Г');
console.log('='.repeat(80));
console.log();

// Регулярное выражение для поиска групп
const groupRegex = /Група\s+([1-6]\.[1-2])/g;
let groupMatch;

const groupsData = [];

while ((groupMatch = groupRegex.exec(html)) !== null) {
    const queueNum = groupMatch[1];
    const groupStart = groupMatch.index;

    // Находим следующую группу
    const nextGroupMatch = new RegExp(`Група\\s+[1-6]\\.[1-2]`).exec(
        html.substring(groupStart + groupMatch[0].length)
    );

    const groupEnd = nextGroupMatch
        ? groupStart + groupMatch[0].length + nextGroupMatch.index
        : html.length;

    const groupHtml = html.substring(groupStart, groupEnd);

    // Ищем все периоды (ON и OFF)
    const periodRegex = /data-start="(\d{2}):(\d{2})"\s+data-end="(\d{2}):(\d{2})"\s+class="[^"]*"[^>]*>\s*(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})[^<]*<b\s+class="(on|off)"[^>]*>([A-Z]+)<\/b>/gi;

    const periods = [];
    let periodMatch;

    while ((periodMatch = periodRegex.exec(groupHtml)) !== null) {
        const status = periodMatch[9].toLowerCase(); // on или off
        periods.push({
            start: `${periodMatch[1]}:${periodMatch[2]}`,
            end: `${periodMatch[3]}:${periodMatch[4]}`,
            status: status,
            h1: parseInt(periodMatch[1]),
            m1: parseInt(periodMatch[2]),
            h2: parseInt(periodMatch[3]),
            m2: parseInt(periodMatch[4])
        });
    }

    groupsData.push({
        queue: queueNum,
        periods: periods
    });
}

// Выводим данные для каждой черги
groupsData.sort((a, b) => {
    const aNum = parseFloat(a.queue);
    const bNum = parseFloat(b.queue);
    return aNum - bNum;
}).forEach(group => {
    console.log(`📍 Черга ${group.queue}:`);
    console.log('─'.repeat(70));

    const offPeriods = group.periods.filter(p => p.status === 'off');
    const onPeriods = group.periods.filter(p => p.status === 'on');

    console.log(`   Периоды БЕЗ світла (OFF) - ${offPeriods.length}:`);
    if (offPeriods.length > 0) {
        offPeriods.forEach(p => {
            console.log(`      • ${p.start} - ${p.end}`);
        });
    } else {
        console.log(`      Немає перерв`);
    }

    console.log(`\n   Периоди ЗІ світлом (ON) - ${onPeriods.length}:`);
    if (onPeriods.length > 0) {
        onPeriods.forEach(p => {
            console.log(`      • ${p.start} - ${p.end}`);
        });
    }

    // Переводим OFF периоды в формат парсера
    const offIntervals = offPeriods.map(p => [p.h1, p.m1, p.h2, p.m2]);
    console.log(`\n   Формат для JSON: [${offIntervals.map(i => `[${i[0]}, ${i[1]}, ${i[2]}, ${i[3]}]`).join(', ')}]`);

    console.log();
});

// Создаём JSON для скопирования
console.log('='.repeat(80));
console.log('JSON ДЛЯ schedules_cache.json (сегодня):');
console.log('='.repeat(80));

const today = new Date().toISOString().split('T')[0];
const jsonData = {};

groupsData.forEach(group => {
    const offIntervals = group.periods
        .filter(p => p.status === 'off')
        .map(p => [p.h1, p.m1, p.h2, p.m2]);
    jsonData[group.queue] = offIntervals;
});

console.log(JSON.stringify({
    [today]: jsonData
}, null, 2));
