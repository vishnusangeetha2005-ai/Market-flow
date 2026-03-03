.PHONY: dev build test lint migrate

dev:
	docker-compose -f docker-compose.dev.yml up

build:
	docker-compose build

test:
	cd backend && pytest --cov=app -v
	cd frontend && npm test

lint:
	cd backend && ruff check . && ruff format --check .
	cd frontend && npm run lint && npm run type-check

migrate:
	docker-compose exec backend alembic upgrade head

stop:
	docker-compose down

clean:
	docker-compose down -v
