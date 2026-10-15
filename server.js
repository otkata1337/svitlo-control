// server.js — Node.js Парсер для графіків Черкасиобленерго

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const CACHE_FILE = path.join(__dirname, 'schedules-cache.json');
const CACHE_DURATION = 3600000; // 1 час в мілісекундах

const { parseSchedules, CITIES_MAP, ALERTS_URL, CACHE_FILE: UPDATER_CACHE_FILE } = require('./updater.js');

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

// Отримання HTML сторінки з alerts.org.ua
async function fetchAlertsPage() {
  return new Promise((resolve, reject) => {
    console.log(`📥 Завантажую дані з ${ALERTS_URL}...`);

    https.get(ALERTS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('✓ Сторінка завантажена');
        resolve(data);
      });
    }).on('error', (err) => {
      console.error(`❌ Помилка при завантаженні: ${err.message}`);
      reject(err);
    });
  });
}

// Оновлення графіків з використанням парсера updater.js
async function updateSchedulesFromUpdater() {
  console.log('🔄 Оновлення графіків через updater.js parser...');

  try {
    const html = await fetchAlertsPage();
    const schedules = parseSchedules(html);

    if (schedules && Object.keys(schedules).length > 0) {
      schedulesCache.data = schedules;
      schedulesCache.lastUpdate = Date.now();
      saveCache();
      console.log('✓ Графіки оновлено через updater.js parser');
      return true;
    } else {
      console.log('⚠ Парсер повернув порожні дані');
      return false;
    }
  } catch (e) {
    console.log('⚠ Помилка оновлення через updater.js:', e.message);
    return false;
  }
}

// Оновлення графіків (із кешуванням)
async function updateSchedules() {
  const now = Date.now();

  if (now - schedulesCache.lastUpdate < CACHE_DURATION) {
    console.log('✓ Кеш ще свіжий, пропускаємо оновлення');
    return;
  }

  console.log('🔄 Оновлення графіків...');

  // Спочатку спробуємо підлішений парсер
  const success = await updateSchedulesFromUpdater();

  if (!success) {
    // Якщо не вдалося, спробуємо дефолтні графіки
    console.log('🔄 Спроба дефолтних графіків...');
    schedulesCache.data = getDefaultSchedules();
    schedulesCache.lastUpdate = now;
    saveCache();
    console.log('✓ Використовуємо дефолтні графіки');
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