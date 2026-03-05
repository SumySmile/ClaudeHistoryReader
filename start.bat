@echo off
cd /d "%~dp0"
start "Claude History Viewer Dev Server" cmd /k "cd /d \"%~dp0\" && npm run dev"
start "" http://localhost:5173
exit
