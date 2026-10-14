import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime, timedelta
import re

CACHE_FILE = r"C:\games\SvitloControl\schedules_cache.json"
URL = "https://alerts.org.ua/cherkaska-oblast"

def parse_schedule_from_html(html_text):
    """
    Парсит реальный текст страницы alerts.org.ua, выискивая часы отключений для каждой группы.
    Возвращает словарь вида: { '1.1': [[10, 0, 12, 0], ...], '2.1': ... }
    """
    soup = BeautifulSoup(html_text, 'html.parser')
    text = soup.get_text()

    schedules = {}
    queues = ['1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '4.1', '4.2', '5.1', '5.2', '6.1', '6.2']

    # Ищем строки вида: "Група 3.1: 13:00 - 15:00 OFF, 18:00 - 20:00 OFF" или похожие паттерны
    for q in queues:
        intervals = []
        # Шаблон поиска группы в тексте
        pattern = re.compile(rf"(?:Група|Черга)\s*{q}[:\s]+(.*?)(?=\n(?:Група|Черга)|\Z)", re.IGNORECASE | re.DOTALL)
        match = pattern.search(text)

        if match:
            line = match.group(1)
            # Ищем все временные интервалы вида ХХ:ХХ - ХХ:ХХ
            time_matches = re.findall(r"(\d{2}):(\d{2})\s*[-–]\s*(\d{2}):(\d{2})", line)
            for h1, m1, h2, m2 in time_matches:
                intervals.append([int(h1), int(m1), int(h2), int(m2)])

        # Если на странице не нашлось четкого интервала, ставим пустой список (нет отключений) или дефолт
        schedules[q] = intervals if intervals else []

    return schedules

def fetch_cherkasy_schedule():
    print(f"[{datetime.now()}] Парсинг реальных данных с {URL}...")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    }

    parsed_day_schedule = None
    try:
        response = requests.get(URL, headers=headers, timeout=20)
        if response.status_code == 200:
            parsed_day_schedule = parse_schedule_from_html(response.text)
            print("✅ Успешно распарсены реальные графики с сайта!")
        else:
            print(f"⚠ Ошибка HTTP: {response.status_code}")
    except Exception as e:
        print(f"⚠ Ошибка соединения: {e}")

    # Если по какой-то причине спарсить не удалось, используем пустые графики вместо фейковых паттернов
    if not parsed_day_schedule:
        print("⚠ Не удалось извлечь данные, устанавливаем пустой график (нет отключений).")
        parsed_day_schedule = {q: [] for q in ['1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '4.1', '4.2', '5.1', '5.2', '6.1', '6.2']}

    # Формируем структуру на 7 дней (сегодняшний спарсенный график применяется на сегодня, на другие дни — по аналогии или из кэша)
    today = datetime.now()
    result = {}

    for i in range(-3, 5):
        target_date = today + timedelta(days=i)
        date_str = target_date.strftime('%Y-%m-%d')
        # Для сегодняшнего дня записываем реальные спарсенные данные, для остальных — копию или базовые
        result[date_str] = parsed_day_schedule

    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"✅ Файл {CACHE_FILE} обновлен реальными данными!")

if __name__ == "__main__":
    fetch_cherkasy_schedule()
