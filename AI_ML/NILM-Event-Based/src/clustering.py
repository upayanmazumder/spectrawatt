from typing import List, Dict, Any
import numpy as np
from sklearn.cluster import DBSCAN

def cluster_events(event_table: List[Dict[str, Any]], eps: float = 30.0, min_samples: int = 3) -> List[int]:
    """
    Cluster events based on their absolute power changes.
    
    Args:
        event_table: List of event dictionaries from create_event_table()
        eps: Maximum distance between two samples for them to be in the same cluster
        min_samples: Number of samples in a neighborhood for a point to be a core point
        
    Returns:
        List of cluster labels (-1 for noise)
    """
    # Extract features for clustering (just abs_delta_p in this simple case)
    X = np.array([[event['abs_delta_p']] for event in event_table])
    
    # Use DBSCAN for clustering
    clustering = DBSCAN(eps=eps, min_samples=min_samples).fit(X)
    
    return clustering.labels_.tolist()