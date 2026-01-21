import pandas as pd
from sklearn.preprocessing import LabelEncoder, StandardScaler
import joblib
import os
import numpy as np

def load_and_preprocess(csv_path):
    df = pd.read_csv(csv_path)
    
    # Filter out Sonnet and Chitrita-PC - only keep Bulb-100w, Bulb-60w, Soldering-Iron
    df = df[~df['device_id'].isin(['Sonnet', 'Chitrita-PC'])].reset_index(drop=True)

    features = ["vrms", "irms", "apparent_power", "wh"]
    X = df[features].values

    # Amplify irms (column index 1) since it's more distinctive per device
    # Multiply irms by 3 to give it more weight in the model
    irms_weight = 3.0
    X[:, 1] = X[:, 1] * irms_weight

    scaler = StandardScaler()
    X = scaler.fit_transform(X)

    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(df["device_id"])

    # Get project root from csv path
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(csv_path)))
    models_dir = os.path.join(project_root, "models")
    os.makedirs(models_dir, exist_ok=True)
    
    joblib.dump(scaler, os.path.join(models_dir, "scaler.pkl"))
    joblib.dump(label_encoder, os.path.join(models_dir, "label_encoder.pkl"))
    joblib.dump(irms_weight, os.path.join(models_dir, "irms_weight.pkl"))
    return X, y, label_encoder.classes_

