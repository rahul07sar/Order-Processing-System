# Backend runtime image with Python, PostgreSQL client headers, and app code.
FROM python:3.11-slim

WORKDIR /app

# Keep the container output predictable and avoid extra bytecode files.
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Native build tools are installed here so binary dependencies can compile cleanly.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies before copying the app for better layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
