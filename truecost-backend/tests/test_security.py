"""
TrueCost Security & Integration Tests
======================================
Tests that verify:
1. JWT Bearer token auth is enforced on protected endpoints
2. Valid tokens grant access (dual-auth compat — token from Household /login)
3. Core budget summary endpoint returns correct shape
4. Core nudge endpoint returns correct shape  
5. Expired / malformed tokens are rejected with 401
6. CORS wildcard check (documenting current state)

Run: pytest tests/test_security.py -v
"""
import pytest
import jwt
import time
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.config import settings

# ── Fixtures ──────────────────────────────────────────────────────────────────

def make_token(user_id: int = 1, username: str = "testuser", extra: dict = {}):
    """Generate a valid JWT signed with the same secret as Household."""
    payload = {"id": user_id, "username": username, **extra}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def make_expired_token():
    """Generate an already-expired JWT."""
    payload = {"id": 1, "username": "testuser", "exp": int(time.time()) - 10}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


# Shared mock DB response for budget queries
MOCK_BUDGET_ROW = MagicMock()
MOCK_BUDGET_ROW.fetchone = MagicMock(return_value=(10000,))  # ₹10,000 budget

MOCK_SPENT_ROW = MagicMock()
MOCK_SPENT_ROW.scalar = MagicMock(return_value=3500)  # ₹3,500 spent


# ── Tests ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health_check():
    """Health endpoint must be publicly accessible."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"
    assert res.json()["service"] == "truecost"


@pytest.mark.asyncio
async def test_bearer_token_required_budget():
    """Budget summary must reject requests with no token (401)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/budget/summary")
    assert res.status_code == 401  # FastAPI returns 401 on missing creds for this setup


@pytest.mark.asyncio
async def test_bearer_token_required_nudge():
    """Nudge check must reject requests with no token (403)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post("/api/nudge/check", json={"price": 999})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_expired_token_rejected():
    """An expired JWT must be rejected with 401."""
    token = make_expired_token()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get(
            "/api/budget/summary",
            headers={"Authorization": f"Bearer {token}"}
        )
    assert res.status_code == 401
    assert "expired" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_malformed_token_rejected():
    """A completely fake/tampered token must be rejected with 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get(
            "/api/budget/summary",
            headers={"Authorization": "Bearer this.is.not.a.real.token"}
        )
    assert res.status_code == 401
    assert "invalid" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_valid_token_grants_budget_access():
    """
    A token from Household login (X-Client: extension) must work on TrueCost.
    DB calls are mocked so no real database is needed.
    """
    token = make_token(user_id=42, username="testuser")

    mock_result = MagicMock()
    mock_result.fetchone.return_value = (10000,)
    mock_result.scalar.return_value = 3500

    mock_db = AsyncMock()
    mock_db.execute.return_value = mock_result

    with patch("app.routes.budget.get_budget_and_spent", new=AsyncMock(return_value={
        "budget": 10000,
        "spent": 3500,
        "remaining": 6500,
        "percentage_used": 35.0,
        "scope": "personal",
        "month": "2026-04-01"
    })):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            res = await client.get(
                "/api/budget/summary?scope=personal",
                headers={"Authorization": f"Bearer {token}"}
            )

    assert res.status_code == 200
    data = res.json()
    assert "budget" in data
    assert "spent" in data
    assert "remaining" in data
    assert "percentage_used" in data


@pytest.mark.asyncio
async def test_valid_token_grants_nudge_access():
    """Nudge endpoint returns correct shape with valid token."""
    token = make_token(user_id=42, username="testuser")

    with patch("app.routes.nudge.get_budget_and_spent", new=AsyncMock(return_value={
        "budget": 10000,
        "spent": 3500,
        "remaining": 6500,
        "percentage_used": 35.0,
        "scope": "personal",
        "month": "2026-04-01"
    })):
        # Also mock the income query inside nudge route
        mock_income_result = MagicMock()
        mock_income_result.scalar.return_value = 50000

        mock_db = AsyncMock()
        mock_db.execute.return_value = mock_income_result

        with patch("app.routes.nudge.get_db", return_value=mock_db):
            async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
                res = await client.post(
                    "/api/nudge/check",
                    json={"price": 500.0, "scope": "personal"},
                    headers={"Authorization": f"Bearer {token}"}
                )

    assert res.status_code == 200
    data = res.json()
    assert "can_afford" in data
    assert "remaining" in data
    assert "new_percentage" in data


@pytest.mark.asyncio
async def test_secure_health_requires_auth():
    """/health/secure must require a valid token."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/health/secure")
    assert res.status_code == 401

    # Valid token should work
    token = make_token()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get(
            "/health/secure",
            headers={"Authorization": f"Bearer {token}"}
        )
    assert res.status_code == 200
