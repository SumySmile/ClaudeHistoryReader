@echo off
title Claude Code History Viewer
cd /d "%~dp0"
start http://localhost:5173
npm run dev
