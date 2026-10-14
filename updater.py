#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SvitloControl Updater v2
Парсер графіків відключень світла з alerts.org.ua для Черкаської області
Запускається через GitHub Actions кожну годину
"""

import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime, timedelta
import re
import sys
import os

# Настраиваем кодировку для Windows/Linux консоли
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Пути
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_FILE = os.path.join(SCRIPT_DIR, 'schedules_cache.json')

# URLs для попытки
URLS = [
    "https://alerts.org.ua/cherkaska-oblast",
    "https://alerts.org.ua/uk/cherkaska-oblast",
    "https://alerts.org.ua/cherkaska",
]

# Резервный график (если парсинг не удался)
FALLBACK_SCHEDULE = {
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
}

class ScheduleParser:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'uk-UA,uk;q=0.9,en-US;q=0.8',
        })

    def fetch_page(self, url, retries=3):
        """Завантажує сторінку з повторними спробами"""
        for attempt in range(retries):
            try:
                print(f"📥 Спроба {attempt + 1}/{retries}: {url}")
                response = self.session.get(url, timeout=15, allow_redirects=True)
                response.encoding = 'utf-8'

                if response.status_code == 200:
                    print(f"✓ Завантажено ({len(response.text)} символів)")
                    return response.text
                else:
                    print(f"   ⚠️ HTTP {response.status_code}")
            except requests.Timeout:
                print(f"   ⚠️ Timeout")
            except requests.ConnectionError:
                print(f"   ⚠️ Connection error")
            except Exception as e:
                print(f"   ⚠️ {e}")

            if attempt < retries - 1:
                import time
                time.sleep(2 ** attempt)

        return None

    def parse_schedules(self, html):
        """Парсить HTML та витягає графіки"""
        if not html:
            return None

        schedules = {}
        soup = BeautifulSoup(html, 'html.parser')

        # Спроба 1: Пошук по структурованим елементам
        schedules = self._parse_structured(soup)
        if schedules:
            print(f"✓ Витягнуто {len(schedules)} черг (структурований парсинг)")
            return schedules

        # Спроба 2: Резервний текстовий парсинг
        schedules = self._parse_text_fallback(html)
        if schedules:
            print(f"✓ Витягнуто {len(schedules)} черг (текстовий парсинг)")
            return schedules

        return None

    def _parse_structured(self, soup):
        """Парсить структуровані дані"""
        schedules = {}

        # Пошук всіх div'ів та інших елементів з текстом
        for element in soup.find_all(['div', 'p', 'li', 'span', 'td']):
            text = element.get_text(strip=True)

            # Пошук номера черги (1.1, 2.2, etc)
            queue_match = re.search(r'(?:Черга|Група)?\s*([1-6]\.[1-2])', text, re.IGNORECASE)
            if queue_match:
                queue_num = queue_match.group(1)

                # Пошук часових інтервалів
                times = re.findall(r'(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})', text)

                if times and queue_num not in schedules:
                    intervals = []
                    for h1, m1, h2, m2 in times:
                        intervals.append([int(h1), int(m1), int(h2), int(m2)])

                    if intervals:
                        schedules[queue_num] = intervals

        return schedules if schedules else None

    def _parse_text_fallback(self, html):
        """Резервний парсинг через текст"""
        schedules = {}

        # Видаляємо HTML теги
        text = BeautifulSoup(html, 'html.parser').get_text('\n')
        lines = text.split('\n')

        current_queue = None

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Шукаємо номер черги
            queue_match = re.search(r'([1-6]\.[1-2])', line)
            if queue_match:
                current_queue = queue_match.group(1)
                if current_queue not in schedules:
                    schedules[current_queue] = []

            # Шукаємо часові інтервали
            times = re.findall(r'(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})', line)
            if times and current_queue:
                for h1, m1, h2, m2 in times:
                    interval = [int(h1), int(m1), int(h2), int(m2)]
                    if interval not in schedules[current_queue]:
                        schedules[current_queue].append(interval)

        return schedules if schedules else None

    def load_cache(self):
        """Завантажує існуючий кеш"""
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"⚠️ Помилка при завантаженні кешу: {e}")
        return {}

    def save_cache(self, cache):
        """Зберігає кеш"""
        try:
            with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                json.dump(cache, f, ensure_ascii=False, indent=2)
            print(f"✓ Кеш збережено: {CACHE_FILE}")
            return True
        except Exception as e:
            print(f"❌ Помилка при збереженні: {e}")
            return False

    def update_cache(self, parsed_schedules):
        """Оновляє кеш новими даними"""
        # Якщо не вдалося спарсити - використовуємо резервний
        if not parsed_schedules:
            print("⚠️ Використовую резервний графік")
            parsed_schedules = FALLBACK_SCHEDULE

        today = datetime.now()
        result = {}

        # Генеруємо дані на 10 днів (вчора, сьогодні, 8 днів вперед)
        for i in range(-1, 9):
            target_date = today + timedelta(days=i)
            date_str = target_date.strftime('%Y-%m-%d')
            result[date_str] = parsed_schedules

        return result

    def run(self):
        """Головна функція парсера"""
        print("=" * 60)
        print("SvitloControl Updater v2")
        print("=" * 60)
        print(f"⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()

        # Спробуємо завантажити з усіх URL
        html = None
        for url in URLS:
            html = self.fetch_page(url)
            if html:
                break

        if not html:
            print("❌ Не вдалося завантажити сторінку")
            print("💡 Використовую резервні дані")
            parsed_schedules = FALLBACK_SCHEDULE
        else:
            # Парсимо сторінку
            parsed_schedules = self.parse_schedules(html)

            if not parsed_schedules:
                print("⚠️ Не вдалося спарсити дані")
                print("💡 Використовую резервні дані")
                parsed_schedules = FALLBACK_SCHEDULE

        # Оновляємо кеш
        cache = self.update_cache(parsed_schedules)

        # Зберігаємо
        if self.save_cache(cache):
            print()
            print("📊 Статистика:")
            print(f"   📅 Днів у кеші: {len(cache)}")
            print(f"   🔔 Черг: {len(parsed_schedules)}")
            print(f"   🕐 Першого дня: {list(cache.keys())[0]}")
            print(f"   🕐 Останнього дня: {list(cache.keys())[-1]}")
            print()
            print("✅ Оновлення успішно завершено!")
            return True
        else:
            print("❌ Збій!")
            return False

if __name__ == "__main__":
    parser = ScheduleParser()
    success = parser.run()
    sys.exit(0 if success else 1)
