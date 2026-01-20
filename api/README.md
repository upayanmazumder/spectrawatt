# Spectrawatt API

Go backend API for collecting energy monitoring data from ESP32 devices with MongoDB persistence.

## Features

- RESTful API for receiving energy data from ESP32
- MQTT ingestion pipeline for devices publishing readings
- **MongoDB persistence** for reliable data storage
- Store and retrieve energy monitoring data
- CORS enabled for web clients
- Health check endpoint with database status
- Device-specific data retrieval
- Automatic indexing for optimized queries
- Docker support with MongoDB container

## Prerequisites

- Go 1.21 or higher
- MongoDB 5.0+ (or use Docker Compose)
- Docker & Docker Compose (optional, for easy setup)

## Quick Start

### Using Docker Compose (Recommended)

```bash
docker-compose up -d
```

This starts both MongoDB and the API server. The API will be available at `http://localhost:8080`.

### Manual Setup

1. **Install MongoDB** (if not using Docker)

   ```bash
   # See MONGODB.md for installation instructions
   ```

2. **Set Environment Variables**

   ```bash
   export MONGODB_URI="mongodb://localhost:27017"
   export MONGODB_DATABASE="spectrawatt"
   export PORT="8080"
   ```

3. **Install Dependencies**

   ```bash
   go mod download
   ```

4. **Run the Server**
   ```bash
   go run main.go
   ```

## MQTT Ingest

The API subscribes to an MQTT broker (default: `tcp://localhost:1883`) and listens on `spectrawatt/+/energy`.

Example payload published by devices:

```json
{
	"device_id": "ESP32_001",
	"irms": 1.234,
	"vrms": 230.0, // optional; defaults to DEFAULT_VRMS when omitted
	"apparent_power": 284.5, // optional; computed from vrms * irms when omitted
	"timestamp": "2026-01-19T10:30:00Z"
}
```

Environment variables:

- `MQTT_BROKER_URL` (e.g., `ssl://mqtt.upayan.dev:8883` for TLS)
- `MQTT_TOPIC` (default `spectrawatt/+/energy`)
- `MQTT_CLIENT_ID`, `MQTT_USERNAME`, `MQTT_PASSWORD`
- `MQTT_CA_CERT_PATH`, `MQTT_TLS_INSECURE`
- `DEFAULT_VRMS` for devices that do not send Vrms

## API Endpoints

### POST /api/data

Submit energy data from ESP32.

**Request:**

```json
{
	"device_id": "ESP32_001",
	"vrms": 230.5,
	"irms": 1.234,
	"apparent_power": 284.5,
	"wh": 45.6
}
```

Notes:

- `device_id`, `vrms`, and `irms` are required; `apparent_power` is computed server-side if omitted.
- Optional `timestamp` must be RFC3339; if missing, the server uses its current UTC time.
- Payloads are limited to 1 MB and unknown fields are rejected.

**Response:**

```json
{
	"status": "success",
	"message": "Data received successfully",
	"data": {
		"id": "65ab1234567890abcdef1234",
		"device_id": "ESP32_001",
		"timestamp": "2026-01-19T10:30:00Z",
		"vrms": 230.5,
		"irms": 1.234,
		"apparent_power": 284.5,
		"wh": 45.6
	}
}
```

### GET /api/data

Retrieve stored energy data (latest 100 records).

### GET /api/data/latest

Get the most recent data point.

### GET /api/data/device/{device_id}

Get all data for a specific device (latest 100 records).

### GET /health

Health check endpoint with database connection status.

**Response:**

```json
{
	"status": "healthy",
	"time": "2026-01-19T10:30:00Z",
	"database": "connected"
}
```

## Environment Variables

| Variable           | Default                     | Description               |
| ------------------ | --------------------------- | ------------------------- |
| `MONGODB_URI`      | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGODB_DATABASE` | `spectrawatt`               | Database name             |
| `PORT`             | `8080`                      | Server port               |

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

## Database

The API uses MongoDB for data persistence. See [MONGODB.md](MONGODB.md) for:

- Setup instructions
- Database schema
- Query examples
- Backup/restore procedures
- Performance tips

## Testing

```bash
# Test health endpoint
curl http://localhost:8080/health

# Submit test data
curl -X POST http://localhost:8080/api/data \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "ESP32_001",
    "vrms": 230.5,
    "irms": 1.234,
    "apparent_power": 284.5,
      "wh": 45.6
  }'

# Get all data
curl http://localhost:8080/api/data

# Get data grouped by device
curl http://localhost:8080/api/data/grouped

# Get latest reading
curl http://localhost:8080/api/data/latest

# Get device-specific data
curl http://localhost:8080/api/data/device/ESP32_001
```

## Build

```bash
go build -o spectrawatt-api
```

## Deployment

For production deployment to api.spectrawatt.upayan.dev:

### Option 1: Docker

```bash
docker-compose up -d
```

### Option 2: Systemd Service

```bash
chmod +x deploy.sh
./deploy.sh
```

### Option 3: Cloud Platforms

- Google Cloud Run
- AWS ECS
- Azure Container Instances
- MongoDB Atlas for database

## Production Configuration

### MongoDB Atlas (Cloud Database)

```bash
export MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/spectrawatt?retryWrites=true&w=majority"
```

### HTTPS with Nginx

```nginx
server {
    listen 443 ssl http2;
    server_name api.spectrawatt.upayan.dev;

    ssl_certificate /etc/letsencrypt/live/api.spectrawatt.upayan.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.spectrawatt.upayan.dev/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Dependencies

- [gorilla/mux](https://github.com/gorilla/mux) - HTTP router and URL matcher
- [mongo-driver](https://github.com/mongodb/mongo-go-driver) - Official MongoDB driver for Go

## Project Structure

```
api/
├── main.go                 # Main application code
├── go.mod                  # Go dependencies
├── go.sum                  # Dependency checksums
├── Dockerfile              # Container image
├── docker-compose.yml      # Docker orchestration
├── deploy.sh               # Deployment script
├── spectrawatt-api.service # Systemd service file
├── .env.example            # Environment template
├── README.md               # This file
└── MONGODB.md              # MongoDB documentation
```

## Monitoring

Check logs:

```bash
# Docker
docker-compose logs -f spectrawatt-api

# Systemd
sudo journalctl -u spectrawatt-api -f
```

## License

MIT License
