const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'schedules_cache.json');

app.use(express.json());
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

// Эндпоинт для получения актуальных графиков
app.get('/api/schedules/cherkasy', (req, res) => {
    try {
        let data = {};
        if (fs.existsSync(DATA_FILE)) {
            data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        } else {
            data = generateDefaultSchedules();
            fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        }
        res.json({ success: true, data });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Эндпоинт для обновления графиков (сюда может слать данные ваш парсер или бот)
app.post('/api/schedules/update', (req, res) => {
    try {
        const newData = req.body;
        if (!newData || Object.keys(newData).length === 0) {
            return res.status(400).json({ success: false, error: 'Empty data' });
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(newData, null, 2), 'utf8');
        res.json({ success: true, message: 'Графики успешно обновлены!' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

function generateDefaultSchedules() {
    const today = new Date();
    const result = {};
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

        result[dateStr] = {};
        queues.forEach(queue => {
            const queueGroup = Math.floor(parseFloat(queue));
            result[dateStr][queue] = patterns[queueGroup] || [[8, 0, 12, 0], [18, 0, 21, 0]];
        });
    }
    return result;
}

app.listen(PORT, () => {
    console.log(`🚀 SvitloControl API Server запущен на http://localhost:${PORT}`);
});
