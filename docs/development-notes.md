# Development Notes

## Database Migrations

Schema changes must go through the migration files in `backend/db/migrations/versions/`.

Project note:
This project is intended to be used by other developers, so database tables must not rely on implicit startup creation. Apply migrations explicitly before using the backend against a fresh database.

Current workflow:
- Start PostgreSQL.
- Run `alembic -c alembic.ini upgrade head` from `backend/`.
- Start or restart the backend after migrations complete.
- Route frontend browser calls through the Next.js `/api` rewrite and keep the real backend target in `API_PROXY_TARGET`, not in page code.

## Service Boundary Note

The current code should keep clean domain boundaries so the system can later split into dedicated `USER`, `ORDER`, `PRODUCT`, and `PAYMENT` services without rewriting core contracts.
