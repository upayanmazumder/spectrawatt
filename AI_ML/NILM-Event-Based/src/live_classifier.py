from typing import Optional
from .knn_model import KNNTrainer

class LiveClassifier:
    def __init__(self, knn_trainer: KNNTrainer):
        """
        Initialize the live classifier with a trained KNN model.
        
        Args:
            knn_trainer: Pre-trained KNNTrainer instance
        """
        self.knn = knn_trainer
        
    def classify_event(self, delta_p: float) -> str:
        """
        Classify a new power change event in real-time.
        
        Args:
            delta_p: The power change value (can be positive or negative)
            
        Returns:
            str: Predicted device name or "Unknown" if classification fails
        """
        try:
            return self.knn.predict(delta_p)
        except Exception as e:
            print(f"Classification error: {e}")
            return "Unknown"