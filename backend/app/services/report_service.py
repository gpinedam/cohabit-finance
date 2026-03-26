"""
Report service — monthly summaries and expense history.
"""
from collections import defaultdict
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.couple import CoupleMember
from app.models.expense import Expense, ExpenseSplit
from app.models.user import User
from app.schemas.expense import ExpenseRead, SplitRead


def _check_membership(db: Session, couple_id: int, current_user_id: int) -> None:
    members = (
        db.query(CoupleMember)
        .filter(CoupleMember.couple_id == couple_id, CoupleMember.user_id == current_user_id)
        .first()
    )
    if not members:
        raise HTTPException(status_code=403, detail="No perteneces a esta pareja")


def _build_expense_read(expense: Expense, db: Session) -> ExpenseRead:
    splits = db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == expense.id).all()
    return ExpenseRead(
        id=expense.id,
        couple_id=expense.couple_id,
        paid_by=expense.paid_by,
        category=expense.category,
        subcategory=expense.subcategory,
        description=expense.description,
        total_amount=expense.total_amount,
        split_type=expense.split_type,
        created_at=expense.created_at,
        splits=[SplitRead.model_validate(s) for s in splits],
    )


def get_history(db: Session, couple_id: int, current_user_id: int) -> list[dict]:
    _check_membership(db, couple_id, current_user_id)

    expenses = db.query(Expense).filter(Expense.couple_id == couple_id).all()
    months: dict[tuple, dict] = defaultdict(lambda: {"total": Decimal("0"), "count": 0, "by_category": {}})

    for e in expenses:
        key = (e.created_at.year, e.created_at.month)
        months[key]["total"] += Decimal(str(e.total_amount))
        months[key]["count"] += 1
        cat = e.category
        months[key]["by_category"][cat] = months[key]["by_category"].get(cat, Decimal("0")) + Decimal(str(e.total_amount))

    result = []
    for (year, month), data in sorted(months.items(), reverse=True):
        result.append({
            "year": year,
            "month": month,
            "total": round(data["total"], 2),
            "count": data["count"],
            "by_category": {k: round(v, 2) for k, v in data["by_category"].items()},
        })
    return result


def get_monthly(db: Session, couple_id: int, year: int, month: int, current_user_id: int) -> dict:
    _check_membership(db, couple_id, current_user_id)

    expenses = (
        db.query(Expense)
        .filter(Expense.couple_id == couple_id)
        .all()
    )
    month_expenses = [
        e for e in expenses
        if e.created_at.year == year and e.created_at.month == month
    ]

    total = Decimal("0")
    by_category: dict[str, Decimal] = {}
    for e in month_expenses:
        amt = Decimal(str(e.total_amount))
        total += amt
        by_category[e.category] = by_category.get(e.category, Decimal("0")) + amt

    return {
        "year": year,
        "month": month,
        "total": round(total, 2),
        "count": len(month_expenses),
        "by_category": {k: round(v, 2) for k, v in by_category.items()},
        "expenses": [_build_expense_read(e, db) for e in sorted(month_expenses, key=lambda x: x.created_at, reverse=True)],
    }
