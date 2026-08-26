@echo off
chcp 1251 >nul
cd /d "%~dp0"

:: Твой токен и URL
set SOURCECRAFT_URL=https://pv1_Mp16mfs94624gQn64LKF3N2s6960ZT386m567sZ33xv9LaMH9r6Ku7q0w68R436K_2178383809@git.sourcecraft.dev/fraderfrer/cargoplanner.git
set GITHUB_URL=https://github.com/managertlkgroup-hub/CargoPlanner.git

echo [Инфо] Работаем в: %cd%

:: Удаляем старый remote, если есть, и добавляем новый с токеном
git remote remove sourcecraft 2>nul
git remote add sourcecraft %SOURCECRAFT_URL%

:: Проверяем/добавляем github
git remote get-url github >nul 2>&1 || git remote add github %GITHUB_URL%
git remote set-url github %GITHUB_URL%

echo [1/4] Запрашиваем изменения из SourceCraft...
git fetch sourcecraft --prune

:: Считаем новые коммиты
git rev-list HEAD..sourcecraft/main --count > temp.txt
set /p NEW_COMMITS= < temp.txt
del temp.txt

if %NEW_COMMITS%==0 (
    echo [Инфо] В SourceCraft нет новых коммитов в ветке main.
    echo [Инфо] Проверь, в какой ветке лежат изменения в SourceCraft.
    echo [Инфо] Если это не main, укажи ветку вручную.
    pause
    exit /b 0
)

echo [Инфо] Найдено %NEW_COMMITS% новых коммитов в SourceCraft/main.

echo [2/4] Забираем изменения...
git pull sourcecraft main --allow-unrelated-histories --no-edit

echo [3/4] Отправляем в GitHub (main)...
git push github main --force

echo [4/4] Готово.
pause