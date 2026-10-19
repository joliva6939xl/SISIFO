@echo off
title Instalando e Iniciando Sistema SISIFO
color 0A

:VERIFICAR_NODE
echo ===================================================
echo   SISTEMA SISIFO - VERIFICACION DE REQUISITOS
echo ===================================================
echo.

echo [1/2] Verificando Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [!] Node.js NO esta instalado.
    echo.
    echo Por favor, descargue e instale Node.js (version LTS):
    echo https://nodejs.org/
    echo.
    echo IMPORTANTE: Despues de instalarlo, REINICIE esta ventana
    echo presionando cualquier tecla para volver a verificar.
    echo.
    pause
    cls
    goto VERIFICAR_NODE
)
echo [OK] Node.js detectado.
echo.

:VERIFICAR_POSTGRES
echo [2/2] Verificando PostgreSQL...
where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [!] PostgreSQL NO esta instalado.
    echo.
    echo Por favor, descargue e instale PostgreSQL:
    echo https://www.postgresql.org/download/windows/
    echo.
    echo IMPORTANTE: Durante la instalacion, cuando pida
    echo CONTRASENA para el usuario "postgres", escriba: 1
    echo.
    echo Despues de instalarlo, presione cualquier tecla
    echo para volver a verificar.
    echo.
    pause
    cls
    goto VERIFICAR_POSTGRES
)
echo [OK] PostgreSQL detectado.
echo.

echo ===================================================
echo   REQUISITOS CUMPLIDOS - CONTINUANDO INSTALACION
echo ===================================================
echo.

REM 3. Crear Base de Datos (si no existe)
echo [1/4] Verificando base de datos db_sistema_monitoreo...
set PGPASSWORD=1
psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname='db_sistema_monitoreo'" >nul 2>&1
if %errorlevel% neq 0 (
    echo Creando base de datos db_sistema_monitoreo...
    createdb -U postgres db_sistema_monitoreo
    echo [OK] Base de datos creada.
) else (
    echo [OK] La base de datos ya existe.
)
echo.

REM 4. Crear tablas y usuario CALL CENTER
echo [2/4] Configurando tablas y usuario inicial...
psql -U postgres -d db_sistema_monitoreo -f api/database_setup.sql
echo [OK] Tablas y usuario CALL CENTER configurados.
echo.

REM 5. Instalar dependencias
echo [3/4] Instalando dependencias del Backend...
cd api
call npm install
cd ..

echo Instalando dependencias del Frontend...
cd Client
call npm install
cd ..
echo.

REM 6. Iniciar servidores
echo [4/4] Iniciando servidores...
start "SISIFO - BACKEND" cmd /k "cd api && echo Backend corriendo en puerto 3000... && node index.js"
start "SISIFO - FRONTEND" cmd /k "cd Client && echo Frontend corriendo en puerto 5173... && npm run dev"

echo.
echo Esperando 10 segundos para que todo arranque...
timeout /t 10 /nobreak >nul

echo ¡SISTEMA SISIFO LISTO!
echo Abriendo navegador...
start http://localhost:5173

echo.
echo ===================================================
echo   NO CIERRE LAS VENTANAS NEGRAS
echo   El sistema funciona mientras esten abiertas
echo ===================================================
echo.
pause