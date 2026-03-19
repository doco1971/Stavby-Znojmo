@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul 2>&1
title Stavby Znojmo — Instalace otevírače složek

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║     STAVBY ZNOJMO — Instalace otevírače složek     ║
echo  ║     Umožní otevírat složky zakázek kliknutím 💡    ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

REM ── Kontrola správce ──────────────────────────────────────
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo  [CHYBA] Spustte tento soubor jako SPRAVCE!
    echo.
    echo  Postup: Pravý klik na install.bat → Spustit jako správce
    echo.
    pause
    exit /b 1
)

REM ── Cílová složka ─────────────────────────────────────────
set "TARGET=C:\Stavby"
set "PS1=%TARGET%\stavby_handler.ps1"

echo  Instaluji do: %TARGET%
echo.

REM ── Vytvorit složku ───────────────────────────────────────
if not exist "%TARGET%" mkdir "%TARGET%"

REM ── Zapsat PowerShell handler přímo (nevyžaduje ZIP) ──────
echo  [1/2] Zapisuji handler...

(
echo # stavby_handler.ps1 — Handler pro protokol stavby://
echo # Generovano automaticky install.bat
echo param^([string]$url^)
echo if ^(-not $url^) { $url = $args[0] }
echo try {
echo     $url = $url -replace '^stavby:/+open\?path=', ''
echo     Add-Type -AssemblyName System.Web
echo     $path = [System.Web.HttpUtility]::UrlDecode^($url^)
echo     $path = $path -replace '/', '\'
echo     if ^($path -ne ''̈́^) { Start-Process "explorer.exe" -ArgumentList "`"$path`"" }
echo } catch { exit 1 }
) > "%PS1%"

REM ── Zapsat do registru ────────────────────────────────────
echo  [2/2] Registruji protokol stavby:// ...

set "PS1_ESC=%PS1:\=\\%"

(
echo Windows Registry Editor Version 5.00
echo.
echo [HKEY_LOCAL_MACHINE\SOFTWARE\Classes\stavby]
echo @="Stavby Opener"
echo "URL Protocol"=""
echo.
echo [HKEY_LOCAL_MACHINE\SOFTWARE\Classes\stavby\shell]
echo.
echo [HKEY_LOCAL_MACHINE\SOFTWARE\Classes\stavby\shell\open]
echo.
echo [HKEY_LOCAL_MACHINE\SOFTWARE\Classes\stavby\shell\open\command]
echo @="powershell.exe -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File \"%PS1_ESC%\" \"%%1\""
) > "%TEMP%\stavby_protokol.reg"

regedit /s "%TEMP%\stavby_protokol.reg"
if %errorlevel% neq 0 (
    echo  [CHYBA] Registrace selhala — zkuste znovu jako správce.
    pause
    exit /b 1
)

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║   ✅  Instalace dokončena! (~10 sekund)             ║
echo  ║                                                      ║
echo  ║   Klikněte na 💡 u jakékoli stavby se zadanou      ║
echo  ║   cestou — Průzkumník Windows se otevře přímo.     ║
echo  ║                                                      ║
echo  ║   Tento soubor můžete smazat.                       ║
echo  ╚══════════════════════════════════════════════════════╝
echo.
pause
