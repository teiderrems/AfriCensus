.PHONY: help up down build logs backend-dev frontend-dev reset-db seed-db make-migrations migrate

help:
	@echo "AfriCensus Makefile"
	@echo ""
	@echo "Docker commands:"
	@echo "  make up                - Start all services (docker compose)"
	@echo "  make down              - Stop all services"
	@echo "  make build             - Build or rebuild services"
	@echo "  make logs              - View output from containers"
	@echo ""
	@echo "Local Development:"
	@echo "  make backend-dev       - Run backend dev server locally (requires poetry)"
	@echo "  make frontend-dev      - Run frontend dev server locally (requires npm)"
	@echo ""
	@echo "Database & Migrations (run inside backend folder):"
	@echo "  make reset-db          - Reset database, drop tables, and run migrations"
	@echo "  make seed-db           - Seed default data without dropping tables"
	@echo "  make make-migrations   - Generate a new migration (Usage: make make-migrations msg=\"Your message\")"
	@echo "  make migrate           - Apply pending migrations"

up:
	wsl docker compose up -d

down:
	wsl docker compose down

build:
	wsl docker compose build

logs:
	wsl docker compose logs -f

backend-dev:
	cd backend && poetry run africensus-api

frontend-dev:
	cd frontend && npm start

reset-db:
	cd backend && poetry run africensus-reset

seed-db:
	cd backend && poetry run africensus-seed

make-migrations:
	@if [ -z "$(msg)" ]; then echo "Error: Please provide a message. Example: make make-migrations msg=\"add table\""; exit 1; fi
	cd backend && poetry run africensus-makemigrations "$(msg)"

migrate:
	cd backend && poetry run africensus-migrate
