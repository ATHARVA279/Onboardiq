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
cd Backend || exit

# Ensure Python 3.12 exists
if ! command -v python3.12 &> /dev/null
then
    echo -e "${RED}Python 3.12 not found. Please install it first.${NC}"
    exit 1
fi

# Create virtual environment if not exists
if [ ! -d "venv" ]; then
    echo -e "${CYAN}[Backend]${NC} Creating virtual environment (Python 3.12)..."
    python3.12 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Verify Python version
PY_VERSION=$(python --version)
echo -e "${CYAN}[Backend]${NC} Using $PY_VERSION"

if [[ $PY_VERSION != *"3.12"* ]]; then
    echo -e "${RED}Error: Virtual environment is not using Python 3.12${NC}"
    exit 1
fi

# Always install/update dependencies (IMPORTANT FIX)
echo -e "${CYAN}[Backend]${NC} Installing/updating dependencies..."
pip install --upgrade pip
pip install -r requirements.txt --upgrade

# Start FastAPI server
echo -e "${CYAN}[Backend]${NC} Starting FastAPI server..."
export PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION=python
export GRPC_DNS_RESOLVER=native
python -m uvicorn app:app \
  --reload \
  --reload-exclude venv \
  --reload-exclude node_modules \
  --port 8000 &
BACKEND_PID=$!

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