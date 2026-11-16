@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Grand Resort Tycoon
cd /d "%~dp0"

rem Uso: JOGAR.bat               prepara o jogo e abre o navegador
rem      JOGAR.bat --sem-abrir   só inicia o servidor (para testes)
set "PORT=4173"
set "URL=http://localhost:%PORT%/"
set "SCRIPT=play"
if /i "%~1"=="--sem-abrir" set "SCRIPT=preview"

echo.
echo   ==============================================
echo     GRAND RESORT TYCOON
echo   ==============================================
echo.

rem Se o servidor do jogo já está rodando (outra janela), só abre o navegador
curl.exe -s -f -o nul --max-time 2 "%URL%" >nul 2>&1
if not errorlevel 1 goto :ja_aberto

rem Bun: no PATH ou na pasta padrão de instalação
set "BUN="
for /f "delims=" %%B in ('where bun 2^>nul') do if not defined BUN set "BUN=%%B"
if not defined BUN if exist "%USERPROFILE%\.bun\bin\bun.exe" set "BUN=%USERPROFILE%\.bun\bin\bun.exe"
if not defined BUN goto :sem_bun

if not exist "node_modules\" (
  echo   Primeira vez: instalando as dependências, aguarde...
  call "%BUN%" install
  if errorlevel 1 goto :falhou
)

echo   Preparando o jogo...
call "%BUN%" --bun run build >build.log 2>&1
if errorlevel 1 (
  type build.log
  goto :falhou
)

echo.
echo   Jogo atual ......... %URL%
echo   Jogo novo (2.0) .... %URL%game.html
echo   Protótipo .......... %URL%prototype.html
echo.
echo   Deixe esta janela aberta enquanto joga. Para encerrar, feche-a.
echo.
call "%BUN%" --bun run %SCRIPT%
exit /b %errorlevel%

:ja_aberto
echo   O jogo já está aberto em outra janela.
if /i not "%SCRIPT%"=="preview" start "" "%URL%"
exit /b 0

:sem_bun
echo   O Bun não foi encontrado neste computador. Para instalar, rode no PowerShell:
echo       powershell -c "irm bun.sh/install.ps1 | iex"
echo.
echo   Enquanto isso, o jogo atual abre direto do arquivo.
if /i not "%SCRIPT%"=="preview" start "" "%~dp0index.html"
pause
exit /b 1

:falhou
echo.
echo   Não foi possível preparar o jogo. O jogo atual abre direto do arquivo:
echo       %~dp0index.html
pause
exit /b 1
