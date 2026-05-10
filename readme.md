<div align="center">

<img src="https://img.shields.io/badge/Flask-2.x-black?style=for-the-badge&logo=flask" />
<img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react" />
<img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql" />
<img src="https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis" />
<img src="https://img.shields.io/badge/Celery-5-37814A?style=for-the-badge&logo=celery" />
<img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker" />

# ⚡ Traveloop

### *Plan smarter. Travel better.*

**The all-in-one travel planning workspace — itineraries, budgets, packing, collaboration, and AI-powered suggestions, all in one place.**

[Features](#features) · [Architecture](#architecture) · [Database](#database) · [API](#api) · [Security](#security) · [Setup](#setup) · [Team](#team)

</div>

---

## What is Traveloop?

Travel planning is broken. Your itinerary lives in a Google Doc, your budget in a spreadsheet, your packing list in a notes app, and your friends' suggestions scattered across WhatsApp. Traveloop fixes that.

It is a full-stack web application that brings every part of trip planning into one coherent workspace. You create a trip, build your route stop by stop, schedule activities, track spending, manage your packing list, write journal notes, and share the whole thing with a single link — all without leaving the app.

We built it for the hackathon to demonstrate what a production-grade travel platform looks like when you take infrastructure, security, and user experience seriously from day one.

---

## Features

### Core Planning Workflow

**Trip Management**
Create, edit, and delete trips with names, dates, descriptions, and optional cover images. Every trip is a self-contained workspace — all your stops, activities, expenses, notes, and packing items live inside it.

**Itinerary Builder**
Add cities as stops in any order. Drag to reorder. Expand each stop to browse and schedule local activities from the catalog. The builder shows cost and duration for every activity so you can plan realistically.

**Budget Tracker**
Two sources of truth: activity costs pulled automatically from your itinerary, and manual expenses you add yourself (transport, accommodation, food, etc.). See a breakdown by category with visual progress bars and a per-day average.

**Packing Checklist**
Categorized packing list with one-tap toggle for packed/unpacked status. Progress bar shows how ready you are. Reset all items with one click to reuse the list on your next trip.

**Trip Journal**
Free-form notes tied to a trip or a specific stop. Timestamped entries create a natural journal. Useful for confirmation numbers, local tips, or anything you want to remember.

**Public Share Links**
Generate a unique, unguessable URL for any trip. Anyone with the link can view the full itinerary — no account required. Revoke access at any time.

---

### Advanced Features (Hackathon Additions)

**1. Collaborative Real-time Presence**
See who else is viewing the same trip right now. Avatar bubbles appear in the header showing each collaborator's initials and a unique colour. Built on Redis sorted sets with 30-second TTL heartbeats — no WebSocket server required.

**2. Stop Locking**
When you expand a stop to edit it, the system acquires a Redis-backed exclusive lock using `SET NX`. Other users see a red "Locked by [name]" badge and cannot edit that stop simultaneously. Locks expire automatically after 20 seconds of inactivity, preventing deadlocks.

**3. Smart Budget Health Score**
A 0–100 health score calculated by a Celery background task. It analyses your current spend against city cost-index benchmarks, flags anomalies (over budget, category concentration, daily rate spikes), and gives actionable tips. Results are cached in Redis for 5 minutes. The frontend polls until the score is ready and renders a live SVG ring gauge.

**4. AI Magic Fill**
One button auto-schedules the most popular activities for a stop across your planned days. The backend picks activities ordered by cost (budget-friendly proxy for popularity), distributes them across days, and skips duplicates. No external AI API needed — pure database intelligence.

**5. PDF Boarding Pass Export**
Generate a printable PDF of your full itinerary. A Celery task uses ReportLab to render a branded document with trip summary, per-stop activity tables, costs, and durations. The PDF is cached in Redis for 10 minutes. The frontend shows a three-state button: idle → generating → download ready.

---

## Architecture

The system uses a layered, stateless architecture designed for horizontal scaling. Every application instance is identical and shares no local state — all shared state lives in PostgreSQL or Redis.

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                          │
│                    React SPA (Vite + React Router)              │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NGINX LOAD BALANCER                        │
│              Round-robin across app instances                   │
└──────────┬──────────────────┬──────────────────┬───────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  Flask App 1 │   │  Flask App 2 │   │  Flask App 3 │
│  :5001       │   │  :5002       │   │  :5003       │
│              │   │              │   │              │
│  Blueprints  │   │  Blueprints  │   │  Blueprints  │
│  WTForms     │   │  WTForms     │   │  WTForms     │
│  Bleach      │   │  Bleach      │   │  Bleach      │
│  Flask-Login │   │  Flask-Login │   │  Flask-Login │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
           ┌──────────────┴──────────────┐
           │                             │
           ▼                             ▼
┌─────────────────────┐       ┌─────────────────────┐
│   PostgreSQL 16     │       │      Redis 7         │
│                     │       │                      │
│  Primary (writes)   │       │  DB 0: Sessions      │
│  Replica (reads)    │       │  DB 0: Presence      │
│                     │       │  DB 0: Budget cache  │
│  Tables:            │       │  DB 0: PDF cache     │
│  users              │       │  DB 0: Stop locks    │
│  trips              │       │  DB 1: Celery broker │
│  stops              │       │  DB 2: Rate limiting │
│  cities             │       └─────────────────────┘
│  activities         │
│  stop_activities    │       ┌─────────────────────┐
│  packing_items      │       │   Celery Workers     │
│  trip_notes         │       │                      │
│  trip_expenses      │       │  budget_health task  │
└─────────────────────┘       │  pdf_export task     │
                              │  s3_upload task      │
                              │  trip_reminder task  │
                              └─────────────────────┘
```

**Why this design works at scale:**

Every Flask instance is stateless. Sessions live in Redis, not in memory. Rate limiting state lives in Redis. Presence heartbeats live in Redis. This means you can add or remove app instances without any coordination — the load balancer just routes to whatever is running.

The Celery worker pool handles anything that should not block a web request: PDF generation, budget analysis, S3 uploads, and notifications. Workers read from the same Redis broker and write results back to Redis for the frontend to poll.

---

## Database

The schema is designed around the core ownership chain: a User owns Trips, Trips contain Stops, Stops schedule Activities.

```
┌──────────────────────────────────────────────────────────────────────┐
│                         DATABASE SCHEMA                              │
└──────────────────────────────────────────────────────────────────────┘

USERS                          CITIES
─────────────────────          ──────────────────────────
id          PK INT             id          PK INT
name        VARCHAR(100)       name        VARCHAR(150)  IDX
email       VARCHAR(150) UNIQ  country     VARCHAR(100)  IDX
password_hash VARCHAR(256)     region      VARCHAR(100)
avatar_url  VARCHAR(500)       description TEXT
language    VARCHAR(10)        image_url   VARCHAR(500)
is_admin    BOOLEAN            cost_index  FLOAT         (0–100)
created_at  TIMESTAMP          popularity  INT
updated_at  TIMESTAMP          latitude    FLOAT
                               longitude   FLOAT

TRIPS                          ACTIVITIES
─────────────────────          ──────────────────────────
id          PK INT             id          PK INT
user_id     FK → users  IDX    city_id     FK → cities  IDX
name        VARCHAR(200)       name        VARCHAR(200)
description TEXT               description TEXT
cover_image VARCHAR(500)       category    VARCHAR(50)
start_date  DATE               cost        FLOAT
end_date    DATE               duration_hours FLOAT
is_public   BOOLEAN            image_url   VARCHAR(500)
share_token VARCHAR(64) UNIQ
created_at  TIMESTAMP
updated_at  TIMESTAMP

STOPS                          STOP_ACTIVITIES
─────────────────────          ──────────────────────────
id          PK INT             id          PK INT
trip_id     FK → trips  IDX    stop_id     FK → stops   IDX
city_id     FK → cities        activity_id FK → activities
order_index INT                day_number  INT
start_date  DATE               start_time  VARCHAR(5)   ("09:00")
end_date    DATE               notes       TEXT
notes       TEXT

PACKING_ITEMS                  TRIP_NOTES
─────────────────────          ──────────────────────────
id          PK INT             id          PK INT
trip_id     FK → trips  IDX    trip_id     FK → trips   IDX
name        VARCHAR(200)       stop_id     FK → stops   (nullable)
category    VARCHAR(50)        content     TEXT
is_packed   BOOLEAN            created_at  TIMESTAMP
                               updated_at  TIMESTAMP

TRIP_EXPENSES
─────────────────────
id          PK INT
trip_id     FK → trips  IDX
category    VARCHAR(50)
description VARCHAR(200)
amount      FLOAT
currency    VARCHAR(3)
created_at  TIMESTAMP
```

**Entity relationships:**

```
USER ──< TRIP ──< STOP >── CITY
                  STOP ──< STOP_ACTIVITY >── ACTIVITY
         TRIP ──< PACKING_ITEM
         TRIP ──< TRIP_NOTE >── STOP (optional)
         TRIP ──< TRIP_EXPENSE
CITY ──< ACTIVITY
```

**Key design decisions:**

- `share_token` uses `secrets.token_urlsafe(32)` — 256 bits of entropy, practically unguessable.
- `cost_index` on City (0–100) drives both the cost label display and the Budget Health projection engine.
- `popularity` on City increments every time a city is added to a trip — powers the "Popular destinations" dashboard section organically.
- `stop_id` on TripNote is nullable — notes can be trip-wide or pinned to a specific stop.
- `order_index` on Stop enables drag-and-drop reordering without renumbering all rows.

---

## API

All endpoints live under `/api`. The React frontend communicates exclusively through this layer.

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Sign in with email + password |
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/logout` | End session |
| GET | `/api/auth/me` | Check session state |
| POST | `/api/auth/forgot-password` | Request password reset |

### Trips

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/trips` | List user's trips (paginated) |
| POST | `/api/trips` | Create a trip |
| GET | `/api/trips/:id` | Get trip with stops |
| PUT | `/api/trips/:id` | Update trip metadata |
| DELETE | `/api/trips/:id` | Delete trip and all data |

### Itinerary

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/trips/:id/stops` | Add a city stop |
| DELETE | `/api/trips/:id/stops/:sid` | Remove a stop |
| PUT | `/api/trips/:id/stops/reorder` | Reorder stops |
| POST | `/api/stops/:sid/activities` | Schedule an activity |
| DELETE | `/api/stops/:sid/activities/:aid` | Remove scheduled activity |

### Budget

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/trips/:id/budget` | Full budget breakdown |
| POST | `/api/trips/:id/expenses` | Add manual expense |
| DELETE | `/api/trips/:id/expenses/:eid` | Remove expense |
| GET | `/api/trips/:id/budget/health` | Get Budget Health score |
| POST | `/api/trips/:id/budget/health/refresh` | Force recompute |

### Packing & Notes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/trips/:id/packing` | List packing items |
| POST | `/api/trips/:id/packing` | Add item |
| POST | `/api/trips/:id/packing/:iid/toggle` | Toggle packed |
| DELETE | `/api/trips/:id/packing/:iid` | Remove item |
| GET | `/api/trips/:id/notes` | List notes |
| POST | `/api/trips/:id/notes` | Add note |
| DELETE | `/api/trips/:id/notes/:nid` | Delete note |

### Collaboration (New)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/trips/:id/presence` | Heartbeat — register viewer |
| GET | `/api/trips/:id/presence` | Poll viewers + locks |
| DELETE | `/api/trips/:id/presence` | Leave trip |
| POST | `/api/trips/:id/stops/:sid/lock` | Acquire edit lock |
| DELETE | `/api/trips/:id/stops/:sid/lock` | Release lock |

### Magic Fill & Export (New)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/trips/:id/stops/:sid/magic-fill` | Auto-schedule top activities |
| POST | `/api/trips/:id/export/pdf` | Trigger PDF generation |
| GET | `/api/trips/:id/export/pdf/download` | Download generated PDF |

### Sharing & Catalog

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/trips/:id/share` | Generate share token |
| GET | `/api/shared/:token` | Public trip view |
| GET | `/api/cities` | Search city catalog |
| GET | `/api/activities` | Search activity catalog |
| GET | `/api/dashboard` | Dashboard data |
| PUT | `/api/profile` | Update profile |

---

## Security

Security is not an afterthought here. Every layer has explicit protections.

**Authentication & Sessions**
Flask-Login manages session state. Sessions are stored in Redis (not cookies), so they survive app restarts and work across all instances. Session cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production. The `PERMANENT_SESSION_LIFETIME` is 24 hours.

**Password Security**
Werkzeug's `generate_password_hash` uses scrypt by default — a memory-hard algorithm that resists brute-force attacks. Passwords are never stored or logged in plaintext.

**CSRF Protection**
Flask-WTF enforces CSRF tokens on all state-changing form submissions. The React frontend uses session cookies with `credentials: 'include'` on every fetch, so the CSRF token flows naturally.

**Input Validation & Sanitization**
WTForms validates all form inputs with type checks, length limits, and custom validators. Bleach sanitizes free-text fields before persistence, neutralizing XSS payloads. SQLAlchemy's ORM uses parameterized queries throughout — no raw SQL, no injection risk.

**Ownership Checks**
Every trip-scoped route verifies `trip.user_id == current_user.id` before any read or write. This is enforced at the helper level (`get_owned_trip_or_404`), not left to individual routes. A user cannot access, modify, or delete another user's data — they get a 404, not a 403, to avoid leaking record existence.

**Rate Limiting**
Flask-Limiter applies `200 requests/day` and `50 requests/hour` defaults, backed by Redis. This prevents credential stuffing and API abuse without requiring external infrastructure.

**Security Headers**
Every response gets:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`
- `Strict-Transport-Security` (production only)

**Open Redirect Protection**
The login `?next=` parameter is validated against the current host's netloc before redirecting. External URLs are silently ignored.

**Share Token Security**
Public share tokens are generated with `secrets.token_urlsafe(32)` — 256 bits of entropy. Guessing a valid token is computationally infeasible. Tokens can be revoked instantly by the trip owner.

**Stop Locking (Collaboration)**
Redis `SET NX` (set if not exists) provides atomic lock acquisition. Locks carry a 20-second TTL so a crashed browser cannot permanently block a stop. Only the lock holder can release it.

---

## Scalability

Traveloop is built to scale horizontally without code changes.

**Stateless Application Tier**
Flask instances share no local state. Add more containers behind the load balancer and traffic distributes automatically. The included `docker-compose.yml` demonstrates three instances behind Nginx.

**Redis for Everything Shared**
Sessions, presence heartbeats, stop locks, budget health cache, PDF cache, rate limiting counters — all in Redis. Any instance can serve any request because the state is always in the same place.

**Read Replicas**
The config supports a `REPLICA_DATABASE_URL`. Read-heavy routes (city catalog, activity search, dashboard) can be routed to a replica via the `use_replica=True` flag in `paginate_query`. Writes always go to the primary.

**Background Workers**
Celery workers handle anything that should not block a web request. Budget health analysis, PDF generation, S3 uploads, and email notifications all run asynchronously. The frontend polls for results rather than waiting.

**Pagination**
Every list endpoint is paginated with hard bounds (`max_per_page=50`). Response sizes stay small and predictable regardless of how much data accumulates.

---

## Setup

### Quick start (Docker)

```bash
git clone <repo>
cd odoo_Hackathon_Team_adip
docker-compose up
```

This starts PostgreSQL, Redis, three Flask instances, and Nginx. The app is available at `http://localhost`.

### Local development

```bash
# 1. Create and activate a virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # macOS / Linux

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Install frontend dependencies
cd frontend && npm install && cd ..

# 4. Set environment variables
set APP_ENV=development
set AUTO_CREATE_DB=true
set AUTO_SEED_DATA=true
set REDIS_URL=redis://localhost:6379/0

# 5. Start the backend
python run.py

# 6. Start the frontend (separate terminal)
cd frontend && npm run dev
```

### Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `APP_ENV` | `development` | Config class selector |
| `DATABASE_URL` | `postgresql://traveloop:traveloop@localhost:5432/traveloop_db` | Primary DB |
| `REPLICA_DATABASE_URL` | same as primary | Read replica |
| `REDIS_URL` | `redis://localhost:6379/0` | Sessions, cache, presence |
| `RATELIMIT_STORAGE_URL` | `redis://localhost:6379/2` | Rate limiting |
| `SECRET_KEY` | dev default | Session signing — **change in production** |
| `AUTO_CREATE_DB` | `false` | Run `db.create_all()` on startup |
| `AUTO_SEED_DATA` | `false` | Load seed data on startup |
| `SESSION_COOKIE_SECURE` | `false` | HTTPS-only cookies |
| `LOG_LEVEL` | `INFO` | Logging verbosity |

### Running Celery workers

```bash
# In a separate terminal
celery -A backend.celery_worker.celery_app worker --loglevel=info
```

Workers handle budget health analysis, PDF generation, and S3 uploads.

---

## Project Structure

```
.
├── backend/
│   ├── app.py              # Application factory
│   ├── config.py           # Environment-aware configuration
│   ├── security.py         # Headers, error handlers, decorators
│   ├── helpers.py          # Shared request parsing and ownership helpers
│   ├── tasks.py            # Celery background tasks
│   ├── celery_worker.py    # Celery app factory
│   ├── jobs.py             # Thread-pool background jobs
│   ├── seed.py             # Database seed data
│   ├── forms.py            # WTForms form definitions
│   ├── models/
│   │   ├── user.py         # User model + Flask-Login integration
│   │   ├── trip.py         # Trip + TripExpense models
│   │   ├── city.py         # City model with cost_index
│   │   ├── activity.py     # Activity catalog model
│   │   ├── itinerary.py    # Stop + StopActivity models
│   │   └── packing.py      # PackingItem + TripNote models
│   ├── routes/
│   │   ├── api.py          # All JSON API endpoints (React frontend)
│   │   ├── auth.py         # Login / signup / logout (HTML)
│   │   ├── trips.py        # Trip CRUD (HTML)
│   │   ├── itinerary.py    # Stop and activity management (HTML)
│   │   ├── budget.py       # Budget breakdown (HTML)
│   │   ├── packing.py      # Packing checklist (HTML)
│   │   ├── notes.py        # Trip journal (HTML)
│   │   ├── share.py        # Public share links
│   │   ├── cities.py       # City catalog (HTML)
│   │   ├── activities.py   # Activity catalog (HTML)
│   │   ├── dashboard.py    # Dashboard (HTML)
│   │   └── profile.py      # Account settings (HTML)
│   └── services/
│       ├── presence.py     # Redis presence + stop locking
│       ├── budget_health.py # Budget Health scoring engine
│       └── pdf_export.py   # ReportLab PDF generation
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Router + auth guards
│   │   ├── index.css       # Amazon-style design system
│   │   ├── api/client.js   # Fetch wrapper
│   │   ├── context/AuthContext.jsx
│   │   ├── config/auth.js  # Auth bypass flag
│   │   ├── hooks/
│   │   │   └── usePresence.js  # Presence heartbeat hook
│   │   ├── components/
│   │   │   ├── SplashScreen.jsx/css
│   │   │   ├── Sidebar.jsx
│   │   │   ├── auth/AuthLayout.jsx
│   │   │   ├── layout/PageShell.jsx
│   │   │   ├── layout/TripWorkflowNav.jsx
│   │   │   ├── layout/EmptyState.jsx
│   │   │   ├── layout/PageLoader.jsx
│   │   │   ├── collaboration/PresenceBar.jsx
│   │   │   ├── budget/BudgetHealth.jsx
│   │   │   └── export/PdfExportButton.jsx
│   │   └── pages/
│   │       ├── Login.jsx / Signup.jsx / ForgotPassword.jsx
│   │       ├── Dashboard.jsx
│   │       ├── TripList.jsx / TripCreate.jsx / TripView.jsx
│   │       ├── ItineraryBuilder.jsx
│   │       ├── Budget.jsx
│   │       ├── Packing.jsx
│   │       ├── Notes.jsx
│   │       ├── CitySearch.jsx
│   │       ├── ActivitySearch.jsx
│   │       ├── Profile.jsx
│   │       └── SharedTrip.jsx
├── docker-compose.yml      # 3 app instances + Nginx + Postgres + Redis
├── Dockerfile
├── nginx.conf
├── gunicorn_config.py
├── run.py
└── requirements.txt
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 18 + Vite | Fast SPA with hot reload and optimized builds |
| Routing | React Router v6 | Declarative client-side routing with auth guards |
| Styling | Custom CSS (Amazon design system) | No framework overhead, pixel-perfect control |
| Backend | Flask 2.x | Lightweight, blueprint-friendly, easy to reason about |
| ORM | Flask-SQLAlchemy | Clean model definitions, ownership-aware queries |
| Auth | Flask-Login | Session-based, Redis-backed, production-safe |
| Forms | Flask-WTF + WTForms | Schema validation + CSRF in one package |
| Sanitization | Bleach | XSS neutralization before persistence |
| Database | PostgreSQL 16 | ACID transactions, concurrent connections, read replicas |
| Cache/Sessions | Redis 7 | Sub-millisecond reads, TTL-based expiry, pub/sub ready |
| Task Queue | Celery 5 | Async PDF generation, budget analysis, notifications |
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
