from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db
from app.auth import verify_token
from datetime import datetime, date
from app.services.budget_service import get_budget_and_spent

router = APIRouter()


@router.get("/api/budget/summary")
async def get_budget_summary(
    db: AsyncSession = Depends(get_db),
    user=Depends(verify_token),
    scope: str = Query(default="personal")
):
    return await get_budget_and_spent(db, user["id"], scope)
    user_id = user["id"]
    current_month = date(datetime.now().year, datetime.now().month, 1)

    #Get monthly budget
    budget_result = await db.execute(
        text("SELECT amount FROM monthly_budget WHERE user_id = :user_id AND month = :month"),
        {"user_id": user_id, "month": current_month}
    )
    budget_row = budget_result.fetchone()
    budget = float(budget_row[0]) if budget_row else 0

    #Get total spent this month
    spent_result = await db.execute(
        text("""
            SELECT COALESCE(SUM(amount), 0)
            FROM transactions
            WHERE user_id = :user_id
            AND DATE_TRUNC('month', date) = :month
        """),
        {"user_id": user_id, "month": current_month}
    )
    spent = float(spent_result.scalar())

    return {
        "month": current_month,
        "budget": budget,
        "spent": spent,
        "remaining": budget-spent,
        "percentage_used": round((spent / budget * 100), 1) if budget > 0 else 0
    }