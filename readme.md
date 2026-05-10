<div align="center">

<img src="https://img.shields.io/badge/Flask-3.x-black?style=for-the-badge&logo=flask" />
<img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react" />
<img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql" />
<img src="https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis" />
<img src="https://img.shields.io/badge/Celery-5-37814A?style=for-the-badge&logo=celery" />
<img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker" />
<img src="https://img.shields.io/badge/ReportLab-PDF-orange?style=for-the-badge" />

# Traveloop

### Plan smarter. Travel better.

The all-in-one travel planning workspace for itineraries, budgets, packing, real-time collaboration, AI-style suggestions, and PDF exports.

[Overview](#overview) - [Features](#features) - [Architecture](#architecture) - [Database](#database) - [API](#api) - [Security](#security) - [Scalability](#scalability) - [Setup](#setup) - [Project Structure](#project-structure)

</div>

---

## Overview

Traveloop brings the full trip-planning workflow into one app. Instead of splitting your plan across a document, spreadsheet, notes app, and chat threads, you can create a trip, add stops, schedule activities, track spending, manage packing, write journal notes, and share the result with a single link.

It is built as a full-stack system: a React frontend talks to a Flask API, data is stored in PostgreSQL, shared state and caches live in Redis, and heavier work such as PDF generation and budget analysis can run in Celery workers.

## Features

### Core Planning Workflow

**Trip Management**  
Create, edit, and delete trips with names, dates, descriptions, and optional cover images. Each trip acts as a self-contained workspace for stops, activities, expenses, notes, and packing items.

**Itinerary Builder**  
Add cities as stops in any order, then expand each stop to browse and schedule local activities from the catalog. Cost and duration are shown for every activity so planning stays realistic, and stop locking prevents two collaborators from editing the same stop at once.

**Budget Tracker**  
Track both activity costs pulled from the itinerary and manual expenses such as transport, accommodation, and food. The breakdown includes per-category totals, visual progress bars, and a per-day average. The Smart Budget Health widget adds a live score with anomaly alerts.

**Packing Checklist**  
Use a categorized packing list with one-tap packed/unpacked toggles. A progress bar shows how ready you are, and a single reset lets you reuse the list for the next trip.

**Trip Journal**  
Add free-form notes tied to a trip or a specific stop. Timestamped entries create a natural journal for confirmation numbers, local tips, and reminders.

**Public Share Links**  
Generate a unique, unguessable URL for any trip so anyone with the link can view the itinerary without an account. Access can be revoked at any time.

### Advanced Features

**Collaborative Real-time Presence**  
See who else is viewing the same trip through avatar bubbles in the header. Presence is backed by Redis sorted sets with 30-second heartbeats, so it works across all app instances without a WebSocket server.

**Stop Locking**  
When a stop is opened for editing, the app acquires a Redis-backed exclusive lock. Other users see a locked badge and cannot edit that stop until the lock is released or expires automatically after 20 seconds.

**Smart Budget Health Score**  
A 0-100 health score is calculated from over-budget checks, projected overspend against city cost-index benchmarks, daily-rate anomalies, and category concentration. The score is cached in Redis and can run synchronously or through Celery depending on worker availability.

**AI Magic Fill**  
One button auto-schedules the most suitable activities for a stop across the planned days. The backend orders activities by cost as a budget-friendly proxy, distributes them across the itinerary, and skips duplicates already scheduled.

**PDF Boarding Pass Export**  
Generate a printable PDF of the full itinerary with trip summary, per-stop activity tables, and costs. The export uses ReportLab and follows a three-tier path: Redis cache hit, Celery async generation, or synchronous fallback.

## Architecture

Traveloop uses a layered, stateless architecture. Every app instance is identical, and shared state lives in PostgreSQL or Redis so containers can be added or removed without coordination.

```text
Client Browser
    React 18 SPA (Vite + React Router)
    credentials included on API requests
    401 handler returns users to login when needed

Nginx
    TLS termination and load balancing
    round-robin across Flask instances

Flask App Instances
    Flask-Login session protection
    ownership checks on every trip-scoped route
    Bleach sanitization for free-text input
    CSRF protection and security headers

PostgreSQL
    primary data store for trips, stops, cities, activities, notes, packing, and expenses

Redis
    sessions, presence, locks, rate limiting, and caches

Celery Workers
    budget health calculation, PDF generation, uploads, reminders
```

### Request Flow

1. Nginx receives the request and terminates TLS.
2. Flask-Limiter checks the request against Redis-backed rate limits.
3. Flask-Login validates the session cookie.
4. The route handler verifies trip ownership.
5. Free-text values are sanitized.
6. SQLAlchemy writes through parameterized queries.
7. Security headers are attached to the response.

### Scaling Flow

1. Nginx distributes traffic across app containers.
2. Flask stays stateless, so any instance can handle any request.
3. Redis stores shared session and collaboration state.
4. PostgreSQL handles the core data model, with read-heavy routes eligible for replica offload.
5. Celery absorbs CPU-heavy work such as PDF generation and budget analysis.

## Database

The schema follows the ownership chain: a user owns trips, trips contain stops, stops schedule activities, and supporting data hangs off the trip.

```text
USERS           TRIPS             STOPS             STOP_ACTIVITIES
id              id                id                id
name            user_id           trip_id           stop_id
email           name              city_id           activity_id
password_hash   description       order_index       day_number
avatar_url      cover_image       start_date       start_time
language        start_date        end_date         notes
is_admin        end_date          notes

CITIES          ACTIVITIES        PACKING_ITEMS     TRIP_NOTES     TRIP_EXPENSES
id              id                id                id             id
name            city_id           trip_id           trip_id        trip_id
country         name              name              stop_id        category
region          description       category          content        description
description     cost              is_packed         created_at     amount
image_url       duration_hours                      updated_at      currency
cost_index      image_url
popularity
latitude
longitude
```

### Key Design Decisions

- `share_token` uses `secrets.token_urlsafe(32)` for strong, revocable share links.
- `cost_index` powers both city display and budget projections.
- `popularity` on cities grows when trips add them, which helps surface frequently used destinations.
- `stop_id` on notes is nullable, so notes can be trip-wide or tied to one stop.
- `order_index` supports stop reordering without renumbering every row.
- `is_admin` powers privileged operations through the admin guard.

## API

All endpoints live under `/api`. The frontend talks only through this layer, and every protected route requires a valid session.

### Authentication

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/auth/login` | Sign in with email and password |
| POST | `/api/auth/signup` | Create a new account |
| POST | `/api/auth/logout` | End the session |
| GET | `/api/auth/me` | Restore the session on page load |
| POST | `/api/auth/forgot-password` | Request a password reset |
| POST | `/api/auth/change-password` | Change the password after verification |

### Trips

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/trips` | List the current user's trips |
| POST | `/api/trips` | Create a trip |
| GET | `/api/trips/:id` | Fetch one trip with its stops |
| PUT | `/api/trips/:id` | Update trip metadata |
| DELETE | `/api/trips/:id` | Delete the trip and its related data |

### Itinerary

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/trips/:id/stops` | Add a city stop |
| DELETE | `/api/trips/:id/stops/:sid` | Remove a stop |
| PUT | `/api/trips/:id/stops/reorder` | Reorder the stops |
| POST | `/api/stops/:sid/activities` | Schedule an activity |
| DELETE | `/api/stops/:sid/activities/:aid` | Remove a scheduled activity |

### Budget

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/trips/:id/budget` | Full budget breakdown |
| POST | `/api/trips/:id/expenses` | Add a manual expense |
| DELETE | `/api/trips/:id/expenses/:eid` | Remove an expense |
| GET | `/api/trips/:id/budget/health` | Get the budget health score |
| POST | `/api/trips/:id/budget/health/refresh` | Force a recompute |

### Packing and Notes

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/trips/:id/packing` | List packing items |
| POST | `/api/trips/:id/packing` | Add a packing item |
| POST | `/api/trips/:id/packing/:iid/toggle` | Toggle packed status |
| DELETE | `/api/trips/:id/packing/:iid` | Remove a packing item |
| GET | `/api/trips/:id/notes` | List notes |
| POST | `/api/trips/:id/notes` | Add a note |
| DELETE | `/api/trips/:id/notes/:nid` | Delete a note |

### Collaboration

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/trips/:id/presence` | Register a viewer heartbeat |
| GET | `/api/trips/:id/presence` | Poll current viewers and locks |
| DELETE | `/api/trips/:id/presence` | Leave a trip |
| POST | `/api/trips/:id/presence/leave` | Beacon-friendly leave endpoint |
| POST | `/api/trips/:id/stops/:sid/lock` | Acquire an edit lock |
| DELETE | `/api/trips/:id/stops/:sid/lock` | Release an edit lock |

### Magic Fill and Export

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/trips/:id/stops/:sid/magic-fill` | Auto-schedule top activities |
| POST | `/api/trips/:id/export/pdf` | Trigger PDF generation |
| GET | `/api/trips/:id/export/pdf/download` | Download the generated PDF |

### Sharing and Catalog

| Method | Path | Description |
| --- | --- | --- |
| POST | `/api/trips/:id/share` | Generate a share token |
| GET | `/api/shared/:token` | Public trip view |
| GET | `/api/cities` | Search the city catalog |
| GET | `/api/activities` | Search the activity catalog |
| GET | `/api/dashboard` | Dashboard data for the signed-in user |
| PUT | `/api/profile` | Update the user profile |

## Security

Security is treated as a first-class part of the system.

| Mechanism | Where it lives | What it protects |
| --- | --- | --- |
| Password hashing | `backend/models/user.py` | Brute-force and rainbow table attacks |
| Session storage in Redis | `backend/config.py` | Session fixation and cross-instance drift |
| HttpOnly and SameSite cookies | `backend/config.py` | Cookie theft and cross-site abuse |
| CSRF protection | Flask-WTF and form routes | Cross-site request forgery |
| Input sanitization | `backend/helpers.py` | Stored XSS |
| Parameterized ORM queries | SQLAlchemy throughout | SQL injection |
| Ownership checks | `backend/helpers.py` | Horizontal privilege escalation |
| Admin guard | `backend/security.py` | Vertical privilege escalation |
| Rate limiting | Flask-Limiter with Redis | Abuse and credential stuffing |
| Security headers | `backend/security.py` | Clickjacking, sniffing, and leakage |
| HSTS | `backend/security.py` | Protocol downgrade attacks |
| Open redirect guard | `backend/security.py` | Phishing via redirect abuse |
| Share token entropy | `backend/models/trip.py` | Token guessing |
| Lock TTLs | Redis-backed stop locks | Stale edits and deadlocks |

## Scalability

Traveloop is designed to scale horizontally without code changes.

| Concern | Mechanism |
| --- | --- |
| Web tier | Stateless Flask instances behind Nginx |
| Sessions | Redis-backed instead of in-memory |
| Presence | Redis sorted sets with TTL heartbeats |
| Stop locking | Redis `SET NX` with expiry |
| Budget cache | Redis cached health scores |
| PDF cache | Redis cached exports |
| Rate limiting | Redis-backed counters |
| Heavy tasks | Celery worker pool |
| Read traffic | PostgreSQL replica for read-heavy routes |
| Response size | Paginated queries with bounded page sizes |

PDF and budget health follow a three-tier execution model:

1. Redis cache hit returns immediately.
2. Celery runs the task asynchronously when workers are available.
3. If no worker responds, the app falls back to synchronous execution so the feature still works in development and demo environments.

## Setup

Run the provided Docker Compose stack from the project root to start PostgreSQL, Redis, multiple Flask instances, and Nginx.

### Environment Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `APP_ENV` | `development` | Chooses the config class |
| `DATABASE_URL` | `sqlite:///Database/traveloop.db` | Primary database URL |
| `REPLICA_DATABASE_URL` | same as primary | Optional read replica |
| `REDIS_URL` | `redis://localhost:6379/0` | Sessions, caches, and presence |
| `RATELIMIT_STORAGE_URL` | `memory://` | Rate limiting backend |
| `SECRET_KEY` | dev default | Session signing key |
| `AUTO_CREATE_DB` | `false` | Auto-create schema on startup |
| `AUTO_SEED_DATA` | `false` | Seed demo data on startup |
| `SESSION_COOKIE_SECURE` | `false` | HTTPS-only cookies in production |
| `LOG_LEVEL` | `INFO` | Logging verbosity |

## Project Structure

| File | Purpose |
| --- | --- |
| `backend/app.py` | App factory, SPA fallback, session setup |
| `backend/config.py` | Development, test, and production config |
| `backend/security.py` | Security headers, error handlers, admin guard |
| `backend/helpers.py` | Ownership helpers, pagination, sanitization |
| `backend/tasks.py` | Celery tasks |
| `backend/services/presence.py` | Redis presence heartbeats and stop locks |
| `backend/services/budget_health.py` | Budget scoring and anomaly detection |
| `backend/services/pdf_export.py` | ReportLab PDF generation |
| `backend/routes/api.py` | JSON API endpoints |
| `frontend/src/context/AuthContext.jsx` | Session restore and auth state |
| `frontend/src/api/client.js` | Fetch wrapper and 401 handling |

## Team

This project was built for the hackathon to show a production-minded travel platform with real infrastructure, real security boundaries, and a complete end-to-end workflow.
egister_security()** — security headers appended to every response

If any layer rejects the request, it stops there. Nothing downstream executes.

### How scalability flows through the stack

1. **Nginx** distributes traffic round-robin — add app containers, zero config change
2. **Flask instances** are stateless — no local cache, no in-memory sessions
3. **Redis** holds all shared state — sessions, locks, caches, rate counters
4. **PostgreSQL replica** absorbs read traffic from catalog and search routes
5. **Celery workers** absorb CPU-heavy work — PDF, budget analysis, S3 uploads
6. **Pagination** caps every list response at 50 rows — response size never grows with data volume

---
## Database

The schema is designed around the core ownership chain: a User owns Trips, Trips contain Stops, Stops schedule Activities.

```
┌──────────────────────────────────────────────────────────────────────┐
│                         DATABASE SCHEMA                              │
└──────────────────────────────────────────────────────────────────────┘

USERS                              CITIES
──────────────────────────         ──────────────────────────────────
id            PK  INT              id            PK  INT
name          VARCHAR(100)         name          VARCHAR(150)  IDX
email         VARCHAR(150) UNIQ    country       VARCHAR(100)  IDX
password_hash VARCHAR(256)         region        VARCHAR(100)
avatar_url    VARCHAR(500)         description   TEXT
language      VARCHAR(10)          image_url     VARCHAR(500)
is_admin      BOOLEAN              cost_index    FLOAT  (0-100)
created_at    TIMESTAMP            popularity    INT    (auto-increments)
updated_at    TIMESTAMP            latitude      FLOAT
                                   longitude     FLOAT

TRIPS                              ACTIVITIES
──────────────────────────         ──────────────────────────────────
id            PK  INT              id            PK  INT
user_id       FK->users   IDX      city_id       FK->cities    IDX
name          VARCHAR(200)         name          VARCHAR(200)
description   TEXT                 description   TEXT
cover_image   VARCHAR(500)         category      VARCHAR(50)
start_date    DATE                 cost          FLOAT
end_date      DATE                 duration_hours FLOAT
is_public     BOOLEAN              image_url     VARCHAR(500)
share_token   VARCHAR(64) UNIQ
created_at    TIMESTAMP
updated_at    TIMESTAMP

STOPS                              STOP_ACTIVITIES
──────────────────────────         ──────────────────────────────────
id            PK  INT              id            PK  INT
trip_id       FK->trips    IDX     stop_id       FK->stops     IDX
city_id       FK->cities           activity_id   FK->activities
order_index   INT                  day_number    INT
start_date    DATE                 start_time    VARCHAR(5)  (HH:MM)
end_date      DATE                 notes         TEXT
notes         TEXT

PACKING_ITEMS                      TRIP_NOTES
──────────────────────────         ──────────────────────────────────
id            PK  INT              id            PK  INT
trip_id       FK->trips    IDX     trip_id       FK->trips     IDX
name          VARCHAR(200)         stop_id       FK->stops  (nullable)
category      VARCHAR(50)          content       TEXT
is_packed     BOOLEAN              created_at    TIMESTAMP
                                   updated_at    TIMESTAMP

TRIP_EXPENSES
──────────────────────────
id            PK  INT
trip_id       FK->trips    IDX
category      VARCHAR(50)
description   VARCHAR(200)
amount        FLOAT
currency      VARCHAR(3)
created_at    TIMESTAMP```

**Entity relationships:**

```
USER --< TRIP --< STOP >-- CITY
                  STOP --< STOP_ACTIVITY >-- ACTIVITY
         TRIP --< PACKING_ITEM
         TRIP --< TRIP_NOTE >-- STOP (optional)
         TRIP --< TRIP_EXPENSE
CITY --< ACTIVITY
```

**Key design decisions:**

- `share_token` uses `secrets.token_urlsafe(32)` — 256 bits of entropy, practically unguessable. Revocable instantly.
- `cost_index` on City (0-100) drives both the cost label display and the Budget Health projection engine.
- `popularity` on City increments every time a city is added to a trip — powers Popular destinations organically.
- `stop_id` on TripNote is nullable — notes can be trip-wide or pinned to a specific stop.
- `order_index` on Stop enables drag-and-drop reordering without renumbering all rows.
- `is_admin` on User enables the `@admin_required` decorator for privileged operations.

---

## API

All endpoints live under `/api`. The React frontend communicates exclusively through this layer. Every protected endpoint requires a valid session cookie.

### Authentication

| Method | Path | Description | Security |
|--------|------|-------------|----------|
| POST | `/api/auth/login` | Sign in with email + password | Werkzeug scrypt hash check |
| POST | `/api/auth/signup` | Create account | Email uniqueness enforced at DB level |
| POST | `/api/auth/logout` | End session | Destroys Redis session entry |
| GET | `/api/auth/me` | Restore session on page load | Reads Redis session store |
| POST | `/api/auth/forgot-password` | Request password reset | Never reveals email existence |
| POST | `/api/auth/change-password` | Change password | Verifies old password first |

### Trips

| Method | Path | Description | Security |
|--------|------|-------------|----------|
| GET | `/api/trips` | List user trips (paginated) | Filtered by `user_id` |
| POST | `/api/trips` | Create a trip | Ownership set on creation |
| GET | `/api/trips/:id` | Get trip with stops | `user_id` ownership check |
| PUT | `/api/trips/:id` | Update trip metadata | `user_id` ownership check |
| DELETE | `/api/trips/:id` | Delete trip and all data | Cascade delete via FK |

### Itinerary

| Method | Path | Description | Security |
|--------|------|-------------|----------|
| POST | `/api/trips/:id/stops` | Add a city stop | Trip ownership check |
| DELETE | `/api/trips/:id/stops/:sid` | Remove a stop | Trip ownership check |
| PUT | `/api/trips/:id/stops/reorder` | Reorder stops | Trip ownership check |
| POST | `/api/stops/:sid/activities` | Schedule an activity | Stop -> trip ownership chain |
| DELETE | `/api/stops/:sid/activities/:aid` | Remove activity | Stop -> trip ownership chain |

### Budget

| Method | Path | Description | Scalability |
|--------|------|-------------|-------------|
| GET | `/api/trips/:id/budget` | Full budget breakdown | Direct DB query |
| POST | `/api/trips/:id/expenses` | Add manual expense | — |
| DELETE | `/api/trips/:id/expenses/:eid` | Remove expense | — |
| GET | `/api/trips/:id/budget/health` | Budget Health score | Redis cache -> Celery -> sync fallback |
| POST | `/api/trips/:id/budget/health/refresh` | Force recompute | Invalidates Redis cache |

### Packing and Notes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/trips/:id/packing` | List packing items |
| POST | `/api/trips/:id/packing` | Add item |
| POST | `/api/trips/:id/packing/:iid/toggle` | Toggle packed status |
| DELETE | `/api/trips/:id/packing/:iid` | Remove item |
| GET | `/api/trips/:id/notes` | List notes |
| POST | `/api/trips/:id/notes` | Add note |
| DELETE | `/api/trips/:id/notes/:nid` | Delete note |

### Collaboration

| Method | Path | Description | Implementation |
|--------|------|-------------|----------------|
| POST | `/api/trips/:id/presence` | Heartbeat — register viewer | Redis ZADD with TTL |
| GET | `/api/trips/:id/presence` | Poll viewers + locks | Redis ZRANGEBYSCORE |
| DELETE | `/api/trips/:id/presence` | Leave trip | Redis ZREM |
| POST | `/api/trips/:id/presence/leave` | sendBeacon-compatible leave | Same as DELETE |
| POST | `/api/trips/:id/stops/:sid/lock` | Acquire edit lock | Redis SET NX EX 20 |
| DELETE | `/api/trips/:id/stops/:sid/lock` | Release lock | Redis DEL (owner only) |

### Magic Fill and Export

| Method | Path | Description | Implementation |
|--------|------|-------------|----------------|
| POST | `/api/trips/:id/stops/:sid/magic-fill` | Auto-schedule top activities | DB query by cost asc |
| POST | `/api/trips/:id/export/pdf` | Trigger PDF generation | Redis cache -> Celery -> sync |
| GET | `/api/trips/:id/export/pdf/download` | Download generated PDF | Redis -> in-process -> on-the-fly |

### Sharing and Catalog

| Method | Path | Description | Security |
|--------|------|-------------|----------|
| POST | `/api/trips/:id/share` | Generate share token | `secrets.token_urlsafe(32)` |
| GET | `/api/shared/:token` | Public trip view | No auth required, token-gated |
| GET | `/api/cities` | Search city catalog | Paginated, max 12/page |
| GET | `/api/activities` | Search activity catalog | Paginated, max 20/page |
| GET | `/api/dashboard` | Dashboard data | Filtered by `current_user.id` |
| PUT | `/api/profile` | Update profile | Email uniqueness check |

---

## Security

Security is not an afterthought. Every layer has explicit protections and they are documented here with the exact file where each mechanism lives.

| Mechanism | Where it lives | What it prevents |
|-----------|---------------|-----------------|
| Password hashing (scrypt) | `models/user.py` `set_password()` | Brute-force, rainbow tables |
| Session in Redis | `config.py` `SESSION_TYPE` | Session fixation, memory leaks across instances |
| HttpOnly + SameSite cookies | `config.py` `SESSION_COOKIE_*` | XSS cookie theft, CSRF via cross-site requests |
| CSRF tokens | `Flask-WTF` on all form routes | Cross-site request forgery |
| Input sanitization | `helpers.py` `get_form_value()` via Bleach | XSS stored in DB |
| Parameterized queries | SQLAlchemy ORM throughout | SQL injection |
| Ownership checks | `helpers.py` `get_owned_trip_or_404()` | Horizontal privilege escalation |
| Admin decorator | `security.py` `@admin_required` | Vertical privilege escalation |
| Rate limiting | `app.py` Flask-Limiter + Redis | Credential stuffing, API abuse |
| Security headers | `security.py` `register_security()` | Clickjacking, MIME sniffing, info leakage |
| HSTS | `security.py` (production only) | Protocol downgrade attacks |
| Open redirect protection | `security.py` `is_safe_redirect_target()` | Phishing via redirect |
| Share token entropy | `models/trip.py` `secrets.token_urlsafe(32)` | Token guessing |
| Stop lock TTL | `services/presence.py` Redis EX 20 | Deadlock from crashed browser |
| 401 redirect guard | `api/client.js` | Redirect loop on auth pages |

**Ownership check pattern** — used on every trip-scoped route:

```python
# helpers.py
def get_owned_trip_or_404(trip_id, user_id):
    return Trip.query.filter_by(id=trip_id, user_id=user_id).first_or_404()
    # Returns 404 (not 403) to avoid leaking record existence
```

**Security headers applied to every response:**

```
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Strict-Transport-Security: max-age=31536000 (production only)
```

---

## Scalability

Traveloop is built to scale horizontally without code changes. Here is exactly what scales and how.

| Concern | Mechanism | File |
|---------|-----------|------|
| Web tier | Stateless Flask instances behind Nginx | docker-compose.yml, nginx.conf |
| Sessions | Redis not in-memory | config.py SESSION_TYPE=redis |
| Presence | Redis sorted sets with TTL | services/presence.py |
| Stop locks | Redis SET NX with TTL | services/presence.py |
| Budget cache | Redis SETEX 300s | routes/api.py api_budget_health |
| PDF cache | Redis SETEX 600s | routes/api.py api_request_pdf |
| Rate limiting | Redis-backed counters | app.py Flask-Limiter |
| Heavy tasks | Celery worker pool | tasks.py, celery_worker.py |
| Read traffic | PostgreSQL read replica | config.py SQLALCHEMY_BINDS |
| Response size | Paginated queries max 50 rows | helpers.py paginate_query |

**Three-tier task execution for PDF and Budget Health:**

- Tier 1: Redis cache hit — return immediately (all environments)
- Tier 2: Celery worker alive — dispatch async, return 202, frontend polls (production)
- Tier 3: No live worker detected — compute synchronously, return 200 ready (dev/demo)

Worker liveness is checked with celery_app.control.ping(timeout=0.5) before dispatching. If no worker responds within 500ms, the request falls through to synchronous execution. The app works correctly in every environment while the scalable async path is always preferred when workers are running.

---

## Setup

### Quick start

Run the included compose file from the project root. This starts PostgreSQL, Redis, three Flask instances, and Nginx on port 80.

### Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| APP_ENV | development | Config class selector |
| DATABASE_URL | sqlite:///Database/traveloop.db | Primary DB |
| REPLICA_DATABASE_URL | same as primary | Read replica (optional) |
| REDIS_URL | redis://localhost:6379/0 | Sessions, cache, presence |
| RATELIMIT_STORAGE_URL | memory:// | Rate limiting |
| SECRET_KEY | dev default | Session signing — change in production |
| AUTO_CREATE_DB | false | Run db.create_all() on startup |
| AUTO_SEED_DATA | false | Load seed data on startup |
| SESSION_COOKIE_SECURE | false | HTTPS-only cookies (true in prod) |
| LOG_LEVEL | INFO | Logging verbosity |

---

## Project Structure

Key files and what they do:

| File | Purpose |
|------|---------|
| backend/app.py | Application factory, SPA fallback, session init |
| backend/config.py | Dev/prod/test config, Redis/SQLite auto-detection |
| backend/security.py | Security headers, error handlers, @admin_required |
| backend/helpers.py | Ownership helpers, paginate_query, Bleach sanitize |
| backend/tasks.py | Celery tasks: budget_health, pdf_export, s3, reminder |
| backend/services/presence.py | Redis presence heartbeats + SET NX stop locking |
| backend/services/budget_health.py | 4-rule scoring engine, anomaly detection |
| backend/services/pdf_export.py | ReportLab branded PDF generation |
| backend/routes/api.py | All 35+ JSON API endpoints |
| frontend/src/context/AuthContext.jsx | Real API auth, session restore on mount |
| frontend/src/api/client.js | Fetch wrapper, 401 handler, credential include |
| frontend/src/hooks/usePresence.js | 15s heartbeat, lock/unlock, sendBeacon leave |
| frontend/src/components/budget/BudgetHealth.jsx | SVG ring gauge, anomaly alerts |
| frontend/src/components/export/PdfExportButton.jsx | 3-state PDF button with polling |
| frontend/src/components/collaboration/PresenceBar.jsx | Avatar bubbles for viewers |
| vite.config.js | Dev proxy: /api to localhost:5000 |

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 18 + Vite | Fast SPA, hot reload, optimized builds |
| Routing | React Router v6 | Declarative routing with auth guards |
| Styling | Custom CSS (Amazon design system) | No framework overhead, pixel-perfect |
| Backend | Flask 3.x | Lightweight, blueprint-friendly |
| ORM | Flask-SQLAlchemy | Clean models, ownership-aware queries |
| Auth | Flask-Login | Session-based, Redis-backed |
| Validation | Flask-WTF + WTForms | Schema validation + CSRF |
| Sanitization | Bleach | XSS neutralization before persistence |
| Database | PostgreSQL 16 / SQLite (dev) | ACID, concurrent connections, replicas |
| Cache/Sessions | Redis 7 | Sub-millisecond reads, TTL expiry |
| Task Queue | Celery 5 | Async PDF, budget analysis, notifications |
| PDF | ReportLab | Pure-Python, no system dependencies |
| Server | Gunicorn + Nginx | Multi-worker WSGI + load balancing |
| Containers | Docker Compose | One-command local cluster |

---

## Team

Built at the Odoo Hackathon.

| Name | Role |
|------|------|
| **Ashutosh Singh** | Full-stack — backend architecture, security, API design |
| **Manav Barot** | Full-stack — frontend React, UI/UX, component system |
| **Kotak Naman** | Full-stack — database design, Celery tasks, collaboration features |

**Mentor:** Aditi Patel · [GitHub](https://github.com/adip-odoo)

---

<div align="center">

*Traveloop — because your next adventure deserves better than a spreadsheet.*

</div>
