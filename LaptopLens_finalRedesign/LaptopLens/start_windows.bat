@echo off
cd /d "%~dp0"
if not exist .venv\Scripts\python.exe py -3.11 -m venv .venv
if not exist .venv\Scripts\python.exe (
 echo Install Python 3.11 or newer and create a virtual environment manually. See README.md.
 pause
 exit /b 1
)
.venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 exit /b 1
.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000
