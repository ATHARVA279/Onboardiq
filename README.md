# ✨ Onboardiq

An AI-powered learning platform that demonstrates **RAG (Retrieval-Augmented Generation)**, modern full-stack development, and production-ready features. Extract content from any URL, generate AI study materials, take interactive quizzes, and chat with an intelligent assistant.

**Perfect for portfolios and technical interviews** - showcases practical AI/ML skills, authentication, database design, and scalable architecture.

## 🌐 Live Demo

- **Frontend:** https://project-onboardiq.vercel.app/
- **Backend API:** https://onboardiq-backend.onrender.com/

---

## 🎯 Core Features

### 1️⃣ **Smart Content Extraction & Library Management**
- Scrape and clean text from any URL using BeautifulSoup
- Automatic text preprocessing and intelligent chunking
- BM25 indexing for semantic search
- Document library with favorites and archiving
- Background job processing for long-running extractions

### 2️⃣ **AI Study Notes Generator**
- Comprehensive study materials: summaries, key points, definitions
- AI-generated flashcards for memorization
- Mind map structure generation
- Topic-based retrieval from indexed content
- Caching system to avoid regenerating notes

### 3️⃣ **RAG-Powered Chat Assistant**
- Context-aware Q&A using BM25 retrieval
- Conversational memory with session management
- Source tracking for answer verification
- Document-scoped conversations
- Query enhancement with conversation context

### 4️⃣ **Interactive Quiz Generation**
- AI-generated MCQs from your content
- Multiple difficulty levels and question types
- Topic-based filtering
- Detailed explanations for each answer
- Progress tracking and scoring

### 5️⃣ **User Authentication & Credit System**
- Firebase Authentication integration
- MongoDB user management
- Credit-based usage system (100 free credits/month)
- Automatic monthly credit reset
- Usage tracking and analytics

---

## 🛠️ Tech Stack

**Backend:**
- **FastAPI** + Uvicorn (async Python web framework)
- **Google Gemini 2.5 Flash** (LLM integration)
- **MongoDB** (database with Motor async driver)
- **Firebase Admin** (authentication)
- **rank-bm25** (probabilistic ranking for search)
- **BeautifulSoup4** (web scraping)
- **httpx** (async HTTP client)
- **pyrate-limiter** (rate limiting)

**Frontend:**
- **React 18** + Vite (fast dev server)
- **Tailwind CSS** (modern styling)
- **React Router** (navigation)
- **Firebase** (client-side auth)
- **Axios** (API client)
- **Lucide React** (icons)
- **react-toastify** (notifications)
- **react-spinners** (loading states)
- **Recharts** (data visualization)

**Key Algorithms:**
- **BM25** (Best Matching 25 - probabilistic ranking)
- **Sentence-based chunking** (intelligent text splitting)
- **Credit system** (atomic transactions with MongoDB)

---

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

---

## 📊 API Endpoints

### Authentication
- `GET /auth/me` - Get current user stats and credits

### Content Extraction & Library
- `POST /extract` - Extract and index content from URL (costs 5 credits)
- `GET /extract/status/{job_id}` - Check extraction job status
- `GET /extract/jobs` - List user's extraction jobs
- `GET /library` - Get user's document library
- `GET /library/{document_id}` - Get specific document
- `PATCH /library/{document_id}/status` - Update document status (favorite/archive)
- `DELETE /library/{document_id}` - Delete document
- `DELETE /clear-store` - Clear all user's documents

### Chat
- `POST /chat` - RAG chat with document context (costs 1 credit)
- `GET /chat/history/{document_id}` - Get conversation history
- `DELETE /chat/session/{document_id}` - Clear chat session

### Notes
- `POST /notes/generate` - Generate study notes for topic (costs 2 credits)
- `GET /notes/{document_id}` - Get all notes for document
- `GET /notes/detail/{note_id}` - Get specific note
- `DELETE /notes/{note_id}` - Delete note

### Quiz
- `POST /quiz/generate` - Generate MCQs (costs 1 credit)
- `GET /quiz/{document_id}` - Get all quizzes for document
- `GET /quiz/detail/{quiz_id}` - Get specific quiz
- `DELETE /quiz/{quiz_id}` - Delete quiz

### System
- `GET /` - Health check
- `GET /warmup` - Initialize system (no auth required)

---

## 📁 Project Structure

