# TrueCost — Product Requirements Document

**Version:** 1.0
**Date:** 2026-03-22
**Product Owner:** Deepak Gadamsetty

---

## 1. Vision

TrueCost is a browser extension that helps users practice financial discipline by nudging them away from impulse purchases while shopping online. It uses real-time budget and expense data from the Household app to guide spending decisions.

**One-liner:** _"Your budget, watching your back while you shop."_

---

## 2. Problem Statement

People track expenses and set budgets in apps like Household — but by the time they open those apps, the impulse purchase has already happened. There's a gap between **planning** (budgeting) and **action** (shopping). TrueCost bridges that gap by being present at the moment of decision.

---

## 3. Target Users

- Existing Household app users who want real-time spending awareness
- Users who struggle with impulse purchases on e-commerce sites
- Households that share budgets and want accountability

---

## 4. Core Features (MVP)

### 4.1 Shared Authentication
- Common account with Household app (same username/password)
- User logs in once via extension popup; token is stored locally
- No separate registration — account must exist in Household first

### 4.2 Budget Awareness Badge
- Extension icon shows a color-coded badge:
  - **Green** — under 70% of monthly budget spent
  - **Yellow** — 70-90% of budget spent
  - **Orange** — 90-100% of budget spent
  - **Red** — over budget
- Badge updates periodically (every 30 minutes) and on-demand

### 4.3 Quick Popup Dashboard
- Click the extension icon to see:
  - Monthly budget remaining (amount + percentage)
  - Top spending categories this month
  - Recent transactions (last 5)
  - "Can I afford this?" quick calculator (enter an amount, see impact on budget)

### 4.4 Shopping Page Nudge (Phase 2)
- On supported e-commerce sites (Amazon, Flipkart, etc.), detect product prices
- Show a small overlay/banner:
  - "This ₹X purchase would put you at Y% of your monthly budget"
  - Classify the purchase: Need / Want / Indulge (user picks)
  - "Cooling off" timer — suggest waiting 24 hours for Want/Indulge items

### 4.5 Quick Expense Logging (Phase 2)
- After a purchase, prompt user to log it directly from the extension
- Creates a transaction in Household via the API

---

## 5. Features (Post-MVP)

| Feature | Description |
|---------|-------------|
| Category Budget Alerts | Notify when a specific category (e.g., "Food") hits its limit |
| Wishlist Tracker | Save items and track price changes; buy when within budget |
| Household Mode | See combined household budget status, not just personal |
| Spending Streaks | Gamification — "5 days under budget!" |
| Weekly Digest | Summary notification of spending patterns |

---

## 6. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Extension Size | < 500KB (no heavy frameworks) |
| API Response Time | < 200ms for budget queries |
| Token Security | Stored in `chrome.storage.local`, never in cookies/localStorage |
| Supported Browsers | Chrome (primary), Edge (Chromium-based) |
| Offline Mode | Show last-known budget status; sync when online |

---

## 7. What TrueCost is NOT

- Not a standalone expense tracker (that's Household's job)
- Not a price comparison tool
- Not a coupon/deal finder
- Not a financial advisor — it shows data, user decides

---

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| Daily Active Users | 50% of Household users install TrueCost |
| Impulse Reduction | Users report 30% fewer unplanned purchases |
| Budget Adherence | 20% more users stay within monthly budget |
| Extension Retention | 60% still active after 30 days |

---

## 9. Technical Constraints

- **Data Source:** All financial data comes from Household's PostgreSQL database
- **Auth:** Reuses Household's JWT tokens — TrueCost backend validates against same user table
- **Backend:** Python + FastAPI (separate service from Household's Node.js backend)
- **Extension:** Chrome Manifest V3 (service workers, no persistent background pages)
- **No new database:** TrueCost backend reads from Household's existing PostgreSQL; it does NOT have its own database
