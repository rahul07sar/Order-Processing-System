# File Purposes

This document lists the maintained frontend and backend files in this repo and gives a short purpose note for each one.
Generated or environment-specific outputs such as `node_modules`, `.next`, `.venv`, `.pycache`, `.DS_Store`, and `*.tsbuildinfo` are intentionally excluded.

## Backend

### Container and dependency files

- `backend/.dockerignore`: Keeps local backend-only clutter out of Docker build context. This helps image builds stay smaller and more predictable.
- `backend/Dockerfile`: Defines how the backend service image is built and started. It is used by Docker Compose for local development.
- `backend/alembic.ini`: Stores Alembic migration settings and points Alembic at the migration environment.
- `backend/requirements.txt`: Lists Python packages required by the FastAPI backend and migration tooling.

### Application entry and package markers

- `backend/app/__init__.py`: Marks `app/` as a Python package. It allows imports to work cleanly across backend modules.
- `backend/app/main.py`: Creates the FastAPI app, attaches middleware, seeds bootstrap state, and starts the order status scheduler.

### API layer

- `backend/app/api/__init__.py`: Marks the API folder as a package. It keeps route imports organized.
- `backend/app/api/deps.py`: Defines shared FastAPI dependencies like current-user lookup and admin/user guards.
- `backend/app/api/router.py`: Collects route modules into one main API router. This is what `main.py` mounts under the API prefix.
- `backend/app/api/routes/__init__.py`: Marks the routes folder as a package for route-module imports.
- `backend/app/api/routes/auth.py`: Exposes registration, login, logout, and current-session endpoints.
- `backend/app/api/routes/health.py`: Provides a lightweight health-check endpoint for service monitoring and quick reachability checks.
- `backend/app/api/routes/orders.py`: Exposes customer and admin order endpoints, including listing, canceling, returning, and status updates.
- `backend/app/api/routes/payments.py`: Handles payment-facing API routes used during checkout or payment simulation.
- `backend/app/api/routes/products.py`: Exposes product catalog endpoints for the storefront UI.

### Core configuration

- `backend/app/core/__init__.py`: Marks the core configuration folder as a package.
- `backend/app/core/config.py`: Loads environment variables into typed application settings and computes resolved runtime values.

### Database layer

- `backend/app/db/__init__.py`: Marks the database folder as a package.
- `backend/app/db/base.py`: Exposes the shared SQLAlchemy declarative base used by ORM models.
- `backend/app/db/init_db.py`: Seeds required bootstrap data, such as the initial admin account, during startup.
- `backend/app/db/models.py`: Defines database ORM models and enums for users, sessions, orders, and order items.
- `backend/app/db/session.py`: Builds the SQLAlchemy engine and session factory used by requests and background jobs.

### Schema layer

- `backend/app/schemas/__init__.py`: Marks the schema folder as a package for clean schema imports.
- `backend/app/schemas/auth.py`: Defines request and response shapes for authentication flows.
- `backend/app/schemas/order.py`: Defines order request and response payloads shared by order APIs.
- `backend/app/schemas/payment.py`: Defines payment-related request and response models.
- `backend/app/schemas/product.py`: Defines product API response models for the catalog.
- `backend/app/schemas/user.py`: Defines serialized user-facing models used by auth and session endpoints.

### Service layer

- `backend/app/services/__init__.py`: Marks the services folder as a package.
- `backend/app/services/auth.py`: Contains authentication business logic such as password checks, session handling, and identity lookup.
- `backend/app/services/order_status_scheduler.py`: Runs the background scheduler that keeps eligible orders moving through timed statuses.
- `backend/app/services/orders.py`: Holds core order business logic, including creation, cancellation, return handling, and status transitions.
- `backend/app/services/payments.py`: Contains payment workflow logic used by checkout and payment APIs.
- `backend/app/services/products.py`: Contains product catalog lookup and product-related domain logic.
- `backend/app/services/rate_limiter.py`: Provides in-process rate-limiting helpers for registration and login protection.

### Migration system

- `backend/db/migrations/env.py`: Configures Alembic so migrations run with the backend’s current database settings.
- `backend/db/migrations/script.py.mako`: Template Alembic uses when generating new migration files.
- `backend/db/migrations/versions/20260709_0001_create_users_orders_and_sessions.py`: Creates the initial schema for users, sessions, orders, and order items.
- `backend/db/migrations/versions/20260710_0002_add_returned_order_status.py`: Extends the order status enum so delivered orders can move into a returned state.

