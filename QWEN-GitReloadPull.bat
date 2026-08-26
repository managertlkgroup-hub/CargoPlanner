@echo off
chcp 1251 >nul
cd /d "%~dp0"

echo [Инфо] Обновление проекта из GitHub...
echo [Инфо] Текущая папка: %cd%

:: Проверяем, есть ли Git
git --version >nul 2>&1
if errorlevel 1 (
    echo [Ошибка] Git не установлен или не найден в PATH.
    pause
    exit /b 1
)

:: Проверяем, есть ли удалённый репозиторий
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo [Ошибка] Не найден удалённый репозиторий origin.
    echo [Инфо] Добавляю origin...
    git remote add origin https://github.com/managertlkgroup-hub/CargoPlanner.git
)

:: Забираем изменения без слияния (просто обновляем локальные файлы)
echo [1/2] Получаем изменения из GitHub...
git fetch origin main

:: Проверяем, есть ли новые коммиты
git rev-list HEAD..origin/main --count > temp.txt
set /p NEW_COMMITS= < temp.txt
del temp.txt

if %NEW_COMMITS%==0 (
    echo [Инфо] Нет новых изменений. Вы уже обновлены.
    pause
    exit /b 0
)

echo [Инфо] Найдено %NEW_COMMITS% новых коммитов.

:: Жёстко обновляем локальные файлы (заменяем всё на версию из GitHub)
echo [2/2] Обновляем локальные файлы...
git reset --hard origin/main

if errorlevel 1 (
    echo [Ошибка] Не удалось обновить файлы.
) else (
    echo [Успех] Проект обновлён до последней версии из GitHub.
)

pause