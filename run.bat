@echo off
chcp 1251 >nul
cd /d "%~dp0"

echo [Инфо] Проверка проекта CargoPlanner...
echo [Инфо] Текущая папка: %cd%

:: Проверяем, есть ли node_modules
if not exist "node_modules" (
    echo [Инфо] node_modules не найдены. Устанавливаю зависимости...
    call npm install
    if errorlevel 1 (
        echo [Ошибка] npm install не удался.
        pause
        exit /b 1
    )
) else (
    :: Проверяем, установлен ли xlsx (быстрый способ — проверить наличие папки)
    if not exist "node_modules\xlsx" (
        echo [Инфо] Пакет xlsx не найден. Устанавливаю...
        call npm install xlsx
        if errorlevel 1 (
            echo [Ошибка] Не удалось установить xlsx.
            pause
            exit /b 1
        )
    ) else (
        echo [Инфо] Все зависимости установлены.
    )
)

:: Запускаем проект
echo [Инфо] Запускаю dev-сервер...
start http://localhost:5173
npm run dev

pause