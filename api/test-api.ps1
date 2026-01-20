# Quick Test Script for Spectrawatt API (PowerShell)

$API_URL = if ($env:API_URL) { $env:API_URL } else { "http://localhost:8080" }

Write-Host "Testing Spectrawatt API at $API_URL" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "`n1. Testing health endpoint..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$API_URL/health" -Method Get
$health | ConvertTo-Json

# Test 2: Submit test data
Write-Host "`n2. Submitting test data..." -ForegroundColor Yellow
$testData = @{
    device_id = "ESP32_TEST"
    vrms = 230.5
    irms = 1.234
    apparent_power = 284.5
    wh = 45.6
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$API_URL/api/data" -Method Post -Body $testData -ContentType "application/json"
$response | ConvertTo-Json

# Test 3: Get all data
Write-Host "`n3. Retrieving all data..." -ForegroundColor Yellow
$allData = Invoke-RestMethod -Uri "$API_URL/api/data" -Method Get
Write-Host "Total records: $($allData.Length)"

# Test 4: Get latest data
Write-Host "`n4. Getting latest reading..." -ForegroundColor Yellow
$latest = Invoke-RestMethod -Uri "$API_URL/api/data/latest" -Method Get
$latest | ConvertTo-Json

# Test 5: Get device-specific data
Write-Host "`n5. Getting data for ESP32_TEST device..." -ForegroundColor Yellow
$deviceData = Invoke-RestMethod -Uri "$API_URL/api/data/device/ESP32_TEST" -Method Get
Write-Host "Device records: $($deviceData.Length)"

# Test 6: Get grouped data by device
Write-Host "`n6. Getting data grouped by device..." -ForegroundColor Yellow
$groupedData = Invoke-RestMethod -Uri "$API_URL/api/data/grouped" -Method Get
$groupedData | ConvertTo-Json -Depth 3

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "All tests completed!" -ForegroundColor Green
