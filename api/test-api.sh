#!/bin/bash

# Quick test script for Spectrawatt API

set -e

API_URL="${API_URL:-http://localhost:8080}"

echo "Testing Spectrawatt API at $API_URL"
echo "======================================"

# Test 1: Health Check
echo -e "\n1. Testing health endpoint..."
curl -s "$API_URL/health" | jq '.'

# Test 2: Submit test data
echo -e "\n2. Submitting test data..."
curl -s -X POST "$API_URL/api/data" \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "ESP32_TEST",
    "vrms": 230.5,
    "irms": 1.234,
    "apparent_power": 284.5,
    "wh": 45.6
  }' | jq '.'

# Test 3: Get all data
echo -e "\n3. Retrieving all data..."
curl -s "$API_URL/api/data" | jq '. | length' | xargs echo "Total records:"

# Test 4: Get latest data
echo -e "\n4. Getting latest reading..."
curl -s "$API_URL/api/data/latest" | jq '.'

# Test 5: Get device-specific data
echo -e "\n5. Getting data for ESP32_TEST device..."
curl -s "$API_URL/api/data/device/ESP32_TEST" | jq '. | length' | xargs echo "Device records:"

# Test 6: Get grouped data by device
echo -e "\n6. Getting data grouped by device..."
curl -s "$API_URL/api/data/grouped" | jq '.'

echo -e "\n======================================"
echo "All tests completed!"
