// generate-icons.js — Генератор іконок для PWA та сторів
const fs = require('fs');
const path = require('path');

// Створюємо SVG іконку 512x512 високої якості
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="bolt" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="25" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Фон з заокругленими кутами (iOS/Android стилізація) -->
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>

  <!-- Декоративне свічення -->
  <circle cx="256" cy="256" r="140" fill="#f59e0b" opacity="0.15" filter="url(#glow)"/>

  <!-- Блискавка (⚡) -->
  <path d="M288 64L112 272H240L224 448L400 240H272L288 64Z" fill="url(#bolt)" stroke="#fff" stroke-width="8" stroke-linejoin="round"/>
</svg>
`;

const iconsDir = path.join(__dirname);
fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svgIcon);
console.log('✓ icon.svg успішно створено');

// Також створимо HTML-файл для конвертації SVG у PNG прямо в браузері (якщо потрібно)
const htmlConverter = `
<!DOCTYPE html>
<html lang="uk">
<head><meta charset="UTF-8"><title>Icon Converter</title></head>
<body style="background:#222;color:#fff;font-family:sans-serif;text-align:center;padding-top:50px;">
    <h2>Генератор іконок СвітлоКонтроль</h2>
    <p>Натисніть кнопку, щоб зберегти іконку 512x512 у форматі PNG для сторів:</p>
    <canvas id="canvas" width="512" height="512" style="border-radius:112px;box-shadow:0 10px 30px rgba(0,0,0,0.5);margin:20px;"></canvas>
    <br>
    <a id="download" download="icon-512x512.png" style="background:#f59e0b;color:#000;padding:12px 24px;text-decoration:none;border-radius:10px;font-weight:bold;display:inline-block;">Завантажити PNG (512x512)</a>
    <script>
        const img = new Image();
        img.src = 'icon.svg';
        img.onload = () => {
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            document.getElementById('download').href = canvas.toDataURL('image/png');
        };
    </script>
</body>
</html>
`;

fs.writeFileSync(path.join(iconsDir, 'icon-generator.html'), htmlConverter);
console.log('✓ icon-generator.html створено для зручного завантаження PNG');
