from typing import List, Dict, Any
from datetime import datetime

def create_event_table(events: List[tuple]) -> List[Dict[str, Any]]:
    """
    Convert events into a table of feature vectors.
    
    Args:
        events: List of (timestamp, delta_p) tuples from detect_events()
        
    Returns:
        List of dictionaries, where each dictionary represents an event with features
    """
    event_table = []
    
    for timestamp, delta_p in events:
        event = {
            'timestamp': timestamp,
            'abs_delta_p': abs(delta_p),
            'sign': 1 if delta_p > 0 else -1
        }
        event_table.append(event)
    
    return event_table