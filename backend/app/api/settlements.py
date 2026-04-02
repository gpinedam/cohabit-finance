from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user, get_db
from app.models.couple import CoupleMember
from app.models.settlement import Settlement
from app.models.user import User
from app.services.balance_service import get_balance

router = APIRouter(prefix="/settlements", tags=["settlements"])


class SettlementCreate(BaseModel):
    couple_id: int
    note: str | None = None


class SettlementRead(BaseModel):
    id: int
    couple_id: int
    settled_by: int
    amount: float
    note: str | None
    settled_at: datetime

    model_config = {"from_attributes": True}


def _check_member(db: Session, couple_id: int, user_id: int) -> None:
    from fastapi import HTTPException
    m = db.query(CoupleMember).filter(
        CoupleMember.couple_id == couple_id,
        CoupleMember.user_id == user_id,
    ).first()
    if not m:
        raise HTTPException(status_code=403, detail="No perteneces a esta pareja")


@router.post("/", response_model=SettlementRead, status_code=201)
def create_settlement(
    body: SettlementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_member(db, body.couple_id, current_user.id)

    # Calculate the current net debt to record as settled amount
    balance = get_balance(db, body.couple_id, current_user.id)
    total_debt = sum(float(d["amount"]) for d in balance["debts"])

    settlement = Settlement(
        couple_id=body.couple_id,
        settled_by=current_user.id,
        amount=total_debt,
        note=body.note,
        settled_at=datetime.now(timezone.utc),
    )
    db.add(settlement)
    db.commit()
    db.refresh(settlement)
    return settlement


@router.get("/", response_model=list[SettlementRead])
def list_settlements(
    couple_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _check_member(db, couple_id, current_user.id)
    return (
        db.query(Settlement)
        .filter(Settlement.couple_id == couple_id)
        .order_by(Settlement.settled_at.desc())
        .all()
    )
