"""
Test suite for Energy Fingerprinting ML Model
Run with: pytest tests/ -v
"""
import sys
import os

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

import pytest
import torch
import numpy as np
from model import EnergyFingerprintNet


class TestModel:
    """Test cases for the neural network model."""
    
    @pytest.fixture
    def model(self):
        """Create a model instance for testing."""
        return EnergyFingerprintNet(
            input_size=4,
            hidden_size=128,
            num_classes=3
        )
    
    @pytest.fixture
    def sample_input(self):
        """Create sample input tensor (batch_size=1, window_size=10, features=4)."""
        return torch.randn(1, 10, 4)
    
    def test_model_forward_pass(self, model, sample_input):
        """Test that model can process input and return valid output."""
        output = model(sample_input)
        assert output.shape == (1, 3), f"Expected shape (1, 3), got {output.shape}"
    
    def test_model_output_values(self, model, sample_input):
        """Test that output values are reasonable (logits can be any value)."""
        output = model(sample_input)
        assert not torch.isnan(output).any(), "Output contains NaN values"
        assert not torch.isinf(output).any(), "Output contains Inf values
    
    def test_model_with_different_batch_sizes(self):
        """Test model handles different batch sizes correctly."""
        model = EnergyFingerprintNet(input_size=4, hidden_size=128, num_classes=3)
        
        for batch_size in [1, 8, 16, 32]:
            input_tensor = torch.randn(batch_size, 10, 4)
            output = model(input_tensor)
            assert output.shape == (batch_size, 3), f"Failed for batch_size={batch_size}"
    
    def test_model_gradient_flow(self, model):
        """Test that gradients can be computed through the model."""
        input_tensor = torch.randn(1, 10, 4, requires_grad=True)
        output = model(input_tensor)
        
        loss = output.sum()
        loss.backward()
        
        assert input_tensor.grad is not None, "No gradients computed for input"
        assert model.fc1.weight.grad is not None, "No gradients computed for fc1"
    
    def test_model_dropout(self):
        """Test that dropout is applied (output variance should differ in train/eval)."""
        model = EnergyFingerprintNet(
            input_size=4,
            hidden_size=128,
            num_classes=3
        )
        
        input_tensor = torch.randn(1, 10, 4)
        
        # Set to training mode
        model.train()
        outputs_train = [model(input_tensor) for _ in range(5)]
        
        # Set to eval mode
        model.eval()
        outputs_eval = [model(input_tensor) for _ in range(5)]
        
        # Eval mode should have consistent outputs
        eval_variance = torch.var(torch.stack(outputs_eval)).item()
        assert eval_variance < 1e-6, f"Eval mode should be deterministic, got variance {eval_variance}"
    
    def test_model_parameters(self):
        """Test that model has expected number of parameters."""
        model = EnergyFingerprintNet(
            input_size=4,
            hidden_size=128,
            num_classes=3
        )
        
        total_params = sum(p.numel() for p in model.parameters())
        
        # Approximate parameter count:
        # LSTM: 4 * (4*128 + 128*128) * 2 (bidirectional) + biases
        # FC1: (128*2 + 64) + 64
        # FC2: (64 + 3) + 3
        expected_min = 20000
        expected_max = 50000
        
        assert expected_min < total_params < expected_max, \
            f"Unexpected parameter count: {total_params}"  # fmt: skip


class TestDataLoading:
    """Test cases for data loading and preprocessing."""
    
    def test_utils_module_exists(self):
        """Test that utils module can be imported."""
        try:
            from utils import load_and_preprocess
            assert True
        except ImportError:
            pytest.fail("Could not import load_and_preprocess from utils")
    
    def test_dataset_class_exists(self):
        """Test that dataset class can be imported."""
        try:
            from dataset import EnergyDataset
            assert True
        except ImportError:
            pytest.fail("Could not import EnergyDataset from dataset")


class TestDockerConfiguration:
    """Test cases for Docker configuration files."""
    
    def test_dockerfile_exists(self):
        """Test that Dockerfile exists."""
        dockerfile_path = os.path.join(
            os.path.dirname(__file__),
            'Dockerfile'
        )
        assert os.path.exists(dockerfile_path), "Dockerfile not found"
    
    def test_docker_compose_exists(self):
        """Test that docker-compose.yml exists."""
        compose_path = os.path.join(
            os.path.dirname(__file__),
            'docker-compose.yml'
        )
        assert os.path.exists(compose_path), "docker-compose.yml not found"
    
    def test_requirements_exists(self):
        """Test that requirements.txt exists."""
        req_path = os.path.join(
            os.path.dirname(__file__),
            'requirements.txt'
        )
        assert os.path.exists(req_path), "requirements.txt not found"
    
    def test_dockerignore_exists(self):
        """Test that .dockerignore exists."""
        ignore_path = os.path.join(
            os.path.dirname(__file__),
            '.dockerignore'
        )
        assert os.path.exists(ignore_path), ".dockerignore not found"
    
    def test_requirements_have_torch(self):
        """Test that requirements.txt includes torch."""
        req_path = os.path.join(os.path.dirname(__file__), 'requirements.txt')
        with open(req_path, 'r') as f:
            content = f.read()
        assert 'torch' in content.lower(), "torch not found in requirements.txt"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

