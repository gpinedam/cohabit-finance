from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user, get_db
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseRead, ExpenseUpdate, PrivateExpenseCreate
from app.services.expense_service import (
    create_expense,
    create_private_expense,
    delete_expense,
    get_expense,
    get_expenses,
    get_private_expenses,
    update_expense,
)

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.post("/", response_model=ExpenseRead, status_code=201)
def create(
    body: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_expense(db, body, current_user.id)


@router.get("/private", response_model=list[ExpenseRead])
def list_private(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=2000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_private_expenses(db, current_user.id, skip, limit)


@router.post("/private", response_model=ExpenseRead, status_code=201)
def create_private(
    body: PrivateExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_private_expense(db, body, current_user.id)


@router.get("/", response_model=list[ExpenseRead])
def list_expenses(
    couple_id: int = Query(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_expenses(db, couple_id, current_user.id, skip, limit)


@router.get("/{expense_id}", response_model=ExpenseRead)
def retrieve(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_expense(db, expense_id, current_user.id)


@router.patch("/{expense_id}", response_model=ExpenseRead)
def update(
    expense_id: int,
    body: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_expense(db, expense_id, body, current_user.id)


@router.delete("/{expense_id}", status_code=204)
def remove(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    delete_expense(db, expense_id, current_user.id)
