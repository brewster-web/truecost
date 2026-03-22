# TrueCost — Project Context

**Purpose:** This file gives any new conversation the full context of what TrueCost is, where it stands, and how it relates to the Household app.

---

## What is TrueCost?

A Chrome browser extension + Python backend that helps users avoid impulse purchases by showing real-time budget status while they shop online. It uses data from the **Household** expense tracking app.

## Relationship to Household

- **Household** = the main app where users track expenses, set budgets, manage income
- **TrueCost** = a companion tool that lives in the browser and uses Household's data
- **Shared database** — TrueCost reads from the same PostgreSQL database (READ-ONLY)
- **Shared auth** — same user accounts, same JWT secret, tokens work across both systems
- **Separate backends** — Household runs on Node.js/Express (port 3001), TrueCost runs on Python/FastAPI (port 8000)

## Household App Summary (what TrueCost depends on)

### Database Tables TrueCost Cares About
- `users` — id, username, password_hash, display_name
- `transactions` — date, category, amount, expense_type (Need/Want/Indulge), user_id, household_id, is_income
- `monthly_budget` — month, amount, user_id, household_id
- `category_budgets` — month, category, amount, user_id
- `households` / `household_members` — for household-scope queries

### Household Auth Details
- JWT with 30-day expiry
- Token payload: `{ id, username, is_demo }`
- Password hashing: bcryptjs (cost: 10)
- Secret: `JWT_SECRET` env var (fallback: `'household_dev_secret'`)
- Data scoping: `scope=personal` (default) or `scope=household`

### Household API Base
- URL: `http://localhost:3001`
- Auth header: `Authorization: Bearer <token>`

## Repo Structure

```
truecost/                          ← This repo
├── PRD.md                         ← Product requirements
├── architecture.md                ← System design (source of truth)
├── context.md                     ← This file
├── CLAUDE.md                      ← AI assistant instructions
├── truecost-backend/              ← Python + FastAPI backend
│   ├── app/
│   │   └── main.py                ← Entry point (health endpoint exists)
│   ├── requirements.txt           ← (to be created)
│   └── .env                       ← (to be created)
└── truecost-extension/            ← Chrome extension
    ├── manifest.json              ← (to be created)
    ├── background/                ← Service worker
    ├── popup/                     ← Extension popup UI
    ├── content/                   ← Content scripts for shopping sites
    ├── lib/                       ← Shared utilities
    └── icons/                     ← Extension icons
```

## Development Phases

| Phase | Goal | Status |
|-------|------|--------|
| 1 | Hello World — FastAPI running, extension loads in Chrome | In Progress |
| 2 | Auth — Login via extension, JWT validation in FastAPI | Not Started |
| 3 | Budget Summary — Popup shows budget status, badge updates | Not Started |
| 4 | Shopping Nudge — Content scripts on e-commerce sites | Not Started |
| 5 | Quick Log — Log expenses from extension | Not Started |

## Developer Notes

- **Python version:** 3.9.6
- **Node version:** 24.14.0 (for Household)
- **Virtual env:** `.venv` in truecost root
- **Teaching mode:** Deepak is learning — provide step-by-step instructions, explain concepts, let him run commands manually
- **Household project location:** `../household/` (sibling directory)
