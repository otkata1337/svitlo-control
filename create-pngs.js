// create-pngs.js — Створення реальних PNG іконок через SVG (base64)
const fs = require('fs');
const path = require('path');

// Простий валідний PNG у вигляді base64 (темна плашка з іконкою)
// Але щоб не залежати від зовнішніх біб, збережемо SVG як PNG не вийде напряму без canvas.
// Однак ми можемо зробити так: запишемо SVG під іменами icon-192.png та icon-512.png,
// Або створимо мінімальні валідні PNG базкові байти.

// Мінімальний валідний 1x1 PNG, або зробимо хитріше:
// Попросимо GitHub/користувача, або створимо реальний маленький PNG файл через Buffer:

const tinyPngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

fs.writeFileSync(path.join(__dirname, 'icon-192.png'), tinyPngBuffer);
fs.writeFileSync(path.join(__dirname, 'icon-512.png'), tinyPngBuffer);

console.log('✓ Згенеровано тимчасові PNG іконки icon-192.png та icon-512.png');
