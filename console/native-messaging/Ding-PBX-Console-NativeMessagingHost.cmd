@echo off
setlocal
set "HOST_DIR=%~dp0"
node "%HOST_DIR%ding-pbx-download-host.cjs"
exit /b %ERRORLEVEL%
