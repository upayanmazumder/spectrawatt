from typing import Dict, List, Optional, Tuple
from datetime import datetime

class ApplianceState:
    def __init__(self, name: str):
        self.name = name
        self.is_on = False
        self.last_on_time: Optional[datetime] = None
        self.usage_events: List[Tuple[datetime, datetime, float]] = [] # (start, end, duration_seconds)

class StateTracker:
    def __init__(self):
        self.appliances: Dict[str, ApplianceState] = {}
        
    def update_state(self, device_name: str, delta_p: float, timestamp: datetime) -> None:
        """
        Update the state of an appliance based on power change.
        
        Args:
            device_name: Name of the appliance
            delta_p: Power change (positive for ON, negative for OFF)
            timestamp: When the event occurred
        """
        if device_name not in self.appliances:
            self.appliances[device_name] = ApplianceState(device_name)
            
        state = self.appliances[device_name]
        
        if delta_p > 0 and not state.is_on:  # ON event
            state.is_on = True
            state.last_on_time = timestamp
            
        elif delta_p < 0 and state.is_on:  # OFF event
            state.is_on = False
            if state.last_on_time:
                duration = (timestamp - state.last_on_time).total_seconds()
                state.usage_events.append((state.last_on_time, timestamp, duration))
                state.last_on_time = None
                
    def get_usage_stats(self) -> Dict[str, List[Tuple[datetime, datetime, float]]]:
        """
        Get usage statistics for all appliances.
        
        Returns:
            Dictionary mapping device names to lists of (start_time, end_time, duration_seconds) tuples
        """
        return {name: state.usage_events for name, state in self.appliances.items()}