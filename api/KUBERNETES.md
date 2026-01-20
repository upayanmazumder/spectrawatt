# Kubernetes Deployment Guide & Troubleshooting

## Prerequisites

- Kubernetes cluster (k3s, k8s, etc.)
- kubectl configured
- MongoDB Atlas account or MongoDB instance
- Container registry access (ghcr.io)

## MongoDB Connection Issues

### Problem: CrashLoopBackOff with TLS Errors

**Symptoms:**

```
server selection error: context deadline exceeded
remote error: tls: internal error
```

**Root Causes:**

1. Incorrect MongoDB URI
2. MongoDB Atlas IP whitelist not configured
3. Invalid credentials
4. Network connectivity issues

### Solutions

#### 1. Verify MongoDB URI

Create a Kubernetes secret with the correct MongoDB URI:

```bash
# For MongoDB Atlas
kubectl create secret generic spectrawatt-api-secrets \
  -n spectrawatt \
  --from-literal=MONGODB_URI='mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/spectrawatt?retryWrites=true&w=majority' \
  --from-literal=MONGODB_DATABASE='spectrawatt' \
  --from-literal=PORT='8080' \
  --dry-run=client -o yaml | kubectl apply -f -
```

**Important:** Replace `USERNAME` and `PASSWORD` with your actual credentials.

#### 2. MongoDB Atlas IP Whitelist

Add your Kubernetes cluster's external IP to MongoDB Atlas:

```bash
# Get your cluster's external IP
kubectl get nodes -o wide

# In MongoDB Atlas:
# 1. Go to Network Access
# 2. Click "Add IP Address"
# 3. Add your cluster IP or use 0.0.0.0/0 (for testing only)
```

#### 3. Test MongoDB Connection

Create a debug pod to test connectivity:

```yaml
# test-mongo-connection.yaml
apiVersion: v1
kind: Pod
metadata:
  name: mongo-test
  namespace: spectrawatt
spec:
  containers:
    - name: mongo-test
      image: mongo:7.0
      command: ["/bin/bash", "-c", "sleep 3600"]
      env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: spectrawatt-api-secrets
              key: MONGODB_URI
```

Apply and test:

```bash
kubectl apply -f test-mongo-connection.yaml
kubectl exec -it mongo-test -n spectrawatt -- bash

# Inside the pod:
mongosh "$MONGODB_URI"
```

#### 4. Update Secret

If you need to update the MongoDB URI:

```bash
# Delete old secret
kubectl delete secret spectrawatt-api-secrets -n spectrawatt

# Create new secret
kubectl create secret generic spectrawatt-api-secrets \
  -n spectrawatt \
  --from-literal=MONGODB_URI='YOUR_NEW_URI' \
  --from-literal=MONGODB_DATABASE='spectrawatt' \
  --from-literal=PORT='8080'

# Restart the deployment
kubectl rollout restart deployment spectrawatt-api -n spectrawatt
```

#### 5. Check Logs

```bash
# Get current logs
kubectl logs -n spectrawatt deployment/spectrawatt-api --tail=100

# Follow logs
kubectl logs -n spectrawatt deployment/spectrawatt-api -f

# Check previous crash logs
kubectl logs -n spectrawatt <POD_NAME> --previous
```

## Deployment Configuration

### Example Deployment YAML

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: spectrawatt-api
  namespace: spectrawatt
spec:
  replicas: 2
  selector:
    matchLabels:
      app: spectrawatt-api
  template:
    metadata:
      labels:
        app: spectrawatt-api
    spec:
      containers:
        - name: spectrawatt-api
          image: ghcr.io/upayanmazumder-devlabs/spectrawatt/api:latest
          ports:
            - containerPort: 8080
          envFrom:
            - secretRef:
                name: spectrawatt-api-secrets
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "256Mi"
              cpu: "200m"
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
            timeoutSeconds: 3
            failureThreshold: 3
---
apiVersion: v1
kind: Service
metadata:
  name: spectrawatt-api
  namespace: spectrawatt
spec:
  selector:
    app: spectrawatt-api
  ports:
    - protocol: TCP
      port: 8080
      targetPort: 8080
  type: ClusterIP