```
Onboardiq/
├── Backend/
│   ├── app.py                          # FastAPI main application
│   ├── config.py                       # Configuration management
│   ├── requirements.txt                # Python dependencies
│   ├── .env.example                    # Environment variables template
│   │
│   ├── Database/
│   │   └── database.py                 # MongoDB connection & initialization
│   │
│   ├── Middleware/
│   │   ├── auth.py                     # Firebase authentication middleware
│   │   ├── error_handlers.py          # Custom error handlers
│   │   └── rate_limit.py               # Rate limiting middleware
│   │
│   ├── Routes/
│   │   ├── auth.py                     # Authentication endpoints
│   │   ├── chat.py                     # RAG chat endpoints
│   │   ├── extract.py                  # Content extraction endpoints
│   │   ├── library.py                  # Document library management
│   │   ├── notes.py                    # Study notes generation
│   │   ├── quiz.py                     # Quiz generation
│   │   └── warmup.py                   # System initialization
│   │
│   ├── Services/
│   │   ├── gemini_client.py            # Gemini AI integration
│   │   ├── note_generator.py           # AI-powered study materials
│   │   ├── conversational_memory.py    # Chat session management
│   │   ├── persistent_vector_store.py  # BM25 indexing & search
│   │   ├── chunking_service.py         # Intelligent text chunking
│   │   ├── credit_service.py           # Credit system with atomic transactions
│   │   ├── job_service.py              # Background job processing
│   │   ├── text_cleaner.py             # Web scraping & cleaning
│   │   └── chat_utils.py               # Chat utility functions
│   │
│   └── models/
│       ├── requests.py                 # Pydantic request models
│       └── responses.py                # Pydantic response models
│
├── Frontend/
│   ├── package.json                    # Node dependencies
│   ├── tailwind.config.js              # Tailwind CSS configuration
│   ├── vite.config.js                  # Vite configuration
│   │
│   └── src/
│       ├── App.jsx                     # Main app with routing
│       ├── index.jsx                   # Entry point
│       ├── index.css                   # Global styles
│       │
│       ├── api/
│       │   ├── backend.js              # Axios API client
│       │   ├── firebaseConfig.js       # Firebase configuration
│       │   └── library.js              # Library API functions
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Navbar.jsx          # Navigation bar
│       │   │   └── PageLayout.jsx      # Page wrapper
│       │   ├── ui/
│       │   │   ├── Button.jsx          # Reusable button
│       │   │   ├── Card.jsx            # Card component
│       │   │   ├── Input.jsx           # Input component
│       │   │   └── Badge.jsx           # Badge component
│       │   ├── CourseCard.jsx          # Document card
│       │   ├── UsageStats.jsx          # Credits display
│       │   ├── NoContentMessage.jsx    # Empty state
│       │   └── ProtectedRoute.jsx      # Auth guard
│       │
│       ├── pages/
│       │   ├── Home.jsx                # Content extraction page
│       │   ├── Dashboard.jsx           # User dashboard
│       │   ├── Chat.jsx                # Chat interface
│       │   ├── Notes.jsx               # Notes generation
│       │   ├── Quiz.jsx                # Interactive quiz
│       │   └── Login.jsx               # Authentication page
│       │
│       └── utils/
│           └── contentCheck.js         # Content validation utilities
│
├── .gitignore                          # Git ignore rules
└── README.md                           # This file
```

---

## 💳 Credit System

| Action | Cost | Description |
|--------|------|-------------|
| Extract URL | 5 credits | Scrape and index content |
| Generate Notes | 2 credits | AI study materials |
| Generate Quiz | 1 credit | MCQ generation |
| Chat Message | 1 credit | RAG-powered Q&A |

- **Free Tier**: 100 credits per month
- **Reset**: Automatic monthly reset (30 days)
- **Refunds**: Automatic refund on operation failure

---

## 🐛 Troubleshooting

### "GEMINI_API_KEY not found"
- **Required!** Create `Backend/.env` file
- Copy from `.env.example` and add your API key
- Get free key at [https://ai.google.dev/](https://ai.google.dev/)

### "MONGODB_URI not configured"
- Set up MongoDB (local or Atlas)
- Add connection string to `.env`
- Format: `mongodb://localhost:27017/onboardiq` or Atlas URI

### "Firebase authentication failed"
- Configure Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
- Add service account key as `serviceAccountKey.json`
- Update frontend `firebaseConfig.js` with your config

### "Insufficient credits"
- Free tier: 100 credits/month
- Credits reset automatically every 30 days
- Check remaining credits in Dashboard

### "Rate limit exceeded"
- API rate limiting is enabled per user
- Wait a few seconds between requests
- Check rate limit settings in `Middleware/rate_limit.py`

### "No content found"
- Extract content from Home page first
- Documents are stored in MongoDB
- Check document library in Dashboard

### "Frontend can't reach backend"
- Ensure backend is running on `http://127.0.0.1:8000`
- Check `Frontend/src/api/backend.js` baseURL setting
- Verify CORS settings in `Backend/config.py`

### "Module not found" errors
- Activate virtual environment first
- Run `pip install -r requirements.txt` again
- On Mac/Linux, use `python3` instead of `python`

### "Port already in use"
- Backend (8000): Change port in uvicorn command
- Frontend (5173/3000): Vite will auto-select available port

---

## 🔒 Security Features

- Firebase Authentication with JWT tokens
- Protected API routes with authentication middleware
- Rate limiting per user
- Input validation with Pydantic
- MongoDB injection prevention
- CORS configuration
- Environment variable management

---

## 📝 License

This project is for learning and portfolio purposes.