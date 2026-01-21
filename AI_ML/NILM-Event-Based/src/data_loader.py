import pandas as pd
from typing import List, Dict, Any

def load_power_data(file_path: str) -> pd.DataFrame:
    """
    Load and clean power data from a file.
    
    Args:
        file_path: Path to input file (CSV or JSON)
        
    Returns:
        DataFrame with columns: timestamp, power
    """
    # Read file
    if file_path.endswith('.csv'):
        df = pd.read_csv(file_path)
    elif file_path.endswith('.json'):
        df = pd.read_json(file_path)
    else:
        raise ValueError("File must be .csv or .json")
    
    # Ensure required columns exist
    if not {'timestamp', 'power'}.issubset(df.columns):
        raise ValueError("Input must contain 'timestamp' and 'power' columns")
    
    # Convert timestamp to datetime and sort
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values('timestamp')
    
    # Handle missing values
    df = df.dropna(subset=['power'])
    df['power'] = pd.to_numeric(df['power'])
    
    return df[['timestamp', 'power']]