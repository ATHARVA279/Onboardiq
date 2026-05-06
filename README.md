# ✨ Onboardiq
## 🚀 Quick Start

### Prerequisites
- Python 3.9+ ([Download](https://www.python.org/downloads/))
- Node.js 16+ ([Download](https://nodejs.org/))
- **Gemini API Key** ([Get Free Key](https://ai.google.dev/))
- **MongoDB** (local or Atlas)
- **Firebase Project** (for authentication)

### Backend Setup (Windows)

```cmd
cd Backend

REM Create virtual environment
python -m venv venv

REM Activate virtual environment
venv\Scripts\activate

REM Install dependencies
pip install -r requirements.txt

REM Configure environment variables
copy .env.example .env
REM Edit .env and add:
REM - GEMINI_API_KEY
REM - MONGODB_URI
REM - Firebase credentials

REM Start server
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

### Backend Setup (macOS/Linux)

```bash
cd Backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and add:
# - GEMINI_API_KEY
# - MONGODB_URI
# - Firebase credentials

# Start server
uvicorn app:app --reload --host 127.0.0.1 --port 8000
```

Backend will be available at: `http://127.0.0.1:8000`

### Frontend Setup

```bash
cd Frontend

# Install dependencies
npm install

# Configure Firebase
# Edit src/api/firebaseConfig.js with your Firebase config

# Start dev server
npm run dev
```

Frontend will be available at: `http://localhost:5173` or `http://localhost:3000`