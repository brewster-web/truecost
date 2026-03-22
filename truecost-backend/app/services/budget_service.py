from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime, date


def get_current_month():
    return date(datetime.now().year, datetime.now().month, 1)


async def get_household_id(db: AsyncSession, user_id: int):
    result = await db.execute(
        text("""
            SELECT household_id FROM household_members
            WHERE user_id = :user_id
            LIMIT 1
        """),
        {"user_id": user_id}
    )
    row = result.fetchone()
    return row[0] if row else None


async def get_budget_and_spent(db: AsyncSession, user_id: int, scope: str = "personal"):
    current_month = get_current_month()

    if scope == "household":
        household_id = await get_household_id(db, user_id)

        if not household_id:
            scope = "personal"
        else:
            # Household budget — user_id AND household_id match
            budget_result = await db.execute(
                text("""
                    SELECT amount FROM monthly_budget
                    WHERE user_id = :user_id
                    AND household_id = :household_id
                    AND month = :month
                """),
                {"user_id": user_id, "household_id": household_id, "month": current_month}
            )
            budget_row = budget_result.fetchone()
            budget = float(budget_row[0]) if budget_row else 0

            # Household spent — only transactions logged under this household
            spent_result = await db.execute(
                text("""
                    SELECT COALESCE(SUM(amount), 0)
                    FROM transactions
                    WHERE household_id = :household_id
                    AND DATE_TRUNC('month', date) = :month
                """),
                {"household_id": household_id, "month": current_month}
            )
            spent = float(spent_result.scalar())

            return {
                "month": str(current_month),
                "scope": "household",
                "budget": budget,
                "spent": spent,
                "remaining": budget - spent,
                "percentage_used": round((spent / budget * 100), 1) if budget > 0 else 0
            }

    # Personal budget — user_id matches, household_id is NULL
    budget_result = await db.execute(
        text("""
            SELECT amount FROM monthly_budget
            WHERE user_id = :user_id
            AND household_id IS NULL
            AND month = :month
        """),
        {"user_id": user_id, "month": current_month}
    )
    budget_row = budget_result.fetchone()
    budget = float(budget_row[0]) if budget_row else 0

    # Personal spent — only transactions with no household
    spent_result = await db.execute(
        text("""
            SELECT COALESCE(SUM(amount), 0)
            FROM transactions
            WHERE user_id = :user_id
            AND household_id IS NULL
            AND DATE_TRUNC('month', date) = :month
        """),
        {"user_id": user_id, "month": current_month}
    )
    spent = float(spent_result.scalar())

    return {
        "month": str(current_month),
        "scope": "personal",
        "budget": budget,
        "spent": spent,
        "remaining": budget - spent,
        "percentage_used": round((spent / budget * 100), 1) if budget > 0 else 0
    }