@echo off
rem Creates a disposable WSL instance running the Asterisk built from this checkout.
rem
rem   build-wsl-throwaway.bat                      create one and report how to reach it
rem   build-wsl-throwaway.bat /s                   same, without progress output
rem   build-wsl-throwaway.bat /remove              remove every instance this script made
rem   build-wsl-throwaway.bat /remove /name NAME   remove one by name
rem   build-wsl-throwaway.bat /force               rebuild the root filesystem first
rem
rem No elevation and no prompts. The virtual disk lives under the user's own local
rem application data, and every instance is named so that removal can never reach a
rem distribution somebody else made - or the console's own.
setlocal EnableExtensions EnableDelayedExpansion
set "SCRIPT_ROOT=%~dp0"
set "PS_ARGS="
set "NEEDS_BOOTSTRAP=1"

:parse
if "%~1"=="" goto run
if /I "%~1"=="/s" (
  set "PS_ARGS=!PS_ARGS! -Silent"
  shift
  goto parse
)
if /I "%~1"=="--silent" (
  set "PS_ARGS=!PS_ARGS! -Silent"
  shift
  goto parse
)
if /I "%~1"=="/remove" (
  set "PS_ARGS=!PS_ARGS! -Remove"
  set "NEEDS_BOOTSTRAP=0"
  shift
  goto parse
)
if /I "%~1"=="--remove" (
  set "PS_ARGS=!PS_ARGS! -Remove"
  set "NEEDS_BOOTSTRAP=0"
  shift
  goto parse
)
if /I "%~1"=="/force" (
  set "PS_ARGS=!PS_ARGS! -Force"
  shift
  goto parse
)
if /I "%~1"=="--force" (
  set "PS_ARGS=!PS_ARGS! -Force"
  shift
  goto parse
)
if /I "%~1"=="/name" (
  if "%~2"=="" (
    echo [throwaway] /name needs an instance name.
    exit /b 2
  )
  set "PS_ARGS=!PS_ARGS! -Name %~2"
  shift
  shift
  goto parse
)
echo [throwaway] Unrecognised option: %~1
exit /b 2

:run
if "%SILENT%"=="1" set "PS_ARGS=!PS_ARGS! -Silent"
if "%NEEDS_BOOTSTRAP%"=="1" (
  call "%SCRIPT_ROOT%download-dependencies.bat" /s
  set "BOOTSTRAP_RESULT=!ERRORLEVEL!"
  if not "!BOOTSTRAP_RESULT!"=="0" exit /b !BOOTSTRAP_RESULT!
)
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_ROOT%console\scripts\build-wsl-throwaway.ps1"!PS_ARGS!
exit /b %ERRORLEVEL%
