// server.js — Оновлений сервер для СвітлоКонтроль

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const SCHEDULE_FILE = path.join(__dirname, 'current-schedule.json');

// Читання актуального графіку з файлу
function getCurrentSchedule() {
  try {
    if (fs.existsSync(SCHEDULE_FILE)) {
      const rawData = fs.readFileSync(SCHEDULE_FILE, 'utf8');
      return JSON.parse(rawData);
    }
  } catch (e) {
    console.log('⚠ Помилка читання current-schedule.json:', e.message);
  }

  // Дефолт, якщо файл пошкоджено
  return {
    date: new Date().toISOString().split('T')[0],
    updated_at: new Date().toISOString(),
    schedules: {
      "3.1": [[8, 0, 12, 0], [18, 0, 21, 0]]
    }
  };
}

// HTTP Сервер
const server = http.createServer((req, res) => {
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
  if (req.url === '/api/schedules' || req.url === '/api/schedules/cherkasy') {
    const scheduleData = getCurrentSchedule();
    res.writeHead(200);
    res.end(JSON.stringify({
      success: true,
      region: 'Черкаська область',
      date: scheduleData.date,
      updated: scheduleData.updated_at,
      data: {
        [scheduleData.date]: scheduleData.schedules
      }
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

server.listen(PORT, () => {
  console.log(`\n⚡ СвітлоКонтроль API Сервер запущено на порту ${PORT}`);
});
