"""
Report service — monthly summaries and expense history.
"""
from collections import defaultdict
from datetime import datetime
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import extract
from sqlalchemy.orm import Session

from app.models.couple import CoupleMember
from app.models.expense import Expense, ExpenseSplit
from app.models.extra_income import ExtraIncome
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
        scope=getattr(expense, "scope", "shared"),
        created_at=expense.created_at,
        splits=[SplitRead.model_validate(s) for s in splits],
    )


def get_history(db: Session, couple_id: int, current_user_id: int) -> list[dict]:
    _check_membership(db, couple_id, current_user_id)

    expenses = db.query(Expense).filter(
        Expense.couple_id == couple_id,
        Expense.scope == "shared",
    ).all()
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

    month_expenses = (
        db.query(Expense)
        .filter(
            Expense.couple_id == couple_id,
            Expense.scope == "shared",
            extract("year", Expense.created_at) == year,
            extract("month", Expense.created_at) == month,
        )
        .all()
    )

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


def get_personal_summary(
    db: Session, couple_id: int, year: int, month: int, current_user_id: int
) -> dict:
    """Personal financial breakdown for the current user."""
    _check_membership(db, couple_id, current_user_id)

    user = db.query(User).filter(User.id == current_user_id).first()
    income_base = Decimal(str(user.income or 0))
    savings_goal_pct = user.savings_goal_pct or 0
    emergency_fund_pct = user.emergency_fund_pct or 0

    # Extra income for this specific month
    extra_entry = (
        db.query(ExtraIncome)
        .filter(
            ExtraIncome.user_id == current_user_id,
            ExtraIncome.year == year,
            ExtraIncome.month == month,
        )
        .first()
    )
    extra_income = Decimal(str(extra_entry.amount)) if extra_entry else Decimal("0")
    income = income_base + extra_income

    # Compute user's portion of shared expenses this month from ExpenseSplit
    shared_expense_ids = [
        row.id for row in db.query(Expense.id)
        .filter(
            Expense.couple_id == couple_id,
            Expense.scope == "shared",
            extract("year", Expense.created_at) == year,
            extract("month", Expense.created_at) == month,
        )
        .all()
    ]
    splits_this_month = (
        db.query(ExpenseSplit)
        .filter(
            ExpenseSplit.expense_id.in_(shared_expense_ids),
            ExpenseSplit.user_id == current_user_id,
        )
        .all()
    )
    shared_spent = sum(Decimal(str(s.amount)) for s in splits_this_month)

    # Private expenses for this user this month
    private_expenses = (
        db.query(Expense)
        .filter(
            Expense.couple_id == couple_id,
            Expense.scope == "private",
            Expense.paid_by == current_user_id,
            extract("year", Expense.created_at) == year,
            extract("month", Expense.created_at) == month,
        )
        .all()
    )
    private_spent = sum(Decimal(str(e.total_amount)) for e in private_expenses)

    savings_reserved = (income * savings_goal_pct / 100).quantize(Decimal("0.01"))
    emergency_reserved = (income * emergency_fund_pct / 100).quantize(Decimal("0.01"))
    available = income - shared_spent - private_spent - savings_reserved - emergency_reserved

    return {
        "year": year,
        "month": month,
        "income": round(income, 2),
        "income_base": round(income_base, 2),
        "extra_income": round(extra_income, 2),
        "extra_income_note": extra_entry.note if extra_entry else None,
        "savings_goal_pct": savings_goal_pct,
        "emergency_fund_pct": emergency_fund_pct,
        "shared_spent": round(shared_spent, 2),
        "private_spent": round(private_spent, 2),
        "savings_reserved": round(savings_reserved, 2),
        "emergency_reserved": round(emergency_reserved, 2),
        "available": round(available, 2),
    }


def get_personal_tracker(
    db: Session, couple_id: int, current_user_id: int
) -> list[dict]:
    """Month-by-month personal financial breakdown from user registration to today."""
    _check_membership(db, couple_id, current_user_id)

    user = db.query(User).filter(User.id == current_user_id).first()
    income_base = Decimal(str(user.income or 0))
    savings_goal_pct = user.savings_goal_pct or 0
    emergency_fund_pct = user.emergency_fund_pct or 0

    # Build month list from user's registration month up to today (oldest first)
    now = datetime.utcnow()
    start = user.created_at or now
    months: list[tuple[int, int]] = []
    y, m = start.year, start.month
    while (y, m) <= (now.year, now.month):
        months.append((y, m))
        m += 1
        if m > 12:
            m = 1
            y += 1
    months_set = set(months)

    # All extra incomes for this user (one query)
    extra_map: dict[tuple, Decimal] = {
        (e.year, e.month): Decimal(str(e.amount))
        for e in db.query(ExtraIncome).filter(ExtraIncome.user_id == current_user_id).all()
    }

    # All shared expense IDs in this couple that fall within our months range
    shared_exps = (
        db.query(Expense)
        .filter(Expense.couple_id == couple_id, Expense.scope == "shared")
        .all()
    )
    shared_exp_id_to_month: dict[int, tuple] = {
        e.id: (e.created_at.year, e.created_at.month)
        for e in shared_exps
        if (e.created_at.year, e.created_at.month) in months_set
    }

    # Splits for this user from those expenses (one query)
    shared_by_month: dict[tuple, Decimal] = defaultdict(Decimal)
    if shared_exp_id_to_month:
        splits = (
            db.query(ExpenseSplit)
            .filter(
                ExpenseSplit.expense_id.in_(shared_exp_id_to_month.keys()),
                ExpenseSplit.user_id == current_user_id,
            )
            .all()
        )
        for s in splits:
            key = shared_exp_id_to_month[s.expense_id]
            shared_by_month[key] += Decimal(str(s.amount))

    # All private expenses for this user (one query)
    private_by_month: dict[tuple, Decimal] = defaultdict(Decimal)
    for e in (
        db.query(Expense)
        .filter(
            Expense.couple_id == couple_id,
            Expense.scope == "private",
            Expense.paid_by == current_user_id,
        )
        .all()
    ):
        key = (e.created_at.year, e.created_at.month)
        if key in months_set:
            private_by_month[key] += Decimal(str(e.total_amount))

    result = []
    for year, month in months:
        key = (year, month)
        extra = extra_map.get(key, Decimal("0"))
        income_total = income_base + extra
        shared_spent = shared_by_month.get(key, Decimal("0"))
        private_spent = private_by_month.get(key, Decimal("0"))
        savings_reserved = (income_total * savings_goal_pct / 100).quantize(Decimal("0.01"))
        emergency_reserved = (income_total * emergency_fund_pct / 100).quantize(Decimal("0.01"))
        available = income_total - shared_spent - private_spent - savings_reserved - emergency_reserved
        has_activity = shared_spent > 0 or private_spent > 0 or extra > 0
        result.append({
            "year": year,
            "month": month,
            "income_base": round(income_base, 2),
            "extra_income": round(extra, 2),
            "income_total": round(income_total, 2),
            "shared_spent": round(shared_spent, 2),
            "private_spent": round(private_spent, 2),
            "savings_reserved": round(savings_reserved, 2),
            "emergency_reserved": round(emergency_reserved, 2),
            "available": round(available, 2),
            "savings_goal_pct": savings_goal_pct,
            "emergency_fund_pct": emergency_fund_pct,
            "has_activity": has_activity,
        })
    return result
