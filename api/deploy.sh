#!/bin/bash

# Deployment script for Spectrawatt API
# Usage: ./deploy.sh

set -e

echo "Building Spectrawatt API..."
go build -o spectrawatt-api

echo "Stopping existing service..."
sudo systemctl stop spectrawatt-api || true

echo "Copying binary to /opt/spectrawatt-api..."
sudo mkdir -p /opt/spectrawatt-api
sudo cp spectrawatt-api /opt/spectrawatt-api/

echo "Setting permissions..."
sudo chown -R spectrawatt:spectrawatt /opt/spectrawatt-api || true
sudo chmod +x /opt/spectrawatt-api/spectrawatt-api

echo "Installing systemd service..."
sudo cp spectrawatt-api.service /etc/systemd/system/

echo "Reloading systemd..."
sudo systemctl daemon-reload

echo "Starting service..."
sudo systemctl start spectrawatt-api

echo "Enabling service..."
sudo systemctl enable spectrawatt-api

echo "Checking status..."
sudo systemctl status spectrawatt-api

echo "Deployment complete!"
echo "API is now running on port 8080"
echo "Check logs with: sudo journalctl -u spectrawatt-api -f"
