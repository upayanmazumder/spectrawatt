import json
import yaml
from pathlib import Path
from typing import List, Dict, Any

# Import our modules
from src.data_loader import load_power_data
from src.delta_power import compute_delta_power
from src.event_detector import detect_events
from src.event_table import create_event_table
from src.clustering import cluster_events

def run_clustering_pipeline(input_file: str, 
                          threshold: float = 30.0,  
                          eps: float = 30.0,
                          min_samples: int = 3) -> None:
    """Run the clustering pipeline end-to-end."""
    # 1. Load and preprocess data
    print("Loading data...")
    df = load_power_data(input_file)
    
    # 2. Compute power changes
    print("Computing power changes...")
    delta_p = compute_delta_power(df['power'].tolist())
    
    # 3. Detect events
    print("Detecting events...")
    events = detect_events(df['timestamp'].tolist(), delta_p, threshold)
    
    # 4. Create event table
    print("Creating event table...")
    event_table = create_event_table(events)
    
    # 5. Cluster events
    print("Clustering events...")
    labels = cluster_events(event_table, eps=eps, min_samples=min_samples)
    
    # Add cluster IDs to events
    for event, label in zip(event_table, labels):
        event['cluster_id'] = int(label)  # Convert numpy int to Python int for JSON serialization
    
    # 6. Save results
    output_dir = Path("data")
    output_dir.mkdir(exist_ok=True)
    
    # Save event table with cluster IDs
    with open(output_dir / 'clustered_events.json', 'w') as f:
        json.dump(event_table, f, default=str)
    
    # Generate cluster statistics
    cluster_stats = {}
    for event in event_table:
        cluster_id = event['cluster_id']
        if cluster_id not in cluster_stats:
            cluster_stats[cluster_id] = {
                'count': 0,
                'avg_power_change': 0.0,
                'min_power_change': float('inf'),
                'max_power_change': -float('inf')
            }
        
        stats = cluster_stats[cluster_id]
        power = event['abs_delta_p']
        
        stats['count'] += 1
        stats['avg_power_change'] = (stats['avg_power_change'] * (stats['count'] - 1) + power) / stats['count']
        stats['min_power_change'] = min(stats['min_power_change'], power)
        stats['max_power_change'] = max(stats['max_power_change'], power)
    
    # Save cluster statistics
    with open(output_dir / 'cluster_stats.json', 'w') as f:
        json.dump(cluster_stats, f, indent=2)
    
    print("\nClustering complete!")
    print(f"Found {len(cluster_stats)} clusters")
    print("\nCluster statistics:")
    for cluster_id, stats in sorted(cluster_stats.items()):
        print(f"\nCluster {cluster_id}:")
        print(f"  Number of events: {stats['count']}")
        print(f"  Avg power change: {stats['avg_power_change']:.2f}W")
        print(f"  Min power change: {stats['min_power_change']:.2f}W")
        print(f"  Max power change: {stats['max_power_change']:.2f}W")
    
    print("\nNext steps:")
    print("1. Check the cluster statistics above")
    print("2. Edit data/cluster_labels.yaml to assign meaningful names to each cluster")
    print("3. Run the training script to train the KNN classifier")

if __name__ == "__main__":
    # Example usage
    input_file = "data/spectrawatt.energy_data.csv"  # Update this to your data file
    run_clustering_pipeline(
        input_file,
        threshold=30.0,  # Adjust based on your data
        eps=30.0,        # Adjust based on your data
        min_samples=3     # Adjust based on your data
    )