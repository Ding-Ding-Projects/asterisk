@echo off
setlocal EnableExtensions
set "SCRIPT_ROOT=%~dp0"
set "SILENT_MODE=0"
if /I "%~1"=="/s" set "SILENT_MODE=1"
if /I "%~1"=="--silent" set "SILENT_MODE=1"
if "%SILENT%"=="1" set "SILENT_MODE=1"

call "%SCRIPT_ROOT%download-dependencies.bat" /s
set "BOOTSTRAP_RESULT=%ERRORLEVEL%"
if not "%BOOTSTRAP_RESULT%"=="0" exit /b %BOOTSTRAP_RESULT%

set "BUILD_SILENT="
if "%SILENT_MODE%"=="1" set "BUILD_SILENT=-Silent"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_ROOT%console\scripts\build-iso.ps1" %BUILD_SILENT%
exit /b %ERRORLEVEL%
