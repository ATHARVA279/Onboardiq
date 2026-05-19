#!/bin/bash

# ==============================
# Colors
# ==============================
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Starting Onboardiq Application...${NC}"

# ==============================
# Cleanup Function
# ==============================
cleanup() {
    echo -e "\n${RED}Shutting down servers...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# ==========================================
# 1. Backend (Python 3.12 - FastAPI)
# ==========================================
echo -e "${CYAN}[Backend]${NC} Initializing..."

# Resolve Python 3.12 path
PYTHON_BIN=$(which python3.12)
if [ -z "$PYTHON_BIN" ]; then
    echo -e "${RED}Python 3.12 not found. Please install it first.${NC}"
    exit 1
fi

BACKEND_DIR="$(pwd)/Backend"
BACKEND_VENV="$BACKEND_DIR/venv"
VENV_PYTHON="$BACKEND_VENV/bin/python"
VENV_PIP="$BACKEND_VENV/bin/pip"

# Create virtual environment if not exists
if [ ! -d "$BACKEND_VENV" ]; then
    echo -e "${CYAN}[Backend]${NC} Creating virtual environment (Python 3.12)..."
    $PYTHON_BIN -m venv "$BACKEND_VENV"
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to create virtual environment${NC}"
        exit 1
    fi
fi

# Verify venv Python exists
if [ ! -f "$VENV_PYTHON" ]; then
    echo -e "${RED}Error: Virtual environment Python not found at $VENV_PYTHON${NC}"
    exit 1
fi

# Verify Python version using venv python
PY_VERSION=$($VENV_PYTHON --version 2>&1)
echo -e "${CYAN}[Backend]${NC} Using $PY_VERSION"

if [[ $PY_VERSION != *"3.12"* ]]; then
    echo -e "${RED}Error: Virtual environment is not using Python 3.12. Got: $PY_VERSION${NC}"
    exit 1
fi

# Install dependencies (only if needed, no upgrade unless -u flag)
echo -e "${CYAN}[Backend]${NC} Checking dependencies..."
cd "$BACKEND_DIR"
$VENV_PIP install -r requirements.txt
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install dependencies${NC}"
    exit 1
fi

# Check if .env exists, warn if not
if [ ! -f ".env" ]; then
    echo -e "${RED}⚠️  .env file not found in Backend directory${NC}"
    echo -e "${RED}Please create Backend/.env with required environment variables${NC}"
    exit 1
fi

# Start FastAPI server
echo -e "${CYAN}[Backend]${NC} Starting FastAPI server on port 8000..."
export PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION=python
export GRPC_DNS_RESOLVER=native
export WATCHFILES_IGNORE_PERMISSION_DENIED=true
$VENV_PYTHON -m uvicorn app:app \
    --reload \
    --reload-dir Routes \
    --reload-dir Services \
    --reload-dir models \
    --reload-dir Middleware \
    --reload-dir Database \
    --reload-exclude "venv/*" \
    --reload-exclude "__pycache__/*" \
    --reload-exclude "*.pyc" \
    --port 8000 &
BACKEND_PID=$!
echo -e "${GREEN}[Backend]${NC} Started with PID $BACKEND_PID"

# Give server time to start
sleep 2

cd ..

# ==========================================
# 2. Frontend (Vite)
# ==========================================
echo -e "${MAGENTA}[Frontend]${NC} Initializing..."
cd Frontend || exit

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${MAGENTA}[Frontend]${NC} Installing dependencies..."
    npm install
fi

# Prevent browser auto-opening
echo -e "${MAGENTA}[Frontend]${NC} Starting Vite dev server..."
BROWSER=none npm run dev &
FRONTEND_PID=$!

cd ..

# ==========================================
# Running Info
# ==========================================
echo -e "\n${GREEN}Both backend and frontend are running!${NC}"
echo -e "Backend: http://localhost:8000"
echo -e "Frontend: http://localhost:5173"
echo -e "Press ${RED}Ctrl+C${NC} to stop both servers.\n"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID