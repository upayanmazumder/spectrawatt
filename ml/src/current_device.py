import torch
import joblib
import numpy as np
import os
import requests
from model import EnergyFingerprintNet
from datetime import datetime
import time
import sys

# Set paths relative to project root
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
models_dir = os.path.join(project_root, "models")

scaler = joblib.load(os.path.join(models_dir, "scaler.pkl"))
label_encoder = joblib.load(os.path.join(models_dir, "label_encoder.pkl"))
irms_weight = joblib.load(os.path.join(models_dir, "irms_weight.pkl"))

model = EnergyFingerprintNet(num_classes=len(label_encoder.classes_))
model.load_state_dict(torch.load(os.path.join(models_dir, "energy_model.pt")))
model.eval()

def predict_device(window):
    window = window.copy()
    window[:, 1] = window[:, 1] * irms_weight
    window = scaler.transform(window)
    window = torch.tensor(window, dtype=torch.float32).unsqueeze(0)

    with torch.no_grad():
        logits = model(window)
        probs = torch.softmax(logits, dim=1)
        confidence, pred = torch.max(probs, dim=1)

    return label_encoder.inverse_transform([pred.item()])[0], confidence.item()

# Fetch latest data
try:
    # Get current UTC time
    current_utc = datetime.utcnow()
    
    response = requests.get('https://api.spectrawatt.upayan.dev/api/data')
    api_data = response.json()
    
    all_readings = []
    for device_entry in api_data:
        device_id = device_entry.get("device_id")
        readings = device_entry.get("data", [])
        
        for reading in readings:
            reading["device_id"] = device_id
            all_readings.append(reading)
    
    # Check if API data is stale (latest reading older than 2 minutes)
    is_stale = False
    stale_message = ""
    
    if all_readings:
        # Find the MOST RECENT reading by comparing all timestamps
        most_recent_reading = None
        most_recent_time = None
        
        for reading in all_readings:
            timestamp_str = reading.get('timestamp', '')
            try:
                reading_time = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                if most_recent_time is None or reading_time > most_recent_time:
                    most_recent_time = reading_time
                    most_recent_reading = reading
            except:
                pass
        
        if most_recent_time:
            staleness = (current_utc - most_recent_time.replace(tzinfo=None)).total_seconds()
            
            if staleness > 120:  # More than 2 minutes old
                is_stale = True
                stale_message = f" (⚠️ Data is {int(staleness)}s old - API may be lagging)"
    
    # Filter readings to only those from the last 5 minutes (matching current time)
    recent_readings = []
    for reading in all_readings:
        timestamp_str = reading.get('timestamp', '')
        try:
            # Parse ISO format timestamp (e.g., 2026-01-20T23:49:34.854Z)
            reading_time = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            time_diff = (current_utc - reading_time.replace(tzinfo=None)).total_seconds()
            
            # Keep readings from last 5 minutes
            if 0 <= time_diff <= 300:
                recent_readings.append(reading)
        except:
            pass
    
    # Get last 10 readings from recent set
    if len(recent_readings) >= 10:
        recent_readings = recent_readings[-10:]
        features = ["vrms", "irms", "apparent_power", "wh"]
        X = np.array([[r[f] for f in features] for r in recent_readings])
        
        predicted_device, confidence = predict_device(X)
        
        # Get timestamp from latest reading
        latest_timestamp = recent_readings[-1].get('timestamp', 'N/A')
        
        print("\n" + "="*70)
        print("CURRENT DEVICE (LIVE)")
        print("="*70)
        print(f"🔌 Device: {predicted_device}")
        print(f"📊 Confidence: {confidence*100:.2f}%")
        print(f"⏰ Latest Reading UTC: {latest_timestamp}")
        print(f"🕐 Current UTC: {current_utc.isoformat()}Z")
        print(f"📊 Readings used: {len(recent_readings)} (last 5 minutes)")
        
        if is_stale:
            print(f"\n⚠️  WARNING: API data is stale{stale_message}")
            print("   The API may not have received new readings recently.")
            print("   Prediction may not reflect current device state.")
        
        print("="*70 + "\n")
    else:
        print(f"\n⚠️  No recent readings found in last 5 minutes")
        print(f"   Current UTC: {current_utc.isoformat()}Z")
        print(f"   Readings available: {len(recent_readings)}")
        
        if is_stale:
            print(f"\n⚠️  STALE DATA: Latest API reading is {int(staleness)}s old")
            print("   Try switching devices or wait for fresh data.")
        
        print(f"   Try again in a moment...\n")
        
except Exception as e:
    print(f"Error: {e}")
