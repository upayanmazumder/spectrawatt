.PHONY: build build-api build-dev build-no-cache run run-api run-live run-train test clean logs down help

# Colors for output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[1;33m
NC = \033[0m # No Color

# Default target
help:
	@echo ""
	@echo "Energy Fingerprinting - Docker Commands"
	@echo "======================================="
	@echo ""
	@echo "Build commands:"
	@echo "  $(GREEN)make build$(NC)          - Build production image"
	@echo "  $(GREEN)make build-api$(NC)      - Build API service only"
	@echo "  $(GREEN)make build-dev$(NC)      - Build development image"
	@echo "  $(GREEN)make build-no-cache$(NC) - Build without cache"
	@echo ""
	@echo "Run commands:"
	@echo "  $(GREEN)make run$(NC)            - Run live monitoring (default)"
	@echo "  $(GREEN)make run-api$(NC)        - Run API server on port 8000"
	@echo "  $(GREEN)make run-live$(NC)       - Run live predictions"
	@echo "  $(GREEN)make run-train$(NC)      - Run model training"
	@echo "  $(GREEN)make run-current$(NC)    - Run single prediction"
	@echo "  $(GREEN)make run-dev$(NC)        - Run development shell"
	@echo ""
	@echo "Utility commands:"
	@echo "  $(GREEN)make test$(NC)           - Run tests"
	@echo "  $(GREEN)make logs$(NC)           - View logs"
	@echo "  $(GREEN)make clean$(NC)          - Remove containers and images"
	@echo "  $(GREEN)make down$(NC)           - Stop all services"
	@echo ""
	@echo "Examples:"
	@echo "  $(YELLOW)make build && make run-live$(NC)  - Build and run live monitoring"
	@echo "  $(YELLOW)make run-api$(NC)                 - Start API server"
	@echo ""

# Build commands
build:
	@echo "$(GREEN)Building production image...$(NC)"
	docker compose build

build-api:
	@echo "$(GREEN)Building API image...$(NC)"
	docker compose build energy-api

build-dev:
	@echo "$(GREEN)Building development image...$(NC)"
	docker compose --profile dev build

build-no-cache:
	@echo "$(GREEN)Building without cache...$(NC)"
	docker compose build --no-cache

# Run commands
run:
	@echo "$(GREEN)Running live monitoring...$(NC)"
	docker compose --profile live up

run-api:
	@echo "$(GREEN)Starting API server on port 8000...$(NC)"
	docker compose --profile api up energy-api

run-live:
	@echo "$(GREEN)Running live predictions...$(NC)"
	docker compose --profile live up energy-live

run-train:
	@echo "$(GREEN)Running model training...$(NC)"
	docker compose --profile train up energy-train

run-current:
	@echo "$(GREEN)Running single prediction...$(NC)"
	docker compose --profile current up energy-current

run-dev:
	@echo "$(GREEN)Starting development shell...$(NC)"
	docker compose --profile dev run --rm energy-train /bin/bash

# Test command
test:
	@echo "$(GREEN)Running tests...$(NC)"
	docker compose --profile dev run --rm energy-train pytest tests/ -v

# Utility commands
logs:
	@echo "$(GREEN)Viewing logs (Ctrl+C to exit)...$(NC)"
	docker compose logs -f

clean:
	@echo "$(RED)Cleaning up containers, images, and volumes...$(NC)"
	docker compose down -v --rmi local
	docker system prune -f

down:
	@echo "$(YELLOW)Stopping all services...$(NC)"
	docker compose down

