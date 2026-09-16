# ==========================================
# CMPDI / CIL Document AI Backend Dockerfile
# ==========================================

FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

# Install system dependencies required by OpenCV, PaddleOCR, and PyMuPDF
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libgomp1 \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for Docker layer caching
COPY requirements.txt ./

# Install Python dependencies (using PyTorch CPU index to keep image size reasonable)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY app/ ./app/

# Create persistent storage directories for uploads and vector index
RUN mkdir -p /app/uploads /app/vector_store

# Set default host and port environment variables
ENV HOST=0.0.0.0 \
    PORT=8000

EXPOSE 8000

# Production uvicorn execution with multi-worker ASGI support
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
