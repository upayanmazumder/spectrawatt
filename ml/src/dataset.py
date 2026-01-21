import torch
from torch.utils.data import Dataset
import numpy as np

class EnergyDataset(Dataset):
    def __init__(self, X, y, window_size=30):
        self.X = X
        self.y = y
        self.window_size = window_size

    def __len__(self):
        return len(self.X) - self.window_size

    def __getitem__(self, idx):
        x_window = self.X[idx:idx+self.window_size]
        label = self.y[idx+self.window_size]
        
        return (
            torch.tensor(x_window, dtype=torch.float32),
            torch.tensor(label, dtype=torch.long)
        )
