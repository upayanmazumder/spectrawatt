import pandas as pd
from typing import List

def compute_delta_power(power_series: List[float]) -> List[float]:
    """
    Compute the difference in power between consecutive readings.
    
    Args:
        power_series: List of power measurements [P(0), P(1), ..., P(N-1)]
        
    Returns:
        List of power differences [ΔP(0)=0, ΔP(1), ..., ΔP(N-1)]
        where ΔP(t) = P(t) - P(t-1) and ΔP(0) = 0
    """
    delta_p = [0.0]  # First difference is 0 (no previous value)
    
    for t in range(1, len(power_series)):
        delta_p.append(power_series[t] - power_series[t-1])
    
    return delta_p