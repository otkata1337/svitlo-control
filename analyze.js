#!/usr/bin/env node
/**
 * HTML Analyzer - Анализ структуры сайта alerts.org.ua
 * Помогает понять, как парсить графики
 */

const https = require('https');
const fs = require('fs');

function makeRequest(url) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout')), 20000);

        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                clearTimeout(timeout);
                if (res.statusCode === 200) resolve(data);
                else if ([301, 302, 307, 308].includes(res.statusCode)) {
                    clearTimeout(timeout);
                    let location = res.headers.location;
                    if (location.startsWith('//')) location = 'https:' + location;
                    makeRequest(location).then(resolve).catch(reject);
                } else reject(new Error(`HTTP ${res.statusCode}`));
            });
        }).on('error', err => {
            clearTimeout(timeout);
            reject(err);
        });
    });
}

async function analyzeHtml() {
    console.log('Завантажую сторінку alerts.org.ua...\n');

    try {
        const html = await makeRequest('https://alerts.org.ua/cherkaska-oblast');
        console.log(`✓ HTML завантажено (${(html.length / 1024).toFixed(1)} KB)\n`);

        // Аналіз 1: Які теги містять номери черг?
        console.log('=== АНАЛІЗ 1: Пошук номерів черг ===\n');

        const queueMatches = html.match(/[1-6]\.[1-2]/g);
        if (queueMatches) {
            const unique = [...new Set(queueMatches)].sort();
            console.log(`Знайдено ${unique.length} унікальних черг: ${unique.join(', ')}\n`);
        }

        // Аналіз 2: Контекст навколо черг
        console.log('=== АНАЛІЗ 2: Контекст навколо черг ===\n');

        const contextRegex = /(.{0,150}[1-6]\.[1-2].{0,150})/g;
        const contexts = html.match(contextRegex);
        if (contexts) {
            contexts.slice(0, 5).forEach((ctx, i) => {
                // Видаляємо HTML теги для читабельності
                const clean = ctx.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                console.log(`${i + 1}. ${clean.substring(0, 100)}...`);
            });
        }

        // Аналіз 3: Де розташовані часи відключень?
        console.log('\n=== АНАЛІЗ 3: Часові інтервали ===\n');

        const timeMatches = html.match(/(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})/g);
        if (timeMatches) {
            const unique = [...new Set(timeMatches)];
            console.log(`Знайдено ${unique.length} унікальних інтервалів:`);
            unique.slice(0, 15).forEach(time => {
                console.log(`   • ${time}`);
            });
        }

        // Аналіз 4: Структура HTML (div, table, etc)
        console.log('\n=== АНАЛІЗ 4: HTML структура ===\n');

        // Видаляємо скрипти та стилі
        const cleanHtml = html
            .replace(/<script[^>]*>.*?<\/script>/gis, '')
            .replace(/<style[^>]*>.*?<\/style>/gis, '');

        // Пошук основних контейнерів
        const divCount = (cleanHtml.match(/<div/g) || []).length;
        const tableCount = (cleanHtml.match(/<table/g) || []).length;
        const liCount = (cleanHtml.match(/<li/g) || []).length;
        const spanCount = (cleanHtml.match(/<span/g) || []).length;

        console.log(`DIV: ${divCount}, TABLE: ${tableCount}, LI: ${liCount}, SPAN: ${spanCount}\n`);

        // Аналіз 5: Шукаємо блоки з назвами черг та часами
        console.log('=== АНАЛІЗ 5: Блоки з графіками ===\n');

        // Шукаємо блоки, що містять номер черги та часи
        const blockRegex = /(<div[^>]*>[\s\S]{0,500}?[1-6]\.[1-2][\s\S]{0,500}?<\/div>)/gi;
        const blocks = html.match(blockRegex);
        if (blocks) {
            console.log(`Знайдено ${blocks.length} блоків з графіками\n`);

            blocks.slice(0, 3).forEach((block, i) => {
                const clean = block
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/&[^;]+;/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                console.log(`Блок ${i + 1} (${clean.length} символів):`);
                console.log(`  ${clean.substring(0, 150)}...\n`);
            });
        }

        // Аналіз 6: Текстовий вміст
        console.log('=== АНАЛІЗ 6: Простий текстовий парсинг ===\n');

        const text = cleanHtml.replace(/<[^>]+>/g, ' ').replace(/&[^;]+;/g, ' ');
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);

        // Шукаємо лінії, що містять чергу та час
        const relevantLines = lines.filter(l =>
            /[1-6]\.[1-2]/.test(l) && /\d{1,2}:\d{2}/.test(l)
        );

        console.log(`Знайдено ${relevantLines.length} релевантних ліній:\n`);
        relevantLines.slice(0, 15).forEach((line, i) => {
            console.log(`${i + 1}. ${line.substring(0, 100)}`);
        });

        // Збережемо HTML для ручного аналізу
        fs.writeFileSync('alerts-page.html', html, 'utf-8');
        console.log('\n✓ HTML збережено в alerts-page.html для ручного аналізу');

    } catch (e) {
        console.error(`❌ Помилка: ${e.message}`);
    }
}

analyzeHtml();
