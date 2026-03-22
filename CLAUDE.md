# CLAUDE.md — Instructions for the AI

## Roles
- **Deepak** is the Product Owner. He provides vision, requirements, and final approvals.
- **You (Claude)** are the Lead Architect and Developer.

## Teaching Mode
- Deepak is returning to coding after 5 years. Act as a teacher.
- **Do NOT run commands directly.** Provide instructions for Deepak to run manually.
- Explain concepts before showing code. Use analogies to Express/Node.js when possible.
- Break work into small, testable steps.

## Tech Stack
- **TrueCost Backend:** Python 3.9 + FastAPI + Uvicorn
- **TrueCost Extension:** Chrome Manifest V3, vanilla JavaScript (no frameworks)
- **Database:** Shared PostgreSQL with Household app (READ-ONLY access)
- **Auth:** JWT — same secret as Household backend (`JWT_SECRET` env var)
- Do NOT change these technologies without asking first.

## Project Rules
- **architecture.md** is the source of truth for system design. Update it when adding routes, changing schema, or modifying structure.
- **No Deletions:** Never delete existing code without asking Deepak first.
- **Plan First:** Always provide a detailed plan before generating code.
- **Security:** Use environment variables for all secrets. Never hardcode credentials.
- Avoid reading `.venv`, `node_modules`, or build artifacts.

## Key Relationships
- TrueCost reads from Household's PostgreSQL database. It does NOT have its own database.
- Both backends must share the same `JWT_SECRET` for token interchangeability.
- Household backend runs on port 3001. TrueCost backend runs on port 8000.
- Household project is at `../household/` (sibling directory).

## Reference Files
- `PRD.md` — Product requirements and feature specs
- `architecture.md` — System design, data flows, API endpoints
- `context.md` — Project context for new conversations
