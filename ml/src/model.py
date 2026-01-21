import torch.nn as nn
import torch


class EnergyFingerprintNet(nn.Module):
    def __init__(self, input_size=4, hidden_size=128, num_classes=3):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size,
            hidden_size,
            batch_first=True,
            bidirectional=True
        )
        self.fc1 = nn.Linear(hidden_size * 2, 64)
        self.dropout = nn.Dropout(0.3)
        self.fc2 = nn.Linear(64, num_classes)

    def forward(self, x):
        _, (h_n, _) = self.lstm(x)
        h = torch.cat((h_n[-2], h_n[-1]), dim=1)
        h = self.dropout(self.fc1(h))
        return self.fc2(h)

