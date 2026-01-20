# Updates Summary

## Changes Made

### 1. New Endpoint: GET /api/data/grouped

Added a new endpoint that returns data grouped by device ID with aggregated statistics.

**Endpoint:** `GET /api/data/grouped`

**Response Format:**

```json
[
  {
    "device_id": "ESP32_001",
    "record_count": 1523,
    "latest_reading": {
      "id": "65ab1234567890abcdef1234",
      "device_id": "ESP32_001",
      "timestamp": "2026-01-19T18:00:00Z",
      "vrms": 230.5,
      "irms": 1.234,
      "apparent_power": 284.5,
         "wh": 12456
    },
    "first_reading": { ... },
    "average_power": 275.3,
    "max_power": 350.2,
      "total_wh": 12456
  },
  {
    "device_id": "ESP32_002",
    ...
  }
]
```

**Features:**

- Groups all data by device_id
- Provides record count per device
- Shows latest and first readings
- Calculates average power across all readings
- Shows maximum power recorded
- Reports total Wh for each device
- Results sorted by device_id

### 2. Improved MongoDB Connection Handling

**Before:**

- 10-second connection timeout
- Minimal error logging
- No connection retry settings

**After:**

- 30-second connection timeout (better for slow networks)
- Detailed logging at each connection step
- Connection pool configuration (min: 10, max: 50)
- Better error messages for debugging
- Logs URI length (without exposing credentials)

**Benefits for Kubernetes:**

- Works better with MongoDB Atlas over internet
- Provides detailed logs for troubleshooting
- Handles slow network connections gracefully
- Connection pooling improves performance

### 3. Enhanced Logging

Added detailed logging throughout the MongoDB initialization:

- Connection attempt notification
- URI length (for verification without exposing secrets)
- Ping status
- Success confirmation with checkmark
- Detailed error messages at each step

### 4. Updated Test Scripts

Both `test-api.ps1` and `test-api.sh` now include:

- Test for the new grouped endpoint
- Better formatted output
- Shows aggregated statistics

### 5. New Documentation

Created **KUBERNETES.md** with:

- Complete troubleshooting guide for the CrashLoopBackOff issue
- MongoDB Atlas setup instructions
- Secret configuration examples
- Common issues and solutions
- Health check testing
- Production deployment recommendations

## Fixing the Kubernetes Issue

### Root Cause

The pod was crashing due to MongoDB Atlas TLS connection errors. This typically happens when:

1. MongoDB URI is incorrect
2. IP whitelist not configured
3. Network connectivity issues
4. Connection timeout too short

### Solution Steps

1. **Verify MongoDB URI Format**

   ```bash
   mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/spectrawatt?retryWrites=true&w=majority
   ```

2. **Update Kubernetes Secret**

   ```bash
   kubectl delete secret spectrawatt-api-secrets -n spectrawatt

   kubectl create secret generic spectrawatt-api-secrets \
     -n spectrawatt \
     --from-literal=MONGODB_URI='mongodb+srv://user:pass@cluster.mongodb.net/spectrawatt?retryWrites=true&w=majority' \
     --from-literal=MONGODB_DATABASE='spectrawatt' \
     --from-literal=PORT='8080'
   ```

3. **Configure MongoDB Atlas Network Access**
   - Add your Kubernetes cluster IP to the whitelist
   - Or use 0.0.0.0/0 for testing (add security later)

4. **Restart Deployment**

   ```bash
   kubectl rollout restart deployment spectrawatt-api -n spectrawatt
   ```

5. **Monitor Logs**

   ```bash
   kubectl logs -n spectrawatt deployment/spectrawatt-api -f
   ```

   Look for:

   ```
   Connecting to MongoDB (URI length: XXX chars)
   Attempting to connect to MongoDB...
   Pinging MongoDB...
   ✓ Connected to MongoDB successfully, Database: spectrawatt
   ```

### Testing the Fix

After deploying the updated code:

```bash
# Check pod status
kubectl get pods -n spectrawatt

# Check logs for successful connection
kubectl logs -n spectrawatt <POD_NAME> | grep -i "connected\|mongo"

# Test health endpoint
kubectl run -it --rm test --image=curlimages/curl --restart=Never -- \
  curl http://spectrawatt-api.spectrawatt:8080/health

# Test grouped endpoint
kubectl run -it --rm test --image=curlimages/curl --restart=Never -- \
  curl http://spectrawatt-api.spectrawatt:8080/api/data/grouped
```

## Files Modified

1. **api/main.go**
   - Added `DeviceGroup` struct
   - Added `GetGroupedDataHandler` function
   - Improved `initMongoDB` with better timeouts and logging
   - Added grouped endpoint route
   - Updated logging throughout

2. **api/test-api.ps1**
   - Added test for grouped endpoint

3. **api/test-api.sh**
   - Added test for grouped endpoint

4. **api/README.md**
   - Documented new grouped endpoint
   - Added example response
   - Updated curl examples

5. **api/KUBERNETES.md** (NEW)
   - Complete Kubernetes deployment guide
   - Troubleshooting for CrashLoopBackOff
   - MongoDB Atlas setup
   - Secret configuration
   - Common issues and solutions

## API Endpoints Summary

| Method  | Endpoint                | Description                          |
| ------- | ----------------------- | ------------------------------------ |
| GET     | `/health`               | Health check with DB status          |
| POST    | `/api/data`             | Submit energy data from ESP32        |
| GET     | `/api/data`             | Get all data (latest 100)            |
| **GET** | **`/api/data/grouped`** | **Get data grouped by device (NEW)** |
| GET     | `/api/data/latest`      | Get latest reading                   |
| GET     | `/api/data/device/{id}` | Get device-specific data             |

## Next Steps

1. **Update your container image:**

   ```bash
   # Build new image
   docker build -t ghcr.io/upayanmazumder-devlabs/spectrawatt/api:latest .
   docker push ghcr.io/upayanmazumder-devlabs/spectrawatt/api:latest
   ```

2. **Update Kubernetes secret** with correct MongoDB URI

3. **Restart deployment:**

   ```bash
   kubectl rollout restart deployment spectrawatt-api -n spectrawatt
   ```

4. **Monitor logs** to confirm successful connection

5. **Test new grouped endpoint:**
   ```bash
   curl https://api.spectrawatt.upayan.dev/api/data/grouped
   ```

## Benefits

### Grouped Data Endpoint

- ✅ Easy to see all devices at a glance
- ✅ Aggregated statistics per device
- ✅ No need to query each device separately
- ✅ Useful for dashboard/UI development
- ✅ Shows device health (record count, latest reading)

### Improved MongoDB Connection

- ✅ Better timeout handling (30s vs 10s)
- ✅ Detailed logging for troubleshooting
- ✅ Connection pooling for performance
- ✅ Works better with MongoDB Atlas
- ✅ Easier to debug in Kubernetes

### Documentation

- ✅ Complete Kubernetes troubleshooting guide
- ✅ Step-by-step MongoDB Atlas setup
- ✅ Common issues and solutions
- ✅ Production deployment best practices

## Example Usage

### Get All Devices Summary

```bash
curl https://api.spectrawatt.upayan.dev/api/data/grouped
```

### Response shows:

- Which devices are reporting
- How many readings per device
- Latest reading from each device
- Average and max power consumption
- Total energy consumption (Wh)

This is perfect for building a dashboard that shows:

- Active devices
- Current status of each device
- Energy consumption statistics
- Device health monitoring
