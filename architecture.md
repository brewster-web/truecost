# TrueCost — Architecture Document

**Last Updated:** 2026-03-22
**Status:** Phase 1 — Project Setup

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER'S BROWSER                          │
│                                                                 │
│  ┌───────────────────────┐    ┌──────────────────────────────┐ │
│  │   Household Web App   │    │    TrueCost Extension        │ │
│  │   (React SPA)         │    │    (Chrome Manifest V3)      │ │
│  │   Port: 5173          │    │                              │ │
│  └──────────┬────────────┘    │  ┌────────┐ ┌────────────┐  │ │
│             │                 │  │ Popup  │ │ Content    │  │ │
│             │                 │  │ UI     │ │ Scripts    │  │ │
│             │                 │  └───┬────┘ └─────┬──────┘  │ │
│             │                 │      │            │          │ │
│             │                 │  ┌───┴────────────┴───┐      │ │
│             │                 │  │  Service Worker     │      │ │
│             │                 │  │  (Background)       │      │ │
│             │                 │  └─────────┬───────────┘      │ │
│             │                 └─────────────┼────────────────┘ │
└─────────────┼───────────────────────────────┼──────────────────┘
              │                               │
              │ HTTP :3001                    │ HTTP :8000
              │                               │
┌─────────────┼───────────────────────────────┼──────────────────┐
│             │          BACKEND LAYER        │                  │
│  ┌──────────▼────────────┐    ┌─────────────▼──────────────┐  │
│  │  Household Backend    │    │  TrueCost Backend          │  │
│  │  Node.js + Express    │    │  Python + FastAPI          │  │
│  │  Port: 3001           │    │  Port: 8000                │  │
│  │                       │    │                            │  │
│  │  - Auth (JWT)         │    │  - Auth (validate JWT)     │  │
│  │  - Transactions CRUD  │    │  - Budget summary          │  │
│  │  - Budget CRUD        │    │  - Spending analysis       │  │
│  │  - Income CRUD        │    │  - Nudge logic             │  │
│  │  - Investments CRUD   │    │  - READ-ONLY data access   │  │
│  └──────────┬────────────┘    └─────────────┬──────────────┘  │
│             │                               │                  │
│             └───────────┬───────────────────┘                  │
│                         │                                      │
│              ┌──────────▼──────────┐                           │
│              │    PostgreSQL       │                            │
│              │    (Shared DB)      │                            │
│              │                     │                            │
│              │  - users            │                            │
│              │  - transactions     │                            │
│              │  - monthly_budget   │                            │
│              │  - category_budgets │                            │
│              │  - income           │                            │
│              │  - investments      │                            │
│              │  - households       │                            │
│              └─────────────────────┘                           │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Details

### 2.1 TrueCost Backend (Python + FastAPI)

**Purpose:** Serve pre-computed budget insights to the extension. READ-ONLY access to Household's database.

**Why a separate backend?**
- Household backend is for CRUD operations (create, read, update, delete)
- TrueCost backend is for READ + COMPUTE (aggregations, nudge logic, summaries)
- Keeps concerns separated — extension-specific logic doesn't bloat Household
- Different language/framework allows learning Python/FastAPI

**Directory Structure (planned):**
```
truecost-backend/
├── app/
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Environment variables, DB URL
│   ├── database.py          # SQLAlchemy / asyncpg connection
│   ├── auth.py              # JWT validation (shared secret with Household)
│   ├── routes/
│   │   ├── health.py        # Health check endpoint
│   │   ├── budget.py        # Budget summary endpoints
│   │   ├── spending.py      # Spending analysis endpoints
│   │   └── nudge.py         # Nudge/recommendation endpoints
│   ├── services/
│   │   ├── budget_service.py    # Budget computation logic
│   │   ├── spending_service.py  # Spending aggregation logic
│   │   └── nudge_service.py     # Nudge rules engine
│   └── models/
│       └── schemas.py       # Pydantic response models
├── requirements.txt
├── .env
└── .env.example
```

**Key API Endpoints (planned):**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Service health check |
| GET | `/api/budget/summary` | Monthly budget vs spent, remaining, percentage |
| GET | `/api/budget/categories` | Per-category budget status |
| GET | `/api/spending/recent` | Last N transactions |
| GET | `/api/spending/by-category` | Spending grouped by category |
| POST | `/api/nudge/check` | "Can I afford this?" — takes amount, returns impact |

### 2.2 Chrome Extension (Manifest V3)

**Directory Structure (planned):**
```
truecost-extension/
├── manifest.json            # Extension manifest (V3)
├── background/
│   └── service-worker.js    # Background tasks, badge updates, alarms
├── popup/
│   ├── popup.html           # Popup UI
│   ├── popup.css            # Popup styles
│   └── popup.js             # Popup logic
├── content/
│   └── shopping-detector.js # Injected into shopping sites (Phase 2)
├── lib/
│   ├── api.js               # TrueCost API client
│   └── auth.js              # Token storage & management
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── options/                  # Settings page (Phase 2)
    ├── options.html
    └── options.js
```

