@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>&1
if %errorlevel%==0 (
  start "IRON WRECK SERVER" /min py -3 -m http.server 8765 --bind 127.0.0.1
  timeout /t 2 /nobreak >nul
  start "" "http://127.0.0.1:8765/index.html"
  exit /b
)
where python >nul 2>&1
if %errorlevel%==0 (
  start "IRON WRECK SERVER" /min python -m http.server 8765 --bind 127.0.0.1
  timeout /t 2 /nobreak >nul
  start "" "http://127.0.0.1:8765/index.html"
  exit /b
)
echo Python nao encontrado. Abrindo jogo em modo de carroceria procedural.
echo Para usar os novos modelos GLB no Windows, instale Python 3 e abra este arquivo novamente.
start "" "%~dp0index.html"
pause