```

### Secret Configuration

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: spectrawatt-api-secrets
  namespace: spectrawatt
type: Opaque
stringData:
  MONGODB_URI: "mongodb+srv://username:password@cluster.mongodb.net/spectrawatt?retryWrites=true&w=majority"
  MONGODB_DATABASE: "spectrawatt"
  PORT: "8080"
```

## Troubleshooting Commands

### Check Pod Status

```bash
kubectl get pods -n spectrawatt
kubectl describe pod <POD_NAME> -n spectrawatt
```

### Check Logs

```bash
# Current logs
kubectl logs -n spectrawatt <POD_NAME>

# Previous crash logs
kubectl logs -n spectrawatt <POD_NAME> --previous

# Follow logs
kubectl logs -n spectrawatt <POD_NAME> -f
```

### Check Secret

```bash
# View secret (base64 encoded)
kubectl get secret spectrawatt-api-secrets -n spectrawatt -o yaml

# Decode secret
kubectl get secret spectrawatt-api-secrets -n spectrawatt -o jsonpath='{.data.MONGODB_URI}' | base64 -d
```

### Check Events

```bash
kubectl get events -n spectrawatt --sort-by='.lastTimestamp'
```

### Exec into Pod

```bash
kubectl exec -it <POD_NAME> -n spectrawatt -- sh

# Check environment variables
env | grep MONGODB
```

## MongoDB Atlas Setup

1. **Create Cluster**
   - Go to https://cloud.mongodb.com/
   - Create a free M0 cluster
   - Choose a region close to your Kubernetes cluster

2. **Create Database User**
   - Database Access → Add New Database User
   - Choose password authentication
   - Grant read/write access

3. **Configure Network Access**
   - Network Access → Add IP Address
   - Add your Kubernetes cluster IP
   - Or use 0.0.0.0/0 for testing (not recommended for production)

4. **Get Connection String**
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your actual password

## Health Check Endpoint

The API provides a `/health` endpoint that checks:

- API server status
- MongoDB connection status

```bash
# Test from within cluster
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl http://spectrawatt-api.spectrawatt:8080/health

# Expected response:
{
  "status": "healthy",
  "time": "2026-01-19T18:00:00Z",
  "database": "connected"
}
```

## Common Issues

### Issue: Pod keeps restarting

**Check:**

1. MongoDB URI is correct
2. MongoDB Atlas IP whitelist includes cluster IP
3. Database credentials are valid
4. Network connectivity to MongoDB

### Issue: Readiness probe failing

**Solution:**
Increase `initialDelaySeconds` if MongoDB connection takes time:

```yaml
readinessProbe:
  initialDelaySeconds: 30 # Increase from 10
```

### Issue: Out of memory

**Solution:**
Increase memory limits:

```yaml
resources:
  limits:
    memory: "512Mi" # Increase from 256Mi
```

### Issue: Connection timeouts

**Solution:**
The updated code now uses 30-second timeouts instead of 10 seconds, which should help with slow connections.

## Monitoring

### Watch Pod Status

```bash
watch kubectl get pods -n spectrawatt
```

### Monitor Logs

```bash
kubectl logs -n spectrawatt deployment/spectrawatt-api -f | grep -i "error\|connected\|failed"
```

### Check Resource Usage

```bash
kubectl top pods -n spectrawatt
```

## Production Recommendations

1. **Use MongoDB Atlas** - Managed service with automatic backups
2. **Set Resource Limits** - Prevent resource exhaustion
3. **Use Secrets** - Never hardcode credentials
4. **Enable Network Policies** - Restrict traffic
5. **Set up Monitoring** - Use Prometheus/Grafana
6. **Configure Autoscaling** - Handle traffic spikes
7. **Use Multiple Replicas** - High availability
8. **Set up Ingress** - HTTPS/SSL termination

## Next Steps

1. Verify MongoDB connection works from a test pod
2. Update the secret with correct credentials
3. Check MongoDB Atlas network access
4. Restart the deployment
5. Monitor logs for successful connection
6. Test the API endpoints

## Support

If issues persist:

1. Check all environment variables are set correctly
2. Verify MongoDB URI format
3. Test MongoDB connection independently
4. Review API logs for detailed error messages
5. Check MongoDB Atlas metrics for connection attempts
