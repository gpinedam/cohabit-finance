from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user, get_db
from app.models.user import User
from app.services.balance_service import get_balance
from app.services.report_service import get_history, get_monthly

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/balance")
def balance(
    couple_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_balance(db, couple_id, current_user.id)


@router.get("/monthly")
def monthly(
    couple_id: int = Query(...),
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_monthly(db, couple_id, year, month, current_user.id)


@router.get("/history")
def history(
    couple_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_history(db, couple_id, current_user.id)