**Key Extension Concepts:**
- **Service Worker** (background): Runs periodically, fetches budget data, updates badge
- **Popup**: Small UI shown when clicking the extension icon
- **Content Script**: Injected into shopping websites to show nudges (Phase 2)
- **chrome.storage.local**: Stores JWT token and cached budget data
- **chrome.alarms**: Periodic badge refresh (every 30 min)

### 2.3 Shared Database (PostgreSQL)

TrueCost backend connects to the **same PostgreSQL database** as Household. It does NOT create new tables (MVP).

**Tables TrueCost reads from:**

| Table | What TrueCost Uses It For |
|-------|---------------------------|
| `users` | Validate user exists, get user_id |
| `transactions` | Calculate spending totals, recent transactions |
| `monthly_budget` | Get budget amount for current month |
| `category_budgets` | Per-category budget limits |
| `households` | Determine household scope |
| `household_members` | Check household membership |

### 2.4 Authentication Flow

```
Extension                    TrueCost Backend              Household DB
   │                              │                            │
   │  1. User enters             │                            │
   │     username + password      │                            │
   │                              │                            │
   │  2. POST /api/auth/login ───►│                            │
   │     {username, password}     │                            │
   │                              │  3. Query users table ────►│
   │                              │     Verify bcrypt hash     │
   │                              │◄──── user record ──────────│
   │                              │                            │
   │                              │  4. Sign JWT with          │
   │                              │     SAME secret as         │
   │                              │     Household backend      │
   │◄── 5. Return JWT ───────────│                            │
   │                              │                            │
   │  6. Store token in           │                            │
   │     chrome.storage.local     │                            │
   │                              │                            │
   │  7. All subsequent requests  │                            │
   │     include Bearer token ───►│  8. Verify JWT, extract    │
   │                              │     user_id, query data    │
```

**Critical:** Both Household backend and TrueCost backend must use the **same JWT_SECRET** environment variable so tokens are interchangeable.

---

## 3. Data Flow: Badge Update

```
1. chrome.alarms fires every 30 minutes
2. Service worker calls GET /api/budget/summary
3. TrueCost backend queries:
   - monthly_budget WHERE month = current_month AND user_id = X
   - SUM(amount) FROM transactions WHERE month = current_month AND user_id = X AND is_income = false
4. Returns: { budget: 100000, spent: 72000, remaining: 28000, percentage: 72 }
5. Service worker sets badge:
   - percentage < 70  → green badge
   - percentage 70-90 → yellow badge
   - percentage 90-100 → orange badge
   - percentage > 100 → red badge
```

---

## 4. Tech Stack Summary

| Component | Technology | Port |
|-----------|-----------|------|
| Household Frontend | React + Vite + Tailwind | 5173 |
| Household Backend | Node.js + Express | 3001 |
| TrueCost Backend | Python 3.9 + FastAPI | 8000 |
| TrueCost Extension | Chrome Manifest V3 (vanilla JS) | N/A |
| Database | PostgreSQL (shared) | 5432 |
| Auth | JWT (shared secret) | — |

---

## 5. Environment Variables (TrueCost Backend)

```
DATABASE_URL=postgresql://user:pass@localhost:5432/household
JWT_SECRET=<same as Household backend>
CORS_ORIGINS=chrome-extension://<extension-id>
PORT=8000
```

---

## 6. Current State

| Component | Status |
|-----------|--------|
| TrueCost Backend | Skeleton created — `main.py` with `/health` endpoint |
| TrueCost Extension | Not started |
| Auth integration | Not started |
| Budget endpoints | Not started |
| Nudge logic | Not started |


## 7. Development Phases

| Phase | Goal | Status |
|-------|------|--------|
| 1 | Hello World — FastAPI running, extension loads in Chrome | ✅ Complete |
| 2 | Auth — Login via extension, JWT validation in FastAPI | ✅ Complete |
| 3 | Budget Summary — Popup shows budget status, badge updates | ✅ Complete |
| 4 | Extension Popup — Login, scope toggle, remaining budget | ✅ Complete |
| 5 | Shopping Nudge — Amazon price detection, nudge banner | ✅ Complete |

## 8. Additional Features Built

| Feature | Description |
|---------|-------------|
| Personal / Household scope | Toggle between personal and combined household budget |
| Hours equivalent | Shows purchase cost in hours of work based on monthly income |
| Need / Want / Indulge | Classify purchases, cooling off timer for impulse buys |
| Household budget fix | Fixed budget constraint bug in Household backend |