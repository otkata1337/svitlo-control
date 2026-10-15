<#
  setup-task-scheduler.ps1 — Налаштування Task Scheduler для SvitloControl
  Створює завдання для запуску update.bat кожні 2-4 години та при старті системи.
#>

# Вимоги: скрипт запускається адміністратором

$batPath = "C:\Users\rprrm\Desktop\SvitloControl\update.bat"
$taskName = "SvitloControl-Update"

# Перевірка, чи скрипт запущено з адміністраторскими правами
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)) {
    Write-Error "Цей скрипт потрібен запуск від імені адміністратора!"
    exit 1
}

# Функція створення завдання
function Create-SvitloTask {
    param(
        [string]$Action = "Every 2 hours",
        [string]$Description = "Оновлення графіків відключень світла SvitloControl"
    )

    # Видаляємо існуюче завдання, якщо воно уже створено
    schtasks /Delete /TN $taskName /F 2>$null

    # Створюємо нове завдання
    $action = "schtasks /Create /TN `"$taskName`" /TR `"$batPath`" /SC ONLOGON /RL HIGHEST"

    # Додатково: плановий запуск кожні 2 години
    schtasks /Create /TN $"$taskName`" /TR $"$batPath`" /SC MINUTE /MO 120 /RL HIGHEST /F 2>$null

    # Завдання при кожному старті Windows
    schtasks /Create /TN $"$taskName`" /TR $"$batPath`" /SC ONLOGON /RL HIGHEST /F 2>$null

    Write-Host "✓ Завдання Task Scheduler створено: $taskName"
    Write-Host "   Батник: $batPath"
    Write-Host "   Часовий інтервал: кожні 2 години"
    Write-Host "   Запуск при вході у систему: так"
}

Write-Host "=== Налаштування Task Scheduler для SvitloControl ==="
Write-Host ""

# Створення завдання
Create-SvitloTask

Write-Host ""
Write-Host "Інструкції вручну (якщо скрипт не спрацював):"
Write-Host "1. Відкрийте Панель керування → Завдання → Створити завдання"
Write-Host "2. У розділі 'Дії' натисніть 'Створити...'"
Write-Host "3. У полі 'Дія' вставте: $batPath"
Write-Host "4. У розділі ' Тригери ' додайте:"
Write-Host "   - Тригер: При вході у систему"
Write-Host "   - Тригер: Кожні 2 години"
Write-Host "5. Запустіть завдання вручну: schtasks /RUN /TN SvitloControl-Update"