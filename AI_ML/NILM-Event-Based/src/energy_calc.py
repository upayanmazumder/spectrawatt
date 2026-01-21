from typing import Dict, List, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass

@dataclass
class DeviceMetrics:
    """Container for device-specific metrics."""
    total_duration: float = 0.0  # in seconds
    total_energy: float = 0.0    # in watt-hours
    usage_count: int = 0
    avg_duration: float = 0.0    # in seconds
    avg_energy: float = 0.0      # in watt-hours

class EnergyCalculator:
    def __init__(self, device_power_ratings: Dict[str, float]):
        """
        Initialize with device power ratings (in watts).
        
        Args:
            device_power_ratings: Dictionary mapping device names to their power ratings
        """
        self.device_power_ratings = device_power_ratings
        
    def calculate_metrics(self, 
                         usage_stats: Dict[str, List[Tuple[datetime, datetime, float]]]
                        ) -> Dict[str, DeviceMetrics]:
        """
        Calculate energy and usage metrics for all devices.
        
        Args:
            usage_stats: Dictionary from StateTracker.get_usage_stats()
            
        Returns:
            Dictionary mapping device names to their metrics
        """
        metrics = {}
        
        for device, events in usage_stats.items():
            if device not in self.device_power_ratings:
                continue
                
            device_metrics = DeviceMetrics()
            power = self.device_power_ratings[device]
            
            for start, end, duration in events:
                # Convert duration from seconds to hours for energy calculation
                hours = duration / 3600
                energy = power * hours
                
                device_metrics.total_duration += duration
                device_metrics.total_energy += energy
                device_metrics.usage_count += 1
            
            # Calculate averages
            if device_metrics.usage_count > 0:
                device_metrics.avg_duration = (device_metrics.total_duration / 
                                             device_metrics.usage_count)
                device_metrics.avg_energy = (device_metrics.total_energy / 
                                           device_metrics.usage_count)
            
            metrics[device] = device_metrics
            
        return metrics