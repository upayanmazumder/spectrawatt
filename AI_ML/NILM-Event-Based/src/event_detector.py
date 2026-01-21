from typing import List, Tuple
from datetime import datetime

def detect_events(timestamps: List[datetime], delta_p: List[float], threshold: float) -> List[Tuple[datetime, float]]:
    """
    Detect significant power change events based on a threshold.
    
    Args:
        timestamps: List of datetime objects corresponding to each measurement
        delta_p: List of power differences (ΔP) from compute_delta_power
        threshold: Minimum absolute power change to consider as an event (in watts)
        
    Returns:
        List of tuples containing (timestamp, delta_p) for each detected event
    """
    events = []
    
    for t, dp in zip(timestamps, delta_p):
        if abs(dp) > threshold:
            events.append((t, dp))
    
    return events