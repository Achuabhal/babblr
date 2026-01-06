#!/bin/bash

# Start backend server using uv
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

# Change to backend directory
cd "$BACKEND_DIR" || {
    echo "[ERROR] Cannot access backend directory: $BACKEND_DIR"
    exit 1
}

# Unset VIRTUAL_ENV if it points to a different location (e.g., root .venv)
# This ensures uv uses the backend/.venv instead
if [ -n "$VIRTUAL_ENV" ]; then
    if [ "$VIRTUAL_ENV" != "$(pwd)/.venv" ] && [ "$VIRTUAL_ENV" != "$BACKEND_DIR/.venv" ]; then
        echo "[INFO] Unsetting VIRTUAL_ENV to use backend/.venv"
        unset VIRTUAL_ENV
    fi
fi

# Check if uv is available
if command -v uv &> /dev/null; then
    echo "[START] Starting Babblr backend with uv..."
    echo "   Working directory: $(pwd)"
    echo "   Virtual environment: $(pwd)/.venv"
    
    # Ensure .venv exists in backend directory
    if [ ! -d ".venv" ]; then
        echo "[WARNING] Virtual environment not found. Creating .venv in backend directory..."
        uv venv
    fi
    
    # Set PYTHONPATH to backend directory
    export PYTHONPATH="$(pwd)"
    
    # Ensure .env is loaded from backend directory
    if [ -f ".env" ]; then
        echo "   Using .env from: $(pwd)/.env"
    else
        echo "[WARNING] .env file not found in backend directory"
    fi
    
    # Development mode: enable reload by default unless explicitly disabled
    if [ -z "${BABBLR_DEV_MODE+x}" ]; then
        export BABBLR_DEV_MODE=1
    fi

    # Defaults (used by uvicorn CLI). Settings in backend/.env can override these.
    if [ -z "${BABBLR_API_HOST+x}" ] || [ -z "$BABBLR_API_HOST" ]; then
        export BABBLR_API_HOST="127.0.0.1"
    fi
    if [ -z "${BABBLR_API_PORT+x}" ] || [ -z "$BABBLR_API_PORT" ]; then
        export BABBLR_API_PORT="8000"
    fi

    # Prefer uvicorn CLI for reliable reload behavior across platforms.
    if [ "$BABBLR_DEV_MODE" = "1" ] || [ "$BABBLR_DEV_MODE" = "true" ]; then
        echo "[START] Dev mode enabled (BABBLR_DEV_MODE=$BABBLR_DEV_MODE) - starting with --reload"
        uv run uvicorn app.main:app --reload --host "$BABBLR_API_HOST" --port "$BABBLR_API_PORT"
    else
        echo "[START] Dev mode disabled (BABBLR_DEV_MODE=$BABBLR_DEV_MODE) - starting without reload"
        uv run uvicorn app.main:app --host "$BABBLR_API_HOST" --port "$BABBLR_API_PORT"
    fi
else
    echo "[WARNING] uv not found, falling back to standard Python..."
    echo "   For better performance, install uv: curl -LsSf https://astral.sh/uv/install.sh | sh"
    
    # Fallback: manually activate venv if it exists
    if [ -d ".venv" ]; then
        source .venv/bin/activate
    elif [ -d "venv" ]; then
        source venv/bin/activate
    fi
    
    export PYTHONPATH="$(pwd)"

    if [ -z "${BABBLR_DEV_MODE+x}" ]; then
        export BABBLR_DEV_MODE=1
    fi
    if [ -z "${BABBLR_API_HOST+x}" ] || [ -z "$BABBLR_API_HOST" ]; then
        export BABBLR_API_HOST="127.0.0.1"
    fi
    if [ -z "${BABBLR_API_PORT+x}" ] || [ -z "$BABBLR_API_PORT" ]; then
        export BABBLR_API_PORT="8000"
    fi

    if [ "$BABBLR_DEV_MODE" = "1" ] || [ "$BABBLR_DEV_MODE" = "true" ]; then
        python -m uvicorn app.main:app --reload --host "$BABBLR_API_HOST" --port "$BABBLR_API_PORT"
    else
        python -m uvicorn app.main:app --host "$BABBLR_API_HOST" --port "$BABBLR_API_PORT"
    fi
fi
