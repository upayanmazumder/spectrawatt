# Spectrawatt API - MongoDB Setup

## Environment Variables

Create a `.env` file or set these environment variables:

```bash
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=spectrawatt

# API Configuration
PORT=8080
```

## Local Development with Docker

The easiest way to run with MongoDB:

```bash
docker-compose up -d
```

This will start:

- MongoDB on port 27017
- Spectrawatt API on port 8080

## Manual MongoDB Setup

### Install MongoDB

**Ubuntu/Debian:**

```bash
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

**macOS:**

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Windows:**
Download from https://www.mongodb.com/try/download/community

### Verify MongoDB is Running

```bash
mongosh
```

## Database Schema

### Collection: `energy_data`

```javascript
{
  _id: ObjectId("..."),
  device_id: "ESP32_001",
  timestamp: ISODate("2026-01-19T10:30:00Z"),
  vrms: 230.5,
  irms: 1.234,
  apparent_power: 284.5,
  wh: 45.6
}
```

### Indexes

The API automatically creates a compound index on:

- `device_id` (ascending)
- `timestamp` (descending)

This optimizes queries for device-specific data sorted by time.

## MongoDB Queries

### Connect to Database

```bash
mongosh spectrawatt
```

### View All Data

```javascript
db.energy_data.find().sort({ timestamp: -1 }).limit(10);
```

### Get Data for Specific Device

```javascript
db.energy_data.find({ device_id: "ESP32_001" }).sort({ timestamp: -1 });
```

### Get Latest Reading

```javascript
db.energy_data.findOne({}, { sort: { timestamp: -1 } });
```

### Count Documents

```javascript
db.energy_data.countDocuments();
```

### Aggregate by Device

```javascript
db.energy_data.aggregate([
	{
		$group: {
			_id: "$device_id",
			count: { $sum: 1 },
			avgPower: { $avg: "$apparent_power" },
			maxPower: { $max: "$apparent_power" },
			totalWh: { $max: "$wh" },
		},
	},
]);
```

### Delete Old Data (older than 30 days)

```javascript
db.energy_data.deleteMany({
	timestamp: {
		$lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
	},
});
```

## Production Deployment

### MongoDB Atlas (Cloud)

1. Create a free cluster at https://www.mongodb.com/cloud/atlas
2. Get your connection string
3. Set environment variable:

```bash
export MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/spectrawatt?retryWrites=true&w=majority"
```

### MongoDB with Authentication

If using authentication:

```bash
export MONGODB_URI="mongodb://username:password@localhost:27017"
```

### Docker Production Setup

```yaml
# docker-compose.prod.yml
version: "3.8"

services:
  mongodb:
    image: mongo:7.0
    restart: always
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
      MONGO_INITDB_DATABASE: spectrawatt
    volumes:
      - /data/mongodb:/data/db
    ports:
      - "127.0.0.1:27017:27017"

  spectrawatt-api:
    image: spectrawatt-api:latest
    restart: always
    ports:
      - "8080:8080"
    environment:
      - MONGODB_URI=mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/spectrawatt?authSource=admin
      - MONGODB_DATABASE=spectrawatt
```

## Backup and Restore

### Backup

```bash
mongodump --db spectrawatt --out /backup/$(date +%Y%m%d)
```

### Restore

```bash
mongorestore --db spectrawatt /backup/20260119/spectrawatt
```

### Automated Daily Backup

Add to crontab:

```bash
0 2 * * * mongodump --db spectrawatt --out /backup/$(date +\%Y\%m\%d) && find /backup -mtime +30 -delete
```

## Monitoring

### Check Database Size

```javascript
db.stats();
```

### Check Collection Stats

```javascript
db.energy_data.stats();
```

### Monitor Real-time Operations

```bash
mongotop
mongostat
```

## Performance Tips

1. **Index Usage**: The API creates indexes automatically on first run
2. **Connection Pooling**: MongoDB driver handles connection pooling
3. **Query Limits**: All queries are limited to 100 documents by default
4. **Data Retention**: Implement data cleanup for old records

## Troubleshooting

### Connection Failed

```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Check MongoDB logs
tail -f /var/log/mongodb/mongod.log
```

### Permission Issues

```bash
sudo chown -R mongodb:mongodb /var/lib/mongodb
sudo chown -R mongodb:mongodb /var/log/mongodb
```

### Port Already in Use

```bash
# Find process using port 27017
lsof -i :27017
# Or on Windows
netstat -ano | findstr :27017
```
