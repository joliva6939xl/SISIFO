@echo off
echo [1/3] Instalando Backend...
cd api
call npm install
cd ..

echo [2/3] Instalando Frontend...
cd Client
call npm install
cd ..

echo [3/3] Iniciando el Sistema...
start "Backend" cmd /k "cd api && node index.js"
start "Frontend" cmd /k "cd Client && npm run dev"

echo ¡SISTEMA ARRANCO!
pause