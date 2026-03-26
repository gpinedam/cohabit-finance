"""
Expense service — business logic for creating and retrieving expenses.
No FastAPI dependencies; receives a SQLAlchemy Session directly.
"""
from decimal import ROUND_DOWN, Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.couple import CoupleMember
from app.models.expense import Expense, ExpenseSplit
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseRead, SplitRead


def _get_couple_members(db: Session, couple_id: int) -> list[User]:
    members = (
        db.query(User)
        .join(CoupleMember, CoupleMember.user_id == User.id)
        .filter(CoupleMember.couple_id == couple_id)
        .all()
    )
    if not members:
        raise HTTPException(status_code=404, detail="Pareja no encontrada")
    return members


def _calculate_splits(
    split_type: str,
    total: Decimal,
    members: list[User],
    paid_by: int,
    custom_splits: list | None,
) -> list[tuple[int, Decimal, Decimal]]:
    """Returns list of (user_id, percentage, amount)."""
    two = Decimal("0.01")
    n = len(members)

    if split_type == "equal":
        base_amount = (total / n).quantize(two, rounding=ROUND_DOWN)
        results = [(m.id, (Decimal("100") / n).quantize(two, rounding=ROUND_DOWN), base_amount) for m in members]
        # Adjust rounding difference to last member
        diff = total - sum(r[2] for r in results)
        results[-1] = (results[-1][0], results[-1][1], results[-1][2] + diff)
        return results

    if split_type == "proportional":
        total_income = sum(float(m.income or 0) for m in members) or 1
        results = []
        for m in members:
            pct = Decimal(str(float(m.income or 0) / total_income * 100)).quantize(two, rounding=ROUND_DOWN)
            amt = (total * pct / 100).quantize(two, rounding=ROUND_DOWN)
            results.append((m.id, pct, amt))
        diff = total - sum(r[2] for r in results)
        results[-1] = (results[-1][0], results[-1][1], results[-1][2] + diff)
        return results

    if split_type == "on_me":
        return [
            (m.id, Decimal("100") if m.id == paid_by else Decimal("0"), total if m.id == paid_by else Decimal("0"))
            for m in members
        ]

    if split_type == "custom":
        results = []
        for cs in custom_splits:
            pct = cs.percentage.quantize(two)
            amt = (total * pct / 100).quantize(two, rounding=ROUND_DOWN)
            results.append((cs.user_id, pct, amt))
        diff = total - sum(r[2] for r in results)
        results[-1] = (results[-1][0], results[-1][1], results[-1][2] + diff)
        return results

    raise ValueError(f"split_type desconocido: {split_type}")


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


def update_expense(
    db: Session, expense_id: int, data: "ExpenseUpdate", current_user_id: int
) -> ExpenseRead:
    from app.schemas.expense import ExpenseUpdate  # avoid circular at module level
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")

    members = _get_couple_members(db, expense.couple_id)
    if current_user_id not in {m.id for m in members}:
        raise HTTPException(status_code=403, detail="No perteneces a esta pareja")

    old_amount = Decimal(str(expense.total_amount))
    new_amount = Decimal(str(data.total_amount)) if data.total_amount is not None else old_amount
    amount_changed = new_amount != old_amount

    if data.category is not None:
        expense.category = data.category
    if data.subcategory is not None:
        expense.subcategory = data.subcategory
    if data.description is not None:
        expense.description = data.description
    if data.total_amount is not None:
        expense.total_amount = new_amount

    if amount_changed:
        if expense.split_type == "custom":
            splits = db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == expense.id).all()
            scale = new_amount / old_amount
            for s in splits:
                s.amount = (Decimal(str(s.amount)) * scale).quantize(
                    Decimal("0.01"), rounding=ROUND_DOWN
                )
            total_split = sum(Decimal(str(s.amount)) for s in splits)
            diff = new_amount - total_split
            if splits:
                splits[-1].amount = Decimal(str(splits[-1].amount)) + diff
        else:
            db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == expense.id).delete()
            split_rows = _calculate_splits(
                expense.split_type, new_amount, members, expense.paid_by, None
            )
            for user_id, pct, amt in split_rows:
                db.add(ExpenseSplit(expense_id=expense.id, user_id=user_id, percentage=pct, amount=amt))

    db.commit()
    db.refresh(expense)
    return _build_expense_read(expense, db)


def delete_expense(db: Session, expense_id: int, current_user_id: int) -> None:
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")

    members = _get_couple_members(db, expense.couple_id)
    if current_user_id not in {m.id for m in members}:
        raise HTTPException(status_code=403, detail="No perteneces a esta pareja")

    db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == expense.id).delete()
    db.delete(expense)
    db.commit()


def create_expense(db: Session, data: ExpenseCreate, current_user_id: int) -> ExpenseRead:
    members = _get_couple_members(db, data.couple_id)
    member_ids = {m.id for m in members}

    if current_user_id not in member_ids:
        raise HTTPException(status_code=403, detail="No perteneces a esta pareja")

    expense = Expense(
        couple_id=data.couple_id,
        paid_by=current_user_id,
        category=data.category,
        subcategory=data.subcategory,
        description=data.description,
        total_amount=data.total_amount,
        split_type=data.split_type,
    )
    db.add(expense)
    db.flush()

    split_rows = _calculate_splits(
        data.split_type,
        data.total_amount,
        members,
        current_user_id,
        data.custom_splits,
    )
    for user_id, pct, amt in split_rows:
        db.add(ExpenseSplit(expense_id=expense.id, user_id=user_id, percentage=pct, amount=amt))

    db.commit()
    db.refresh(expense)
    return _build_expense_read(expense, db)


def get_expenses(db: Session, couple_id: int, current_user_id: int, skip: int = 0, limit: int = 50) -> list[ExpenseRead]:
    members = _get_couple_members(db, couple_id)
    if current_user_id not in {m.id for m in members}:
        raise HTTPException(status_code=403, detail="No perteneces a esta pareja")

    expenses = (
        db.query(Expense)
        .filter(Expense.couple_id == couple_id)
        .order_by(Expense.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_build_expense_read(e, db) for e in expenses]


def get_expense(db: Session, expense_id: int, current_user_id: int) -> ExpenseRead:
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")

    members = _get_couple_members(db, expense.couple_id)
    if current_user_id not in {m.id for m in members}:
        raise HTTPException(status_code=403, detail="No perteneces a esta pareja")

    return _build_expense_read(expense, db)
