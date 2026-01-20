# Spectrawatt API - Quick Start Guide

This guide will help you get the Spectrawatt API up and running with MongoDB in just a few minutes.

## Option 1: Docker Compose (Easiest)

This is the recommended method for development and testing.

### Prerequisites

- Docker Desktop installed
- Docker Compose installed

### Steps

1. **Navigate to the API directory**

   ```bash
   cd api
   ```

2. **Start the services**

   ```bash
   docker-compose up -d
   ```

3. **Verify it's running**

   ```bash
   curl http://localhost:8080/health
   ```

   You should see:

   ```json
   {
   	"status": "healthy",
   	"time": "2026-01-19T...",
   	"database": "connected"
   }
   ```

4. **Test with sample data**

   On Windows (PowerShell):

   ```powershell
   .\test-api.ps1
   ```

   On Linux/Mac:

   ```bash
   chmod +x test-api.sh
   ./test-api.sh
   ```

5. **View logs**

   ```bash
   docker-compose logs -f spectrawatt-api
   ```

6. **Stop services**
   ```bash
   docker-compose down
   ```

## Option 2: Manual Setup (Windows)

### Prerequisites

- Go 1.21+ installed
- MongoDB installed or MongoDB Atlas account

### Steps

1. **Install MongoDB Community Edition**

   Download from: https://www.mongodb.com/try/download/community

   Or use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas

2. **Set Environment Variables**

   Create a `.env` file or set in PowerShell:

   ```powershell
   $env:MONGODB_URI="mongodb://localhost:27017"
   $env:MONGODB_DATABASE="spectrawatt"
   $env:PORT="8080"
   ```

3. **Install Dependencies**

   ```powershell
   cd api
   go mod download
   ```

4. **Build the Application**

   ```powershell
   go build -o spectrawatt-api.exe .
   ```

5. **Run the API**

   ```powershell
   .\spectrawatt-api.exe
   ```

6. **Test the API**
   ```powershell
   .\test-api.ps1
   ```

## Option 3: Manual Setup (Linux/Mac)

### Prerequisites

- Go 1.21+ installed
- MongoDB installed

### Steps

1. **Install MongoDB**

   Ubuntu/Debian:

   ```bash
   sudo apt-get install -y mongodb-org
   sudo systemctl start mongod
   ```

   macOS:

   ```bash
   brew tap mongodb/brew
   brew install mongodb-community
   brew services start mongodb-community
   ```

2. **Set Environment Variables**

   ```bash
   export MONGODB_URI="mongodb://localhost:27017"
   export MONGODB_DATABASE="spectrawatt"
   export PORT="8080"
   ```

3. **Install Dependencies**

   ```bash
   cd api
   go mod download
   ```

4. **Build the Application**

   ```bash
   go build -o spectrawatt-api .
   ```

5. **Run the API**

   ```bash
   ./spectrawatt-api
   ```

6. **Test the API**
   ```bash
   chmod +x test-api.sh
   ./test-api.sh
   ```

## Testing the API

### Manual Testing with curl

1. **Check health**

   ```bash
   curl http://localhost:8080/health
   ```

2. **Submit energy data**

   ```bash
   curl -X POST http://localhost:8080/api/data \
     -H "Content-Type: application/json" \
     -d '{
       "device_id": "ESP32_001",
       "vrms": 230.5,
       "irms": 1.234,
       "apparent_power": 284.5,
          "wh": 45.6
     }'
   ```

3. **Get all data**

   ```bash
   curl http://localhost:8080/api/data
   ```

4. **Get latest reading**

   ```bash
   curl http://localhost:8080/api/data/latest
   ```

5. **Get device-specific data**
   ```bash
   curl http://localhost:8080/api/data/device/ESP32_001
   ```

### Using PowerShell (Windows)

```powershell
# Check health
Invoke-RestMethod -Uri "http://localhost:8080/health" | ConvertTo-Json

# Submit data
$data = @{
    device_id = "ESP32_001"
    vrms = 230.5
    irms = 1.234
    apparent_power = 284.5
   wh = 45.6
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8080/api/data" -Method Post -Body $data -ContentType "application/json" | ConvertTo-Json
```

## Accessing MongoDB

### Using MongoDB Compass (GUI)

1. Download from: https://www.mongodb.com/try/download/compass
2. Connect to: `mongodb://localhost:27017`
3. Browse the `spectrawatt` database

### Using mongosh (CLI)

```bash
mongosh spectrawatt

# View all data
db.energy_data.find().pretty()

# Count documents
db.energy_data.countDocuments()

# Get latest 10 records
db.energy_data.find().sort({timestamp: -1}).limit(10)
```

## Troubleshooting

### Port 8080 already in use

```bash
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :8080
kill <PID>
```

### MongoDB connection failed

- Check if MongoDB is running
- Verify connection string in environment variables
- Check MongoDB logs

### Docker issues

```bash
# Restart services
docker-compose restart

# View logs
docker-compose logs -f

# Rebuild containers
docker-compose up -d --build
```

## Next Steps

1. **Configure ESP32** - Update the Arduino code with your WiFi credentials and API endpoint
2. **Deploy to Production** - See `README.md` for deployment options
3. **Set up HTTPS** - Configure Nginx or Caddy for SSL/TLS
4. **Add Authentication** - Implement API keys or JWT tokens
5. **Monitor Performance** - Set up logging and monitoring tools

## Additional Resources

- [README.md](README.md) - Full documentation
- [MONGODB.md](MONGODB.md) - MongoDB setup and operations
- [API Documentation](README.md#api-endpoints) - Endpoint details
- [Docker Hub](https://hub.docker.com/_/mongo) - MongoDB Docker image

## Getting Help

If you encounter issues:

1. Check the logs for error messages
2. Verify all environment variables are set correctly
3. Ensure MongoDB is running and accessible
4. Test with the provided test scripts
5. Check the GitHub issues for similar problems
