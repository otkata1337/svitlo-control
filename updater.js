#!/usr/bin/env node
/**
 * SvitloControl Updater - Парсер графіків відключень світла
 * Збирає дані з alerts.org.ua для Черкаської області
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const CACHE_FILE = path.join(__dirname, 'schedules_cache.json');
const ALERTS_URL = 'https://alerts.org.ua/cherkaska-oblast';

// Експорт картки міст для використання сервером
const CITIES_MAP = {
    'smila': 'Сміла',
    'cherkasy': 'Черкаси',
    'umany': 'Умань',
    'zolotonosha': 'Золотоноша',
    'kaniv': 'Канів',
    'smila_district': 'Смілянський район'
};

// Експортної функції для парсингу
function parseSchedules(html) {
    if (!html) return {};

    const schedules = {};

    // Регулярне вираження для пошуку часових інтервалів (HH:MM - HH:MM)
    const timePattern = /(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/g;
    const datePattern = /(\d{4}[-/]\d{2}[-/]\d{2}|\d{1,2}[.-]\d{1,2})/;

    // Видаляємо HTML теги
    let text = html
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<style[^>]*>.*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&/g, '&');

    const lines = text.split('\n');
    let currentDate = new Date().toISOString().split('T')[0];
    let currentCity = 'cherkasy';

    for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed || trimmed.length < 3) continue;

        // Перевіримо чи це назва міста
        for (const [key, cityName] of Object.entries(CITIES_MAP)) {
            if (trimmed.toLowerCase().includes(cityName.toLowerCase())) {
                currentCity = key;
                break;
            }
        }

        // Шукаємо дату
        const dateMatch = trimmed.match(datePattern);
        if (dateMatch) {
            try {
                const dateStr = dateMatch[1];
                if (dateStr.includes('-') && dateStr.length === 10) {
                    currentDate = dateStr;
                } else {
                    const [day, month] = dateStr.split(/[.-]/);
                    const year = new Date().getFullYear();
                    const date = new Date(year, parseInt(month) - 1, parseInt(day));
                    currentDate = date.toISOString().split('T')[0];
                }
            } catch (e) {
                // Ігноруємо помилку парсингу дати
            }
        }

        // Шукаємо часові інтервали
        let match;
        const times = [];
        while ((match = timePattern.exec(trimmed)) !== null) {
            times.push([
                parseInt(match[1]),
                parseInt(match[2]),
                parseInt(match[3]),
                parseInt(match[4])
            ]);
        }

        if (times.length > 0) {
            if (!schedules[currentDate]) {
                schedules[currentDate] = {};
            }
            schedules[currentDate][currentCity] = times;
        }
    }

    return schedules;
}

module.exports = { parseSchedules, CITIES_MAP, ALERTS_URL, CACHE_FILE };