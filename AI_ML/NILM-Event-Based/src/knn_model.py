from typing import List, Dict, Any
import numpy as np
from sklearn.neighbors import KNeighborsClassifier
import yaml
import os

class KNNTrainer:
    def __init__(self, n_neighbors: int = 3):
        """
        Initialize KNN trainer.
        
        Args:
            n_neighbors: Number of neighbors to use for KNN
        """
        self.model = KNeighborsClassifier(n_neighbors=n_neighbors)
        self.label_map = {}
        self.inverse_label_map = {}
        
    def load_labels(self, labels_file: str) -> Dict[int, str]:
        """Load label mapping from YAML file."""
        with open(labels_file, 'r') as f:
            labels = yaml.safe_load(f) or {}
        return {int(k.split('_')[1]): v for k, v in labels.items() if k.startswith('cluster_')}
        
    def train(self, event_table: List[Dict[str, Any]], labels_file: str) -> None:
        """
        Train KNN model using labeled events.
        
        Args:
            event_table: List of event dictionaries with 'abs_delta_p' and 'cluster_id'
            labels_file: Path to YAML file with cluster labels
        """
        # Load label mappings
        self.label_map = self.load_labels(labels_file)
        self.inverse_label_map = {v: k for k, v in self.label_map.items()}
        
        # Prepare features and labels
        X = []
        y = []
        
        for event in event_table:
            cluster_id = event.get('cluster_id')
            if cluster_id in self.label_map and cluster_id != -1:  # Skip noise
                X.append([event['abs_delta_p']])
                y.append(cluster_id)
                
        if not X:
            raise ValueError("No valid labeled data found for training")
            
        # Train the model
        self.model.fit(X, y)
        
    def predict(self, delta_p: float) -> str:
        """
        Predict appliance for a new power change.
        
        Args:
            delta_p: Absolute power change value
            
        Returns:
            Predicted appliance name
        """
        if not self.label_map:
            raise ValueError("Model not trained. Call train() first")
            
        abs_delta_p = abs(delta_p)
        cluster_id = self.model.predict([[abs_delta_p]])[0]
        return self.label_map.get(cluster_id, "Unknown")