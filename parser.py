import asyncio
import aiohttp
import json
import os
from datetime import datetime

# Скрипт автоматического опроса и парсинга данных для Черкасской области
# Может работать как автономный фоновый процесс

API_TARGET_URL = "https://www.cherkasyoblenergo.com.ua/"
CACHE_FILE = r"C:\Users\rprrm\OneDrive\Рабочий стол\SvitloControl\schedules_cache.json"

async def fetch_oblenergo_updates():
    print(f"[{datetime.now()}] Проверка обновлений Черкассыоблэнерго...")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(API_TARGET_URL, headers=headers, timeout=20) as response:
                if response.status == 200:
                    html = await response.text()
                    print(f"[{datetime.now()}] Сайт ответил успешно. Длина страницы: {len(html)} байт")
                    # Здесь можно добавить логику парсинга HTML, если на сайте появились новые графики
                else:
                    print(f"[{datetime.now()}] Сайт вернул статус: {response.status}")
    except Exception as e:
        print(f"[{datetime.now()}] Ошибка при запросе к сайту: {e}")

if __name__ == "__main__":
    print("Запуск фонового парсера/обновлятора для SvitloControl...")
    asyncio.run(fetch_oblenergo_updates())
