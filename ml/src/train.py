import torch
import os
import numpy as np
from torch.utils.data import DataLoader
from dataset import EnergyDataset
from model import EnergyFingerprintNet
from utils import load_and_preprocess

# Set paths relative to project root
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
data_path = os.path.join(project_root, "data", "spectrawatt.energy_data.csv")

X, y, classes = load_and_preprocess(data_path)

dataset = EnergyDataset(X, y, window_size=10)
loader = DataLoader(dataset, batch_size=32, shuffle=True)

device = torch.device("cpu")
model = EnergyFingerprintNet(input_size=4, num_classes=len(classes)).to(device)

# Calculate class weights to handle imbalance
class_counts = np.bincount(y)
class_weights = len(y) / (len(classes) * class_counts)
class_weights = torch.tensor(class_weights, dtype=torch.float32).to(device)

criterion = torch.nn.CrossEntropyLoss(weight=class_weights)
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

best_loss = float('inf')
patience = 25
patience_counter = 0

for epoch in range(300):
    total_loss = 0
    for xb, yb in loader:
        xb, yb = xb.to(device), yb.to(device)
        optimizer.zero_grad()
        preds = model(xb)
        loss = criterion(preds, yb)
        loss.backward()
        optimizer.step()
        total_loss += loss.item()

    avg_loss = total_loss / len(loader)
    print(f"Epoch {epoch+1} | Loss: {avg_loss:.4f}")
    
    # Early stopping
    if avg_loss < best_loss:
        best_loss = avg_loss
        patience_counter = 0
        torch.save(model.state_dict(), os.path.join(project_root, "models", "energy_model.pt"))
    else:
        patience_counter += 1
        if patience_counter >= patience:
            print(f"Early stopping at epoch {epoch+1}")
            break

model_path = os.path.join(project_root, "models", "energy_model.pt")
print("✅ Model saved (best checkpoint)")
print(f"Best loss achieved: {best_loss:.4f}")
