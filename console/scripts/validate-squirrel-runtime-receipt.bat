@echo off
setlocal EnableExtensions
set "SCRIPT_ROOT=%~dp0"
if "%~1"=="" (
  echo Usage: validate-squirrel-runtime-receipt.bat ^<runtime-receipt.json^>
  echo Validates an observed post-install receipt from the cheap Lowlevel headless run.
  exit /b 2
)
node "%SCRIPT_ROOT%validate-squirrel-runtime-receipt.mjs" --input "%~1"
exit /b %ERRORLEVEL%
