# ============================================================
# Stage 1: Builder - Install build dependencies
# ============================================================
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies in build location
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ============================================================
# Stage 2: Production - Minimal runtime image
# ============================================================
FROM python:3.11-slim AS production

# Labels for container metadata
LABEL maintainer="adityarohilla"
LABEL description="Energy Fingerprinting ML Model - Device Detection"
LABEL version="1.0.0"

WORKDIR /app

# Create non-root user for security
RUN groupadd --gid 1000 appgroup && \
    useradd --uid 1000 --gid appgroup --shell /bin/bash --create-home appuser

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Copy project source code
COPY --chown=appuser:appgroup src/ ./src/
COPY --chown=appuser:appgroup data/ ./data/
COPY --chown=appuser:appgroup models/ ./models/

# Switch to non-root user
USER appuser

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    MODE=production

# Healthcheck - check if the API responds
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health', timeout=5)" || exit 1

# Default command - run live monitoring
CMD ["python", "src/current_device_live.py"]

# ============================================================
# Stage 3: Development - Full development environment
# ============================================================
FROM production AS development

# Install development tools
RUN apt-get update && apt-get install -y \
    vim \
    nano \
    git \
    && rm -rf /var/lib/apt/lists/*

# Switch back to root for development (to install more packages if needed)
USER root

# Install dev dependencies
COPY --from=builder /install /usr/local
COPY requirements.txt .

RUN pip install --no-cache-dir \
    pytest \
    pytest-cov \
    black \
    flake8 \
    mypy \
    jupyter

# Switch back to non-root
USER appuser

# Development command - drop into bash
CMD ["/bin/bash"]

