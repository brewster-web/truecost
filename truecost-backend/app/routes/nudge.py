from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db
from app.auth import verify_token
from app.services.budget_service import get_budget_and_spent
from pydantic import BaseModel

router = APIRouter()

WORKING_DAYS_PER_MONTH = 22
HOURS_PER_DAY = 8


class NudgeRequest(BaseModel):
    price: float
    scope: str = "personal"


@router.post("/api/nudge/check")
async def check_nudge(
    body: NudgeRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(verify_token)
):
    user_id = user["id"]
    data = await get_budget_and_spent(db, user_id, body.scope)

    new_spent      = data["spent"] + body.price
    new_percentage = round((new_spent / data["budget"] * 100), 1) if data["budget"] > 0 else 0

    # Get monthly income
    from datetime import datetime, date
    current_month = date(datetime.now().year, datetime.now().month, 1)

    income_result = await db.execute(
        text("""
            SELECT COALESCE(SUM(amount), 0)
            FROM income
            WHERE user_id = :user_id
            AND DATE_TRUNC('month', month) = :month
        """),
        {"user_id": user_id, "month": current_month}
    )
    monthly_income = float(income_result.scalar())

    # Calculate hours equivalent
    hours_equivalent = None
    if monthly_income > 0:
        hourly_rate      = monthly_income / (WORKING_DAYS_PER_MONTH * HOURS_PER_DAY)
        hours_equivalent = round(body.price / hourly_rate, 1)

    return {
        "price":            body.price,
        "scope":            data["scope"],
        "budget":           data["budget"],
        "spent":            data["spent"],
        "remaining":        data["remaining"],
        "new_percentage":   new_percentage,
        "can_afford":       body.price <= data["remaining"],
        "monthly_income":   monthly_income,
        "hours_equivalent": hours_equivalent,
    }