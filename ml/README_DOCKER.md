# Energy Fingerprinting ML Model - Docker Setup

Dockerized PyTorch LSTM model for real-time energy device fingerprinting and classification.

## 🚀 Quick Start

### 1. Build and Run

```bash
# Build the image
docker compose build

# Run live monitoring (default)
docker compose up energy-live

# Or run with a specific profile
docker compose --profile live up energy-live
```

### 2. Available Profiles

| Profile | Service | Command | Description |
|---------|---------|---------|-------------|
| `live` | energy-live | `python src/predict_live.py` | Real-time monitoring with live predictions |
| `api` | energy-api | `uvicorn src.predict_api:app --host 0.0.0.0 --port 8000` | REST API server (port 8000) |
| `current` | energy-current | `python src/current_device.py` | Single prediction request |
| `train` | energy-train | `python src/train.py` | Model training with data from `./data/` |
| `dev` | energy-train | `python src/train.py` | Full development environment |

### 3. Development Mode

```bash
# Run interactive development container
docker compose --profile dev up energy-train

# Access the shell
docker compose exec energy-train /bin/bash
```

## 📁 Project Structure

```
energy_fingerprinting/
├── src/
│   ├── model.py           # LSTM neural network architecture
│   ├── dataset.py         # PyTorch Dataset for windowed data
│   ├── train.py           # Model training script
│   ├── utils.py           # Data preprocessing utilities
│   ├── predict_api.py     # FastAPI REST endpoint
│   ├── predict_live.py    # Live monitoring loop
│   ├── current_device.py  # Single prediction query
│   └── current_device_live.py  # Live monitoring with output
├── models/
│   ├── energy_model.pt    # Trained model weights
│   ├── scaler.pkl         # StandardScaler for features
│   ├── label_encoder.pkl  # LabelEncoder for classes
│   └── irms_weight.pkl    # Custom IRMS weight multiplier
├── data/
│   └── spectrawatt.energy_data.csv  # Training data
├── Dockerfile             # Multi-stage Docker build
├── docker-compose.yml     # Container orchestration
└── requirements.txt       # Python dependencies
```

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PYTHONUNBUFFERED` | `1` | Disable Python output buffering |
| `PYTHONPATH` | `/app` | Python module search path |
| `MODE` | `production` | Runtime mode (production/development) |
| `API_HOST` | `0.0.0.0` | API server host |
| `API_PORT` | `8000` | API server port |

### Volume Mounts

- `./data:/app/data` - Training data (write for training)
- `./models:/app/models` - Model artifacts (write for training)
- `./src:/app/src` - Source code (for development)

## 🌐 API Endpoints

When running with `api` profile:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/predict` | POST | Get device prediction |
| `/predictions` | GET | Get recent predictions |

### Example API Usage

```bash
# Health check
curl http://localhost:8000/health

# Make a prediction
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"readings": [{"vrms": 230, "irms": 0.5, "apparent_power": 115, "wh": 0.1}, ...]}'
```

## 🏗️ Docker Architecture

### Multi-Stage Build

```
┌─────────────────┐
│   python:3.11   │  Stage 1: Builder
│   (slim image)  │  - Install gcc, g++
│                 │  - Build Python deps
└────────┬────────┘
         │ pip install -> /install
         ▼
┌─────────────────┐
│   python:3.11   │  Stage 2: Production
│   (slim image)  │  - Copy compiled deps
│                 │  - Copy source code
│                 │  - Run as non-root user
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   python:3.11   │  Stage 3: Development
│   (slim image)  │  - Add dev tools
│   + dev deps    │  - Install pytest, black, etc.
└─────────────────┘
```

### Image Sizes (Approximate)

| Stage | Size | Notes |
|-------|------|-------|
| Production | ~450MB | Minimal runtime with PyTorch |
| Development | ~800MB | Includes dev tools |

## 🧪 Testing

```bash
# Run tests in development container
docker compose --profile dev exec energy-train pytest

# Run with coverage
docker compose --profile dev exec energy-train pytest --cov=src
```

## 🚀 Deployment

### Production Deployment

```bash
# Build production image only
docker compose build --build-arg BUILDKIT_INLINE_CACHE=1

# Deploy API only
docker compose --profile api up -d energy-api

# Scale API instances
docker compose up --scale energy-api=3 -d
```

### Docker Swarm

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy - docker-compose.yml energy-fingerprinting

# Check services
docker service ls
```

## 🔒 Security

- Runs as non-root user (`appuser`, UID 1000)
- Minimal base image (python:3.11-slim)
- Health checks for container orchestration
- No unnecessary packages in production image

## 📝 Commands Reference

```bash
# Build all images
docker compose build

# Build specific service
docker compose build energy-api

# Start specific profile
docker compose --profile live up

# Start with custom command
docker compose run --rm energy-live python src/current_device.py

# View logs
docker compose logs -f energy-live

# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v

# Prune unused images
docker image prune -f
```

## 🐳 Manual Docker Commands

```bash
# Build image
docker build -t energy-fingerprinting .

# Run container
docker run --rm \
  -v $(pwd)/models:/app/models \
  -e PYTHONUNBUFFERED=1 \
  energy-fingerprinting:latest \
  python src/current_device.py

# Run API server
docker run --rm \
  -p 8000:8000 \
  -v $(pwd)/models:/app/models \
  -e PYTHONUNBUFFERED=1 \
  energy-fingerprinting:latest \
  python -m uvicorn src.predict_api:app --host 0.0.0.0 --port 8000
```

## 📦 Requirements

- Docker Engine 20.10+
- Docker Compose V2
- 4GB+ RAM available
- 2GB+ disk space

## 🛠️ Troubleshooting

### Permission Issues

```bash
# Fix model directory permissions
chmod -R 755 models/

# Or rebuild with proper ownership
docker compose build --no-cache
```

### Out of Memory

```bash
# Limit Docker memory usage
docker compose config
# Edit and reduce memory limits in deploy.resources
```

### API Not Responding

```bash
# Check container health
docker compose ps

# View API logs
docker compose logs energy-api

# Check network connectivity
docker network ls
docker network inspect energy_fingerprinting_energy-net
```

