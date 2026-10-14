import json
import os
from datetime import datetime

CACHE_FILE = "schedules_cache.json"

def generate_cherkasy_schedules():
    """
    Генерирует или обновляет актуальный график отключений для Черкасской области.
    Здесь можно настроить парсинг с официального сайта или Telegram.
    """
    today = datetime.now()
    result = {}
    queues = ['1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '4.1', '4.2', '5.1', '5.2', '6.1', '6.2']

    # Шаблоны отключений для примера (в реальном времени сюда подставляются данные с сайтов/ТГ)
    patterns = {
        1: [[6, 0, 8, 0], [12, 0, 14, 0], [18, 0, 20, 0]],
        2: [[8, 0, 10, 0], [14, 0, 16, 0], [20, 0, 22, 0]],
        3: [[7, 0, 11, 0], [15, 0, 19, 0]],
        4: [[10, 0, 14, 0], [18, 0, 22, 0]],
        5: [[6, 0, 9, 0], [13, 0, 16, 0], [20, 0, 23, 0]],
        6: [[9, 0, 12, 0], [16, 0, 19, 0]]
    }

    for i in range(7):
        target_date = datetime.fromordinal(today.date().toordinal() + i)
        date_str = target_date.strftime('%Y-%m-%d')

        result[date_str] = {}
        for queue in queues:
            group_num = int(float(queue))
            result[date_str][queue] = patterns.get(group_num, [[8, 0, 12, 0], [18, 0, 21, 0]])

    return result

def main():
    print(f"[{datetime.now()}] Обновление графиков для Черкасской области...")
    new_data = generate_cherkasy_schedules()

    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(new_data, f, ensure_ascii=False, indent=2)

    print(f"✅ Файл {CACHE_FILE} успешно обновлен и готов к публикации.")

if __name__ == "__main__":
    main()
