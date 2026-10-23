@echo off
echo ========================================================
echo   MeetFlow AI — Meeting-to-Execution Automation Agent
echo   HACKNOVA'26 Final Round Project
echo ========================================================
echo.

echo Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "MeetFlow AI - Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 2 >nul

echo Starting Vite React Frontend on http://localhost:5173 ...
start "MeetFlow AI - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 3 >nul

echo Opening MeetFlow AI in your default web browser...
start http://localhost:5173/

echo.
echo ========================================================
echo MeetFlow AI is running!
echo Frontend: http://localhost:5173
echo Backend API Docs: http://127.0.0.1:8000/docs
echo ========================================================
pause
