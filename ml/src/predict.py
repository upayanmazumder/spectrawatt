import torch
import joblib
import numpy as np
import os
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

    return label_encoder.inverse_transform([pred.item()])[0], confidence.item()


# Test with training data to verify model learned correctly
if __name__ == "__main__":
    # Load training data
    test_data_path = os.path.join(project_root, "data", "spectrawatt.energy_data.csv")
    df = pd.read_csv(test_data_path)
    
    # Get features
    features = ["vrms", "irms", "apparent_power", "wh"]
    X = df[features].values
    y = df["device_id"].values
    
    # Apply irms weighting as in training
    irms_weight = joblib.load(os.path.join(models_dir, "irms_weight.pkl"))
    X = X.copy()
    X[:, 1] = X[:, 1] * irms_weight
    
    # Test on windows of 10 samples (matching training - predict y[i+window_size])
    window_size = 10
    print(f"Testing on training data (windows of {window_size} samples):\n")
    
    correct = 0
    total = 0
    
    for i in range(len(df) - window_size):
        # Get window [i:i+window_size] and predict y[i+window_size]
        test_window = X[i:i+window_size]
        # In dataset.py: label = self.y[idx+self.window_size]
        actual_device = y[i + window_size]
        
        predicted_device, confidence = predict_device(test_window)
        
        is_correct = predicted_device == actual_device
        if is_correct:
            correct += 1
        total += 1
        
        if total <= 20 or not is_correct:  # Show first 20 and all wrong predictions
            status = "✓" if is_correct else "✗"
            print(f"Sample {i+1} {status}: window[{i}:{i+window_size}] → y[{i+window_size}] = {actual_device} → pred {predicted_device} ({confidence:.4f})")
    
    accuracy = (correct / total) * 100 if total > 0 else 0
    print(f"\n{'='*50}")
    print(f"Accuracy: {correct}/{total} ({accuracy:.1f}%)")
    print(f"{'='*50}")

