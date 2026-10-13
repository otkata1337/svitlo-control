// server.js — Node.js Парсер для графіків Черкасиобленерго

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const CACHE_FILE = path.join(__dirname, 'schedules-cache.json');
const CACHE_DURATION = 3600000; // 1 час в миллисекундах

// Структура даних графіків
let schedulesCache = {
  lastUpdate: 0,
  data: {}
};

// Завантаження кешу з файлу при старті
function loadCache() {
  if (fs.existsSync(CACHE_FILE)) {
    try {
      schedulesCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      console.log('✓ Кеш завантажено');
    } catch (e) {
      console.log('⚠ Помилка читання кешу, використовуємо дефолт');
    }
  }
}

// Збереження кешу у файл
function saveCache() {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(schedulesCache, null, 2));
}

// Демонстраційні графіки (коли парсинг недоступний)
function getDefaultSchedules() {
  const today = new Date();
  const schedules = {};

  // Генеруємо графіки для 6 черг на тиждень
  const queues = ['1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '4.1', '4.2', '5.1', '5.2', '6.1', '6.2'];
  const patterns = {
    1: [[6, 0, 8, 0], [12, 0, 14, 0], [18, 0, 20, 0]],
    2: [[8, 0, 10, 0], [14, 0, 16, 0], [20, 0, 22, 0]],
    3: [[7, 0, 11, 0], [15, 0, 19, 0]],
    4: [[10, 0, 14, 0], [18, 0, 22, 0]],
    5: [[6, 0, 9, 0], [13, 0, 16, 0], [20, 0, 23, 0]],
    6: [[9, 0, 12, 0], [16, 0, 19, 0]]
  };

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    schedules[dateStr] = {};
    queues.forEach(queue => {
      const queueGroup = Math.floor(parseFloat(queue));
      schedules[dateStr][queue] = patterns[queueGroup] || [[8, 0, 12, 0], [18, 0, 21, 0]];
    });
  }

  return schedules;
}

// Парсинг сайту Черкасиобленерго (спроба)
function parseCherkasyOblenergo() {
  return new Promise((resolve, reject) => {
    const url = 'https://www.cherkasyoblenergo.com/';

    https.get(url, { timeout: 5000 }, (res) => {
      let html = '';
      res.on('data', chunk => html += chunk);
      res.on('end', () => {
        try {
          // Шукаємо JSON у сторінці або таблиці
          // Це дуже базовий парсинг — реальний сайт може мати інші структури
          const schedules = extractSchedulesFromHTML(html);
          if (Object.keys(schedules).length > 0) {
            resolve(schedules);
          } else {
            resolve(getDefaultSchedules());
          }
        } catch (e) {
          console.log('⚠ Помилка парсингу:', e.message);
          resolve(getDefaultSchedules());
        }
      });
    }).on('error', (e) => {
      console.log('⚠ Помилка завантаження сайту:', e.message);
      reject(e);
    });
  });
}

// Базовий парсинг HTML (потрібна адаптація під реальний сайт)
function extractSchedulesFromHTML(html) {
  const schedules = {};

  // Тимчасово повертаємо дефолт — потрібна адаптація під реальну структуру
  // У реальній імплементації тут буде regex або cheerio для парсингу таблиць

  return schedules;
}

// Оновлення графіків (із кешуванням)
async function updateSchedules() {
  const now = Date.now();

  if (now - schedulesCache.lastUpdate < CACHE_DURATION) {
    console.log('✓ Кеш ще свіжий, пропускаємо оновлення');
    return;
  }

  console.log('🔄 Оновлення графіків...');

  try {
    const schedules = await parseCherkasyOblenergo();
    schedulesCache.data = schedules;
    schedulesCache.lastUpdate = now;
    saveCache();
    console.log('✓ Графіки оновлено');
  } catch (e) {
    console.log('⚠ Помилка оновлення, використовуємо кеш:', e.message);
    if (Object.keys(schedulesCache.data).length === 0) {
      schedulesCache.data = getDefaultSchedules();
      schedulesCache.lastUpdate = now;
    }
  }
}

// HTTP Сервер
const server = http.createServer(async (req, res) => {
  // CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API Роути
  if (req.url === '/api/schedules') {
    await updateSchedules();
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      data: schedulesCache.data,
      updated: new Date(schedulesCache.lastUpdate).toISOString()
    }));
    return;
  }

  if (req.url === '/api/schedules/cherkasy') {
    await updateSchedules();
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      region: 'Черкаська область',
      data: schedulesCache.data,
      updated: new Date(schedulesCache.lastUpdate).toISOString()
    }));
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
    return;
  }

  // 404
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Ініціалізація
loadCache();
updateSchedules();

// Оновлення кожну годину
setInterval(updateSchedules, 3600000);

server.listen(PORT, () => {
  console.log(`\n⚡ СвітлоКонтроль API Сервер запущено`);
  console.log(`📡 Адреса: http://localhost:${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api/schedules`);
  console.log(`🏥 Health: http://localhost:${PORT}/health\n`);
});
