@echo off
REM Start backend server using uv (Windows)

REM Get script directory
set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%backend"

REM Change to backend directory
cd /d "%BACKEND_DIR%"
if %errorlevel% neq 0 (
    echo [ERROR] Cannot access backend directory: %BACKEND_DIR%
    pause
    exit /b 1
)

REM Unset VIRTUAL_ENV if it points to a different location (e.g., root .venv)
REM This ensures uv uses the backend\.venv instead
if defined VIRTUAL_ENV (
    set "CURRENT_VENV=%CD%\.venv"
    if not "%VIRTUAL_ENV%"=="%CURRENT_VENV%" (
        echo [INFO] Unsetting VIRTUAL_ENV to use backend\.venv
        set "VIRTUAL_ENV="
    )
)

REM Check if uv is available
where uv >nul 2>&1
if %errorlevel% equ 0 (
    echo [START] Starting Babblr backend with uv...
    echo    Working directory: %CD%
    echo    Virtual environment: %CD%\.venv
    
    REM Ensure .venv exists in backend directory
    if not exist ".venv" (
        echo [WARNING] Virtual environment not found. Creating .venv in backend directory...
        uv venv
        if %errorlevel% neq 0 (
            echo [ERROR] Failed to create virtual environment
            pause
            exit /b 1
        )
    )
    
    REM Set PYTHONPATH to backend directory
    set "PYTHONPATH=%CD%"
    
    REM Ensure .env is loaded from backend directory
    if exist ".env" (
        echo    Using .env from: %CD%\.env
    ) else (
        echo [WARNING] .env file not found in backend directory
    )

    REM Defaults (used by uvicorn CLI). Settings in backend/.env can override these.
    if not defined BABBLR_API_HOST (
        set "BABBLR_API_HOST=127.0.0.1"
    )
    if not defined BABBLR_API_PORT (
        set "BABBLR_API_PORT=8000"
    )
    
    REM Development mode: enable reload by default unless explicitly disabled
    if not defined BABBLR_DEV_MODE (
        set "BABBLR_DEV_MODE=1"
    )

    REM Prefer uvicorn CLI for reliable reload behavior on Windows
    if /I "%BABBLR_DEV_MODE%"=="1" (
        echo [START] Dev mode enabled (BABBLR_DEV_MODE=1) - starting with --reload
        uv run uvicorn app.main:app --reload --host %BABBLR_API_HOST% --port %BABBLR_API_PORT%
    ) else (
        echo [START] Dev mode disabled (BABBLR_DEV_MODE=%BABBLR_DEV_MODE%) - starting without reload
        uv run uvicorn app.main:app --host %BABBLR_API_HOST% --port %BABBLR_API_PORT%
    )
) else (
    echo [WARNING] uv not found, falling back to standard Python...
    echo    For better performance, install uv: powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
    
    REM Fallback: manually activate venv if it exists
    if exist ".venv\Scripts\activate.bat" (
        call .venv\Scripts\activate.bat
    ) else if exist "venv\Scripts\activate.bat" (
        call venv\Scripts\activate.bat
    )
    
    set "PYTHONPATH=%CD%"
    if not defined BABBLR_DEV_MODE (
        set "BABBLR_DEV_MODE=1"
    )
    if not defined BABBLR_API_HOST (
        set "BABBLR_API_HOST=127.0.0.1"
    )
    if not defined BABBLR_API_PORT (
        set "BABBLR_API_PORT=8000"
    )

    if /I "%BABBLR_DEV_MODE%"=="1" (
        python -m uvicorn app.main:app --reload --host %BABBLR_API_HOST% --port %BABBLR_API_PORT%
    ) else (
        python -m uvicorn app.main:app --host %BABBLR_API_HOST% --port %BABBLR_API_PORT%
    )
)

pause

