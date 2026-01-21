import torch
import joblib
import numpy as np
import os
import requests
import pandas as pd
from model import EnergyFingerprintNet
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
    # Apply irms weight to match training preprocessing
    window = window.copy()
    window[:, 1] = window[:, 1] * irms_weight
    
    window = scaler.transform(window)
    window = torch.tensor(window, dtype=torch.float32).unsqueeze(0)

    with torch.no_grad():
        logits = model(window)
        probs = torch.softmax(logits, dim=1)
        confidence, pred = torch.max(probs, dim=1)

    return label_encoder.inverse_transform([pred.item()])[0], confidence.item(), probs.cpu().numpy()[0]


# Live prediction from API
if __name__ == "__main__":
    api_url = "https://api.spectrawatt.upayan.dev/api/data"
    
    print("\n" + "="*80)
    print("LIVE ENERGY DEVICE FINGERPRINTING")
    print("="*80)
    print("\nMonitoring API for real-time predictions...\n")
    
    last_timestamp = None
    window_size = 10
    device_history = []
    
    try:
        while True:
            try:
                response = requests.get(api_url)
                response.raise_for_status()
                api_data = response.json()
                
                # Parse the nested structure
                all_readings = []
                for device_entry in api_data:
                    device_id = device_entry.get("device_id")
                    readings = device_entry.get("data", [])
                    
                    for reading in readings:
                        reading["device_id"] = device_id
                        all_readings.append(reading)
                
                df = pd.DataFrame(all_readings)
                
                if len(df) < window_size:
                    print(f"Waiting for more data... ({len(df)}/{window_size} readings)")
                    time.sleep(1)
                    continue
                
                # Get required features
                features = ["vrms", "irms", "apparent_power", "wh"]
                X = df[features].values
                
                # Make prediction on the last window
                test_window = X[-window_size:]
                predicted_device, confidence, probs = predict_device(test_window)
                
                # Get all class probabilities
                print(f"\n{'='*80}")
                print(f"CURRENT PREDICTION (Last {window_size} readings)")
                print(f"{'='*80}")
                print(f"\n🔌 Device Detected: {predicted_device}")
                print(f"📊 Confidence: {confidence*100:.2f}%")
                print(f"\nClass Probabilities:")
                for i, class_name in enumerate(label_encoder.classes_):
                    bar_length = int(probs[i] * 40)
                    bar = "█" * bar_length + "░" * (40 - bar_length)
                    print(f"  {class_name:<20} {bar} {probs[i]*100:>6.2f}%")
                
                print(f"\nTotal readings in API: {len(df)}")
                print(f"Data updated at: {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}")
                
                # Store prediction
                device_history.append({
                    'timestamp': pd.Timestamp.now(),
                    'device': predicted_device,
                    'confidence': confidence
                })
                
                # Keep only last 100 predictions
                if len(device_history) > 100:
                    device_history.pop(0)
                
                # Show recent history
                if len(device_history) > 1:
                    recent = device_history[-5:]
                    print(f"\nRecent Predictions (Last 5):")
                    for i, pred in enumerate(recent, 1):
                        print(f"  {i}. {pred['device']} ({pred['confidence']*100:.1f}%)")
                
                print(f"{'='*80}\n")
                
                # Poll every 2 seconds
                time.sleep(2)
                
            except requests.exceptions.RequestException as e:
                print(f"⚠️  API Error: {e}")
                print("Retrying in 5 seconds...\n")
                time.sleep(5)
            except Exception as e:
                print(f"⚠️  Error: {e}")
                print("Retrying in 5 seconds...\n")
                time.sleep(5)
    
    except KeyboardInterrupt:
        print("\n\n" + "="*80)
        print("Monitoring stopped by user")
        if device_history:
            print(f"\nSession Summary:")
            print(f"  Total predictions: {len(device_history)}")
            df_history = pd.DataFrame(device_history)
            print(f"  Most common device: {df_history['device'].mode()[0] if len(df_history) > 0 else 'N/A'}")
            print(f"  Average confidence: {df_history['confidence'].mean()*100:.2f}%")
        print("="*80 + "\n")
