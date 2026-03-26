"""
Balance service — computes net balances and debts between couple members,
scoped to expenses created after the last settlement (if any).
"""
from datetime import datetime
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.couple import CoupleMember
from app.models.expense import Expense, ExpenseSplit
from app.models.settlement import Settlement
from app.models.user import User


def _last_settlement_dt(db: Session, couple_id: int) -> datetime | None:
    row = (
        db.query(Settlement)
        .filter(Settlement.couple_id == couple_id)
        .order_by(Settlement.settled_at.desc())
        .first()
    )
    return row.settled_at if row else None


def get_balance(db: Session, couple_id: int, current_user_id: int) -> dict:
    members = (
        db.query(User)
        .join(CoupleMember, CoupleMember.user_id == User.id)
        .filter(CoupleMember.couple_id == couple_id)
        .all()
    )
    if not members:
        raise HTTPException(status_code=404, detail="Pareja no encontrada")
    if current_user_id not in {m.id for m in members}:
        raise HTTPException(status_code=403, detail="No perteneces a esta pareja")

    member_ids   = [m.id for m in members]
    member_names = {m.id: m.name for m in members}

    # Only consider expenses after the last settlement
    since = _last_settlement_dt(db, couple_id)
    q = db.query(Expense).filter(Expense.couple_id == couple_id)
    if since:
        q = q.filter(Expense.created_at > since)
    expenses = q.all()

    paid:  dict[int, Decimal] = {uid: Decimal("0") for uid in member_ids}
    owed:  dict[int, Decimal] = {uid: Decimal("0") for uid in member_ids}
    total_expenses = Decimal("0")

    for expense in expenses:
        total_expenses += Decimal(str(expense.total_amount))
        paid[expense.paid_by] = paid.get(expense.paid_by, Decimal("0")) + Decimal(str(expense.total_amount))
        splits = db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == expense.id).all()
        for split in splits:
            if split.user_id in owed:
                owed[split.user_id] += Decimal(str(split.amount))

    net: dict[int, Decimal] = {uid: paid[uid] - owed[uid] for uid in member_ids}

    debts = []
    creditors = sorted([(uid, amt) for uid, amt in net.items() if amt > 0],  key=lambda x: -x[1])
    debtors   = sorted([(uid, -amt) for uid, amt in net.items() if amt < 0], key=lambda x: -x[1])

    ci, di = 0, 0
    while ci < len(creditors) and di < len(debtors):
        cid, c_amt = creditors[ci]
        did, d_amt = debtors[di]
        transfer = min(c_amt, d_amt)
        if transfer > Decimal("0.01"):
            debts.append({
                "from_user_id":   did,
                "from_user_name": member_names[did],
                "to_user_id":     cid,
                "to_user_name":   member_names[cid],
                "amount":         round(transfer, 2),
            })
        c_amt -= transfer
        d_amt -= transfer
        if c_amt <= Decimal("0.01"):
            ci += 1
        else:
            creditors[ci] = (cid, c_amt)
        if d_amt <= Decimal("0.01"):
            di += 1
        else:
            debtors[di] = (did, d_amt)

    return {
        "debts": debts,
        "since": since.isoformat() if since else None,
        "summary": {
            "total_expenses": round(total_expenses, 2),
            "paid_by_user":   {uid: round(v, 2) for uid, v in paid.items()},
            "owe_by_user":    {uid: round(v, 2) for uid, v in owed.items()},
            "net_by_user":    {uid: round(v, 2) for uid, v in net.items()},
            "member_names":   member_names,
        },
    }

    members = (
        db.query(User)
        .join(CoupleMember, CoupleMember.user_id == User.id)
        .filter(CoupleMember.couple_id == couple_id)
        .all()
    )
    if not members:
        raise HTTPException(status_code=404, detail="Pareja no encontrada")
    if current_user_id not in {m.id for m in members}:
        raise HTTPException(status_code=403, detail="No perteneces a esta pareja")

    member_ids = [m.id for m in members]
    member_names = {m.id: m.name for m in members}

    # paid[user_id] = total paid
    paid: dict[int, Decimal] = {uid: Decimal("0") for uid in member_ids}
    # owed[user_id] = total share they owe
    owed: dict[int, Decimal] = {uid: Decimal("0") for uid in member_ids}
    total_expenses = Decimal("0")

    expenses = db.query(Expense).filter(Expense.couple_id == couple_id).all()
    for expense in expenses:
        total_expenses += Decimal(str(expense.total_amount))
        paid[expense.paid_by] = paid.get(expense.paid_by, Decimal("0")) + Decimal(str(expense.total_amount))
        splits = db.query(ExpenseSplit).filter(ExpenseSplit.expense_id == expense.id).all()
        for split in splits:
            if split.user_id in owed:
                owed[split.user_id] += Decimal(str(split.amount))

    # net[user] = paid - owed  (positive = others owe them)
    net: dict[int, Decimal] = {uid: paid[uid] - owed[uid] for uid in member_ids}

    # Build debt list: creditor (net > 0) is owed by debtor (net < 0)
    debts = []
    creditors = sorted([(uid, amt) for uid, amt in net.items() if amt > 0], key=lambda x: -x[1])
    debtors = sorted([(uid, -amt) for uid, amt in net.items() if amt < 0], key=lambda x: -x[1])

    ci, di = 0, 0
    while ci < len(creditors) and di < len(debtors):
        cid, c_amt = creditors[ci]
        did, d_amt = debtors[di]
        transfer = min(c_amt, d_amt)
        if transfer > Decimal("0.01"):
            debts.append({
                "from_user_id": did,
                "from_user_name": member_names[did],
                "to_user_id": cid,
                "to_user_name": member_names[cid],
                "amount": round(transfer, 2),
            })
        c_amt -= transfer
        d_amt -= transfer
        if c_amt <= Decimal("0.01"):
            ci += 1
        else:
            creditors[ci] = (cid, c_amt)
        if d_amt <= Decimal("0.01"):
            di += 1
        else:
            debtors[di] = (did, d_amt)

    return {
        "debts": debts,
        "summary": {
            "total_expenses": round(total_expenses, 2),
            "paid_by_user": {uid: round(v, 2) for uid, v in paid.items()},
            "owe_by_user": {uid: round(v, 2) for uid, v in owed.items()},
            "net_by_user": {uid: round(v, 2) for uid, v in net.items()},
            "member_names": member_names,
        },
    }