## Frontend

### Container and build files

- `frontend/.dockerignore`: Keeps frontend-only local artifacts out of Docker build context. This avoids noisy image builds.
- `frontend/Dockerfile`: Defines how the Next.js frontend image is built and started under Docker Compose.
- `frontend/next-env.d.ts`: Declares Next.js TypeScript environment types so editor and compiler support stays correct.
- `frontend/next.config.mjs`: Stores Next.js runtime configuration, including app-level framework behavior such as rewrites or image settings.
- `frontend/package.json`: Declares frontend scripts, runtime dependencies, and development dependencies.
- `frontend/package-lock.json`: Locks exact frontend dependency versions for repeatable installs.
- `frontend/tsconfig.json`: Defines TypeScript compiler settings for the frontend codebase.

### App shell and middleware

- `frontend/middleware.ts`: Runs request-time frontend middleware logic before pages resolve. It is typically used for routing or auth-aware behavior.
- `frontend/pages/_app.tsx`: Wraps all Pages Router screens with shared providers and global application shell logic.
- `frontend/src/app/layout.tsx`: Defines the App Router layout shell for `src/app` screens. It gives shared HTML and provider structure if that side of Next.js is used.
- `frontend/src/app/globals.css`: Holds global styles for the `src/app` side of the frontend.
- `frontend/src/components/theme-provider.tsx`: Wraps `next-themes` so the app can switch between light and dark mode consistently.
- `frontend/src/components/theme-toggle.tsx`: Provides a simple reusable theme toggle component for App Router-oriented UI.

### Shared frontend components

- `frontend/components/auth-session-shell.tsx`: Provides a shared authenticated layout or session wrapper for screens that need current-user context.
- `frontend/components/site_header.tsx`: Renders the shared site header, navigation, cart button, logout controls, and theme toggle.

### Frontend services and shared types

- `frontend/services/auth_service.ts`: Handles browser-side calls for registration, login, logout, and current-user lookup.
- `frontend/services/cart_service.ts`: Manages local cart state and cart utility helpers on the client.
- `frontend/services/checkout_service.ts`: Handles checkout requests and payment submission flow from the browser.
- `frontend/services/order_service.ts`: Handles order list/detail/cancel/return API calls and order-number formatting helpers.
- `frontend/services/product_catalog_service.ts`: Fetches product catalog data for storefront pages.
- `frontend/services/storefront_types.ts`: Defines shared TypeScript types used across products, cart, checkout, and orders screens.

### Pages Router screens

- `frontend/pages/index.tsx`: Provides the default route entry point and usually redirects or forwards users into the main storefront flow.
- `frontend/pages/home.tsx`: Renders the storefront landing page and product browsing experience.
- `frontend/pages/login.tsx`: Renders the customer login screen and handles sign-in UI behavior.
- `frontend/pages/registration.tsx`: Renders the user registration screen and handles sign-up submission flow.
- `frontend/pages/cart.tsx`: Shows cart contents, totals, and the path into checkout.
- `frontend/pages/payment.tsx`: Renders the checkout or payment screen where orders are submitted.
- `frontend/pages/orders.tsx`: Renders the authenticated orders dashboard, including filters, detail view, cancel flow, and return flow.

### Page styling

- `frontend/css/globals.css`: Holds shared design tokens and baseline styling for Pages Router screens.
- `frontend/css/home.css`: Contains the main storefront and orders-page styling, including shared page-shell visuals.
- `frontend/css/login.css`: Contains styling specific to the login page.
- `frontend/css/registration.css`: Contains styling specific to the registration page.

### Static assets

- `frontend/public/logo.png`: Stores the primary brand/logo image used in the site header.
- `frontend/public/cart.png`: Stores the cart icon shown in the header cart button.
- `frontend/public/toggle/darkmode.png`: Stores the dark-mode toggle icon used when offering a switch into dark theme.
- `frontend/public/toggle/lightmode.png`: Stores the light-mode toggle icon used when offering a switch into light theme.
- `frontend/public/Products/product1.jpg`: Product catalog image asset for one demo storefront item.
- `frontend/public/Products/product2.jpg`: Product catalog image asset for one demo storefront item.
- `frontend/public/Products/product3.jpg`: Product catalog image asset for one demo storefront item.
- `frontend/public/Products/product4.jpg`: Product catalog image asset for one demo storefront item.
- `frontend/public/Products/product5.jpg`: Product catalog image asset for one demo storefront item.
