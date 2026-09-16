# CMPDI / CIL DOCUMENT AI

AI-Assisted Geological, Mining & Production Reporting Platform.

This project is a full-stack application built for CMPDI / CIL. It features a modern, responsive frontend and a powerful API-driven backend.

## Architecture

The project is structured into two completely separate applications:

1. **Frontend**: A modern web application built with Next.js, TypeScript, and Tailwind CSS.
2. **Backend**: A robust RESTful API built with Python and FastAPI.

### Current Project Structure

```
cmpdi-document-ai/
│
├── frontend/           # Next.js frontend application
│   ├── app/
│   ├── public/
│   ├── next.config.mjs
│   ├── package.json
│   └── ...
│
├── backend/            # FastAPI backend application
│   ├── app/
│   │   └── main.py
│   ├── requirements.txt
│   └── ...
│
├── README.md           # Project documentation
└── .gitignore          # Global git ignores
```

*Note: AI, OCR, database integration, RAG modules, authentication, and business logic will be implemented in later steps. Currently, the architecture contains the core structural foundation.*

## How to Run

### 1. Frontend

The frontend uses Next.js and requires Node.js.

```bash
cd frontend
npm install
npm run dev
```

The frontend will start at `http://localhost:3000`.

### 2. Backend

The backend uses FastAPI and Python. It's recommended to use a virtual environment.

```bash
cd backend
python -m venv venv
# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install requirements
pip install -r requirements.txt

# Run the FastAPI server
uvicorn app.main:app --reload --port 8000
```

The backend API will start at `http://localhost:8000`. You can check the health status by visiting `http://localhost:8000/api/health`.

