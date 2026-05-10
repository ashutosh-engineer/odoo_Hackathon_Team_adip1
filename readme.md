<div align="center">

<img src="https://img.shields.io/badge/Flask-3.x-black?style=for-the-badge&logo=flask" />
<img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react" />
<img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql" />
<img src="https://img.shields.io/badge/Redis-7-DC382D?style=for-the-badge&logo=redis" />
<img src="https://img.shields.io/badge/Celery-5-37814A?style=for-the-badge&logo=celery" />
<img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker" />
<img src="https://img.shields.io/badge/ReportLab-PDF-orange?style=for-the-badge" />

# Traveloop

### *Plan smarter. Travel better.*

**The all-in-one travel planning workspace — itineraries, budgets, packing, real-time collaboration, AI-powered suggestions, and PDF exports, all in one place.**

[Features](#features) · [Architecture](#architecture) · [Database](#database) · [API](#api) · [Security](#security) · [Scalability](#scalability) · [Setup](#setup) · [Team](#team)

</div>

---

## What is Traveloop?

Travel planning is broken. Your itinerary lives in a Google Doc, your budget in a spreadsheet, your packing list in a notes app, and your friends suggestions scattered across WhatsApp. Traveloop fixes that.

It is a full-stack web application that brings every part of trip planning into one coherent workspace. You create a trip, build your route stop by stop, schedule activities, track spending, manage your packing list, write journal notes, and share the whole thing with a single link — all without leaving the app.

We built it for the hackathon to demonstrate what a production-grade travel platform looks like when you take infrastructure, security, and user experience seriously from day one. Every feature is wired end-to-end: the React frontend talks to a real Flask API, which writes to PostgreSQL, caches in Redis, and offloads heavy work to Celery workers.

---
## Features

### Core Planning Workflow

**Trip Management**
Create, edit, and delete trips with names, dates, descriptions, and optional cover images. Every trip is a self-contained workspace — all your stops, activities, expenses, notes, and packing items live inside it. Ownership is enforced at every API layer so no user can ever touch another user's data.

**Itinerary Builder**
Add cities as stops in any order. Expand each stop to browse and schedule local activities from the catalog. The builder shows cost and duration for every activity so you can plan realistically. Stop locking prevents two collaborators from editing the same stop at the same time.

**Budget Tracker**
Two sources of truth: activity costs pulled automatically from your itinerary, and manual expenses you add yourself (transport, accommodation, food, etc.). See a breakdown by category with visual progress bars and a per-day average. The Smart Budget Health widget gives you a live 0–100 score with anomaly alerts.

**Packing Checklist**
Categorized packing list with one-tap toggle for packed/unpacked status. Progress bar shows how ready you are. Reset all items with one click to reuse the list on your next trip.

**Trip Journal**
Free-form notes tied to a trip or a specific stop. Timestamped entries create a natural journal. Useful for confirmation numbers, local tips, or anything you want to remember.

**Public Share Links**
Generate a unique, unguessable URL for any trip. Anyone with the link can view the full itinerary — no account required. Revoke access at any time. Tokens are 256-bit cryptographically random strings.

---

### Advanced Features

**1. Collaborative Real-time Presence**
See who else is viewing the same trip right now. Avatar bubbles appear in the header showing each collaborator's initials and a unique colour. Built on Redis sorted sets with 30-second TTL heartbeats — no WebSocket server required. Works across all app instances because state lives in Redis, not in any single process.

**2. Stop Locking**
When you expand a stop to edit it, the system acquires a Redis-backed exclusive lock using `SET NX`. Other users see a red "Locked by [name]" badge and cannot edit that stop simultaneously. Locks expire automatically after 20 seconds of inactivity, preventing deadlocks even if a browser crashes.

**3. Smart Budget Health Score**
A 0–100 health score with four detection rules: over-budget-limit, projected overspend vs city cost-index benchmarks, daily rate anomaly, and category concentration. Computed by a Celery background task when workers are running, or synchronously as a fallback. Results cached in Redis for 5 minutes. The frontend renders a live SVG ring gauge with anomaly alerts and actionable tips.

**4. AI Magic Fill**
One button auto-schedules the most popular activities for a stop across your planned days. The backend picks activities ordered by cost (budget-friendly proxy for popularity), distributes them across days, and skips duplicates already scheduled. No external AI API needed — pure database intelligence.

**5. PDF Boarding Pass Export**
Generate a printable PDF of your full itinerary. Uses ReportLab to render a branded document with trip summary, per-stop activity tables, costs, and durations. Three-tier execution: Redis cache hit returns instantly, Celery worker generates async when available, synchronous fallback when no worker is running. The frontend shows a three-state button: idle → generating → download ready.

---
## Features

### Core Planning Workflow

**Trip Management**
Create, edit, and delete trips with names, dates, descriptions, and optional cover images. Every trip is a self-contained workspace. Ownership is enforced at every API layer so no user can ever touch another user's data.

**Itinerary Builder**
Add cities as stops in any order. Expand each stop to browse and schedule local activities from the catalog. Stop locking prevents two collaborators from editing the same stop simultaneously.

**Budget Tracker**
Activity costs pulled automatically from your itinerary plus manual expenses. See a breakdown by category with progress bars and a per-day average. The Smart Budget Health widget gives a live 0-100 score with anomaly alerts.

**Packing Checklist**
Categorized packing list with one-tap toggle. Progress bar shows readiness. Reset all items to reuse on your next trip.

**Trip Journal**
Free-form notes tied to a trip or a specific stop. Timestamped entries. Useful for confirmation numbers, local tips, or anything you want to remember.

**Public Share Links**
Generate a unique, unguessable URL for any trip. Anyone with the link can view the full itinerary without an account. Revoke access at any time. Tokens are 256-bit cryptographically random strings.

---

### Advanced Features

**1. Collaborative Real-time Presence**
See who else is viewing the same trip right now. Avatar bubbles in the header show each collaborator's initials and a unique colour. Built on Redis sorted sets with 30-second TTL heartbeats. Works across all app instances because state lives in Redis, not in any single process.

**2. Stop Locking**
Expanding a stop acquires a Redis exclusive lock via SET NX. Other users see a red Locked badge. Locks expire after 20 seconds of inactivity, preventing deadlocks even if a browser crashes.

**3. Smart Budget Health Score**
A 0-100 score with four detection rules: over-budget-limit, projected overspend vs city cost-index benchmarks, daily rate anomaly, and category concentration. Computed by Celery when workers are running, synchronously as fallback. Cached in Redis 5 minutes.

**4. AI Magic Fill**
One button auto-schedules the most popular activities for a stop across your planned days. Pure database intelligence - no external AI API needed.

**5. PDF Boarding Pass Export**
Generate a printable PDF using ReportLab. Three-tier execution: Redis cache hit returns instantly, Celery worker generates async when available, synchronous fallback when no worker is running.

---

## Architecture

The system uses a layered, stateless architecture. Every application instance is identical and shares no local state. All shared state lives in PostgreSQL or Redis, which means you can add or remove app instances at any time without coordination.

Security and scalability mechanisms are annotated directly in the diagram below.

```
                        ┌──────────────────────────────────────────┐
                        │           CLIENT BROWSER                 │
                        │   React 18 SPA  (Vite + React Router)    │
                        │                                          │
                        │  [SEC] credentials:'include' on every    │
                        │        fetch — session cookie sent        │
                        │  [SEC] 401 handler redirects to /login   │
                        │        (skipped when already on auth pg) │
                        │  [SCL] SPA served from Flask /dist —     │
                        │        no separate static server needed  │
                        └──────────────────┬───────────────────────┘
                                           │ HTTPS
                                           ▼
                        ┌──────────────────────────────────────────┐
                        │         NGINX LOAD BALANCER              │
                        │   Round-robin across app instances       │
                        │                                          │
                        │  [SCL] Horizontal scaling — add more     │
                        │        app containers, zero code change  │
                        │  [SEC] Terminates TLS, sets HSTS header  │
                        └────────┬──────────────┬──────────────────┘
                                 │              │
                    ┌────────────┘              └────────────┐
                    ▼                                        ▼
       ┌────────────────────┐               ┌────────────────────┐
       │   Flask App 1      │               │   Flask App 2/3    │
       │   :5001            │  . . . . . .  │   :5002 / :5003    │
       │                    │               │                    │
       │  [SEC] Flask-Login │               │  [SCL] Stateless   │
       │        session     │               │        — any inst  │
       │        protection  │               │        serves any  │
       │  [SEC] Bleach XSS  │               │        request     │
       │        sanitize    │               │  [SEC] Same sec    │
       │  [SEC] Ownership   │               │        stack on    │
       │        checks on   │               │        every inst  │
       │        every route │               │                    │
       │  [SEC] CSRF tokens │               │                    │
       │  [SEC] Sec headers │               │                    │
       │        on every    │               │                    │
       │        response    │               │                    │
       └────────┬───────────┘               └────────────────────┘
                │
     ┌──────────┴──────────────────────────────────┐
     │                                             │
     ▼                                             ▼
┌──────────────────────────┐      ┌──────────────────────────────────┐
│     PostgreSQL 16        │      │           Redis 7                │
│                          │      │                                  │
│  Primary  (all writes)   │      │  DB 0  sessions (Flask-Session)  │
│  Replica  (read routes)  │      │  DB 0  presence heartbeats       │
│                          │      │  DB 0  stop locks  (SET NX TTL)  │
│  [SEC] Parameterised     │      │  DB 0  budget health cache       │
│        queries via ORM   │      │  DB 0  PDF cache                 │
│        — no SQL inject   │      │  DB 1  Celery task broker        │
│  [SEC] FK constraints    │      │  DB 2  rate-limit counters       │
│        enforce ownership │      │                                  │
│  [SCL] Read replica      │      │  [SCL] All instances share one   │
│        offloads catalog  │      │        Redis — any node can      │
│        and search routes │      │        serve any session         │
│  [SCL] Paginated queries │      │  [SEC] TTL on every key —        │
│        hard-bounded at   │      │        stale locks/sessions      │
│        50 rows/page      │      │        self-clean automatically  │
└──────────────────────────┘      └──────────────┬───────────────────┘
                                                 │
                                                 ▼
                                  ┌──────────────────────────────────┐
                                  │        Celery Workers            │
                                  │                                  │
                                  │  calculate_budget_health task    │
                                  │  generate_trip_pdf_task          │
                                  │  process_upload_to_s3 task       │
                                  │  send_trip_reminder task         │
                                  │                                  │
                                  │  [SCL] Workers are stateless —   │
                                  │        scale independently of    │
                                  │        web tier                  │
                                  │  [SCL] Three-tier fallback:      │
                                  │        1. Redis cache hit        │
                                  │        2. Celery async (prod)    │
                                  │        3. Sync fallback (dev)    │
                                  │  [SEC] Tasks run with app        │
                                  │        context — same ownership  │
                                  │        checks as web routes      │
                                  └──────────────────────────────────┘
```

### How security flows through the stack

Every request passes through these layers in order:

1. **Nginx** — TLS termination, HSTS header injection
2. **Flask-Limiter** — rate limit check against Redis (200/day, 50/hour per IP)
3. **Flask-Login** — session cookie validated against Redis session store
4. **Route handler** — ownership check via get_owned_trip_or_404(trip_id, current_user.id)
5. **Bleach** — free-text fields sanitized before DB write
6. **SQLAlchemy ORM** — parameterized queries, no raw SQL
7. **egister_security()** — security headers appended to every response

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
