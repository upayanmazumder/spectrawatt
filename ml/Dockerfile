# ============================================================
# Stage 1: Builder
# ============================================================
FROM python:3.10-slim AS builder

WORKDIR /build

# System deps
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    python3-dev \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --upgrade pip setuptools wheel

# Install torch CPU + deps
COPY requirements.txt .

RUN pip install --no-cache-dir --prefix=/install \
    torch==2.1.0+cpu \
    torchvision==0.16.0+cpu \
    torchaudio==2.1.0+cpu \
    --index-url https://download.pytorch.org/whl/cpu \
    && pip install --no-cache-dir --prefix=/install -r requirements.txt


# ============================================================
# Stage 2: Production
# ============================================================
FROM python:3.10-slim AS production

LABEL maintainer="adityarohilla"
LABEL description="Energy Fingerprinting ML Model - Device Detection"
LABEL version="1.0.0"

WORKDIR /app

# Non-root user (security drip)
RUN groupadd -g 1000 appgroup && \
    useradd -u 1000 -g appgroup -m appuser

# Copy Python deps
COPY --from=builder /install /usr/local

# App code
COPY --chown=appuser:appgroup src/ ./src/
COPY --chown=appuser:appgroup data/ ./data/
COPY --chown=appuser:appgroup models/ ./models/

USER appuser

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    MODE=production

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

CMD ["python", "src/current_device_live.py"]


# ============================================================
# Stage 3: Development
# ============================================================
FROM production AS development

USER root

RUN apt-get update && apt-get install -y \
    vim \
    nano \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir \
    pytest \
    pytest-cov \
    black \
    flake8 \
    mypy \
    jupyter

USER appuser

CMD ["/bin/bash"]
