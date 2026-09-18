# CMPDI / CIL DOCUMENT AI

AI-Assisted Geological, Mining & Production Reporting Platform.

Full-stack enterprise application engineered for CMPDI / Coal India Limited, providing multi-document RAG search, AI report generation, automated validation & cross-document conflict detection, topic modeling, and RBAC authentication.

---

## Architecture Overview

* **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Framer Motion, Three.js / React Three Fiber.
* **Backend**: FastAPI (Python 3.11+), Uvicorn, SQLAlchemy (AsyncIO), Alembic, Pydantic.
* **Database**: PostgreSQL with asyncpg (compatible with local PostgreSQL, Neon, Supabase, Render DB, AWS RDS).
* **AI & LLM**: Groq (Llama 3.3 / GPT-OSS), Gemini, OpenAI, HuggingFace, with local vector embeddings.

---

## Quick Local Development

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

pip install -r requirements.txt

# Copy .env template and customize if needed
cp .env.example .env

# Run FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
API runs at `http://localhost:8000`. Interactive Swagger docs at `http://localhost:8000/docs`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:3000`.

---

## 🚀 Public Production Deployment Guide

Deploy this project publicly in 3 simple steps:

### Step 1: Cloud PostgreSQL Database (Free & Instant)
You can use **Neon.tech** (Recommended, 1-click serverless PostgreSQL) or **Supabase**:
1. Go to [neon.tech](https://neon.tech) and create a free project named `cmpdi-db`.
2. Copy your Connection String (`DATABASE_URL`), for example:
   `postgresql://neondb_owner:YOUR_PASSWORD@ep-sample-123.us-east-2.aws.neon.tech/neondb?sslmode=require`

*(All database tables and initial users `cmpdi_admin` and `normal_user` will be created automatically on backend startup!)*

---

### Step 2: Deploy Backend (Render / Railway)

#### Deploy on Render (Free / Recommended):
1. Push your repository to GitHub.
2. Go to [Render Dashboard](https://dashboard.render.com/) $\to$ **New Web Service**.
3. Select your repository.
4. Set the following settings:
   * **Root Directory**: `backend`
   * **Environment**: `Python 3`
   * **Build Command**: `pip install -r requirements.txt`
   * **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Under **Environment Variables**, add:
   * `ENVIRONMENT`: `production`
   * `DEBUG`: `False`
   * `DATABASE_URL`: *(Your PostgreSQL URL from Step 1)*
   * `JWT_SECRET`: *(Generate a random 64-char string)*
   * `LLM_PROVIDER`: `groq`
   * `LLM_MODEL`: `openai/gpt-oss-20b`
   * `GROQ_API_KEY`: *(Your Groq API key)*
   * `ALLOWED_ORIGINS`: `https://your-frontend-domain.vercel.app,http://localhost:3000`
6. Click **Deploy Web Service**.
7. Copy your backend URL (e.g. `https://cmpdi-backend.onrender.com`).

---

### Step 3: Deploy Frontend (Vercel)

1. Go to [Vercel Dashboard](https://vercel.com/new).
2. Import your GitHub repository.
3. Configure the project:
   * **Framework Preset**: `Next.js`
   * **Root Directory**: `frontend`
4. Under **Environment Variables**, add:
   * `NEXT_PUBLIC_API_URL`: `https://cmpdi-backend.onrender.com` *(Your Render backend URL from Step 2)*
   * `BACKEND_INTERNAL_URL`: `https://cmpdi-backend.onrender.com`
5. Click **Deploy**.
6. Once deployed, open your Vercel URL!

---

## Default System Credentials (Out of the Box)

* **Administrator (HOD Role)**:
  * **Username**: `cmpdi_admin` (or `admin@cmpdi.co.in`)
  * **Password**: `CMPDI_Secure_Auth_2026!`
* **Standard Analyst (NORMAL_USER Role)**:
  * **Username**: `normal_user` (or `normal@cmpdi.co.in`)
  * **Password**: `CMPDI_Secure_Auth_2026!`
