# Makefile for Recommendations API

.PHONY: help build run stop clean test lint format check-deps dev prod logs shell

# Variables
COMPOSE_FILE = docker-compose.yml
COMPOSE_PROD_FILE = docker-compose.prod.yml
IMAGE_NAME = recommendations-api
CONTAINER_NAME = recommendations-api

# Default target
help: ## Show this help message
	@echo "Recommendations API - Available commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Development commands
build: ## Build Docker images
	docker-compose -f $(COMPOSE_FILE) build

run: ## Run the application in development mode
	docker-compose -f $(COMPOSE_FILE) up -d

dev: ## Run with development profile (includes Redis Commander)
	docker-compose -f $(COMPOSE_FILE) --profile dev up -d

stop: ## Stop all services
	docker-compose -f $(COMPOSE_FILE) down

clean: ## Stop and remove containers, networks, and volumes
	docker-compose -f $(COMPOSE_FILE) down -v --remove-orphans
	docker system prune -f

# Production commands
prod-build: ## Build for production
	docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_PROD_FILE) build

prod-run: ## Run in production mode
	docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_PROD_FILE) up -d

prod-stop: ## Stop production services
	docker-compose -f $(COMPOSE_FILE) -f $(COMPOSE_PROD_FILE) down

# Logs and monitoring
logs: ## Show application logs
	docker-compose -f $(COMPOSE_FILE) logs -f api

logs-redis: ## Show Redis logs
	docker-compose -f $(COMPOSE_FILE) logs -f redis

logs-all: ## Show all service logs
	docker-compose -f $(COMPOSE_FILE) logs -f

# Development utilities
shell: ## Get shell access to API container
	docker-compose -f $(COMPOSE_FILE) exec api bash

shell-redis: ## Get shell access to Redis container
	docker-compose -f $(COMPOSE_FILE) exec redis sh

redis-cli: ## Connect to Redis CLI
	docker-compose -f $(COMPOSE_FILE) exec redis redis-cli

# Testing and quality
test: ## Run tests inside container
	docker-compose -f $(COMPOSE_FILE) exec api python -m pytest tests/ -v

test-build: ## Build and run tests
	docker-compose -f $(COMPOSE_FILE) run --rm api python -m pytest tests/ -v

lint: ## Run linting
	docker-compose -f $(COMPOSE_FILE) exec api python -m flake8 app/ research/

format: ## Format code with black
	docker-compose -f $(COMPOSE_FILE) exec api python -m black app/ research/

type-check: ## Run type checking with mypy
	docker-compose -f $(COMPOSE_FILE) exec api python -m mypy app/ research/

# Health and status
health: ## Check service health
	curl -f http://localhost:8080/health || echo "Service is not healthy"

status: ## Show container status
	docker-compose -f $(COMPOSE_FILE) ps

# Database operations
redis-flush: ## Flush Redis database (WARNING: deletes all data)
	docker-compose -f $(COMPOSE_FILE) exec redis redis-cli FLUSHALL

redis-info: ## Show Redis info
	docker-compose -f $(COMPOSE_FILE) exec redis redis-cli INFO

# Dependency management
check-deps: ## Check for outdated dependencies
	docker-compose -f $(COMPOSE_FILE) exec api pip list --outdated

update-deps: ## Update requirements.txt (run locally)
	pip freeze > requirements.txt

# Backup and restore
backup-redis: ## Backup Redis data
	docker-compose -f $(COMPOSE_FILE) exec redis redis-cli BGSAVE
	docker cp $(shell docker-compose -f $(COMPOSE_FILE) ps -q redis):/data/dump.rdb ./backup-$(shell date +%Y%m%d-%H%M%S).rdb

# Clean up Docker resources
docker-clean: ## Clean up Docker system
	docker system prune -af
	docker volume prune -f

# Reset environment
reset: clean build run ## Reset the entire environment

# Quick development cycle
reload: stop run logs ## Quick reload for development

# Production deployment helpers
deploy-check: ## Check deployment readiness
	@echo "Checking deployment readiness..."
	@test -f .env || (echo "Missing .env file" && exit 1)
	@grep -q "GOOGLE_API_KEY=" .env || (echo "Missing GOOGLE_API_KEY in .env" && exit 1)
	@grep -q "GEMINI_API_KEY=" .env || (echo "Missing GEMINI_API_KEY in .env" && exit 1)
	@echo "Deployment checks passed!"

# Performance testing
load-test: ## Run basic load test (requires Apache Bench)
	ab -n 100 -c 10 http://localhost:8080/health