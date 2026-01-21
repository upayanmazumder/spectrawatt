import torch
import joblib
import numpy as np
import os
import requests
import pandas as pd
from model import EnergyFingerprintNet

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


# Fetch data from API
if __name__ == "__main__":
    api_url = "https://api.spectrawatt.upayan.dev/api/data"
    
    print("Fetching data from API...")
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
        
        print(f"Received {len(df)} total readings from {len(api_data)} devices\n")
        print("Data columns:", df.columns.tolist())
        print("\nFirst few rows:")
        print(df.head())
        
        # Get required features
        features = ["vrms", "irms", "apparent_power", "wh"]
        
        # Check if all features are present
        missing_features = [f for f in features if f not in df.columns]
        if missing_features:
            print(f"\nWarning: Missing features: {missing_features}")
            print("Available columns:", df.columns.tolist())
        else:
            # Make predictions on windows of 10 samples
            window_size = 10
            X = df[features].values
            actual_devices = df["device_id"].values
            
            # Filter to only the 3 trained devices
            trained_devices = ['Bulb-100w', 'Bulb-60w', 'Soldering-Iron']
            mask = df["device_id"].isin(trained_devices)
            X = X[mask]
            actual_devices = actual_devices[mask]
            
            print(f"\n\nMaking predictions (window size: {window_size}):\n")
            print("="*80)
            print(f"{'Window':<10} {'Status':<8} {'Actual Device':<20} {'Predicted':<20} {'Confidence':<12}")
            print("="*80)
            
            import sys
            correct_count = 0
            total = 0
            
            for i in range(len(X) - window_size):
                # Get window of 10 samples
                test_window = X[i:i+window_size]
                actual_device = actual_devices[i+window_size]
                
                predicted_device, confidence, probs = predict_device(test_window)
                
                is_correct = predicted_device == actual_device
                if is_correct:
                    correct_count += 1
                total += 1
                
                status = "✓ PASS" if is_correct else "✗ FAIL"
                
                # Live output
                print(f"{i+1:<10} {status:<8} {actual_device:<20} {predicted_device:<20} {confidence:>10.4f}")
                sys.stdout.flush()
            
            print("="*80)
            if total > 0:
                accuracy = (correct_count / total) * 100
                print(f"\n✓ Total Accuracy: {correct_count}/{total} ({accuracy:.1f}%)")
                print(f"✓ Correct: {correct_count} | ✗ Incorrect: {total - correct_count}")
            print("="*80)
            
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data from API: {e}")
    except Exception as e:
        print(f"Error processing data: {e}")
        import traceback
        traceback.print_exc()
