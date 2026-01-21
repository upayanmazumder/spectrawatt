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

# Continuous monitoring
try:
    print("\n" + "="*90)
    print("LIVE DEVICE MONITORING (Updates every 5 seconds)")
    print("Press Ctrl+C to stop")
    print("="*90 + "\n")
    
    iteration = 0
    while True:
        iteration += 1
        
        # Get current UTC time
        current_utc = datetime.utcnow()
        
        try:
            response = requests.get('https://api.spectrawatt.upayan.dev/api/data', timeout=5)
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
                        # Parse ISO format timestamp
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
                        stale_message = f" (Data is {int(staleness)}s old)"
            
            # Filter readings to only those from the last 5 minutes
            recent_readings = []
            for reading in all_readings:
                timestamp_str = reading.get('timestamp', '')
                try:
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
                
                status = "✅" if not is_stale else "⚠️"
                print(f"\r[{iteration:>4}] {status} 🔌 {predicted_device:<17} | 📊 {confidence*100:>6.2f}% | ⏰ {latest_timestamp} | 🕐 {current_utc.isoformat()}Z", end='', flush=True)
            else:
                print(f"\r[{iteration:>4}] ⏳ Waiting for fresh data... ({len(recent_readings)}/10)", end='', flush=True)
        
        except requests.exceptions.Timeout:
            print(f"\r[{iteration:>4}] ❌ API timeout - retrying...", end='', flush=True)
        except requests.exceptions.RequestException as e:
            print(f"\r[{iteration:>4}] ❌ API error: {str(e)[:30]}", end='', flush=True)
        
        time.sleep(5)
        
except KeyboardInterrupt:
    print("\n\n" + "="*90)
    print("✅ Monitoring stopped")
    print("="*90 + "\n")
        
except Exception as e:
    print(f"\n\n❌ Error: {e}\n")
