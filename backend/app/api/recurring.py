"""
Recurring services API — manage fixed monthly service templates and their entries.
"""
import calendar
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user, get_db
from app.models.couple import CoupleMember
from app.models.expense import Expense, ExpenseSplit
from app.models.recurring import RecurringEntry, RecurringService
from app.models.user import User
from app.schemas.recurring import (
    PayEntryRequest,
    RecurringEntriesResponse,
    RecurringEntryRead,
    RecurringServiceCreate,
    RecurringServiceRead,
    RecurringServiceUpdate,
)

router = APIRouter(prefix="/recurring", tags=["recurring"])

WARNING_DAYS = 3  # entries due within this many days are flagged


# ── Helpers ───────────────────────────────────────────────────────────────────

def _assert_couple_member(db: Session, couple_id: int, user_id: int) -> list[User]:
    members = (
        db.query(User)
        .join(CoupleMember, CoupleMember.user_id == User.id)
        .filter(CoupleMember.couple_id == couple_id)
        .all()
    )
    if not members:
        raise HTTPException(status_code=404, detail="Pareja no encontrada")
    if user_id not in {m.id for m in members}:
        raise HTTPException(status_code=403, detail="No perteneces a esta pareja")
    return members


def _member_name(db: Session, user_id: int) -> str:
    u = db.query(User).filter(User.id == user_id).first()
    return u.name if u else "Desconocido"


def _build_service_read(svc: RecurringService, db: Session) -> RecurringServiceRead:
    return RecurringServiceRead(
        id=svc.id,
        couple_id=svc.couple_id,
        name=svc.name,
        estimated_amount=svc.estimated_amount,
        assigned_to_user_id=svc.assigned_to_user_id,
        assigned_to_user_name=_member_name(db, svc.assigned_to_user_id),
        category=svc.category,
        day_of_month=svc.day_of_month,
        icon=svc.icon,
        starts_at=svc.starts_at,
        ends_at=svc.ends_at,
        is_active=svc.is_active,
        created_at=svc.created_at,
    )


def _due_in_days(entry: RecurringEntry, service: RecurringService, today: date) -> int | None:
    if entry.status != "pending":
        return None
    last_day = calendar.monthrange(entry.year, entry.month)[1]
    day = min(service.day_of_month, last_day)
    due = date(entry.year, entry.month, day)
    return (due - today).days


def _build_entry_read(
    entry: RecurringEntry, service: RecurringService, db: Session, today: date
) -> RecurringEntryRead:
    return RecurringEntryRead(
        id=entry.id,
        service_id=entry.service_id,
        service_name=service.name,
        service_icon=service.icon,
        couple_id=entry.couple_id,
        year=entry.year,
        month=entry.month,
        amount=entry.amount,
        status=entry.status,
        paid_by_user_id=entry.paid_by_user_id,
        paid_at=entry.paid_at,
        expense_id=entry.expense_id,
        assigned_to_user_id=service.assigned_to_user_id,
        assigned_to_user_name=_member_name(db, service.assigned_to_user_id),
        day_of_month=service.day_of_month,
        due_in_days=_due_in_days(entry, service, today),
    )


def _generate_entries_for_month(db: Session, couple_id: int, year: int, month: int) -> None:
    """Lazy generation: create missing entries for the given month."""
    first_day = date(year, month, 1)
    last_day = date(year, month, calendar.monthrange(year, month)[1])

    services = (
        db.query(RecurringService)
        .filter(
            RecurringService.couple_id == couple_id,
            RecurringService.is_active == True,  # noqa: E712
            RecurringService.starts_at <= last_day,
        )
        .all()
    )

    for svc in services:
        # Skip if service ended before this month
        if svc.ends_at is not None and svc.ends_at < first_day:
            continue

        exists = (
            db.query(RecurringEntry)
            .filter(
                RecurringEntry.service_id == svc.id,
                RecurringEntry.year == year,
                RecurringEntry.month == month,
            )
            .first()
        )
        if not exists:
            db.add(RecurringEntry(
                service_id=svc.id,
                couple_id=couple_id,
                year=year,
                month=month,
                amount=svc.estimated_amount,
                status="pending",
            ))

    db.commit()


# ── Services CRUD ─────────────────────────────────────────────────────────────

@router.get("/services", response_model=list[RecurringServiceRead])
def list_services(
    couple_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_couple_member(db, couple_id, current_user.id)
    services = (
        db.query(RecurringService)
        .filter(RecurringService.couple_id == couple_id)
        .order_by(RecurringService.name)
        .all()
    )
    return [_build_service_read(s, db) for s in services]


@router.post("/services", response_model=RecurringServiceRead, status_code=201)
def create_service(
    body: RecurringServiceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    members = _assert_couple_member(db, body.couple_id, current_user.id)
    if body.assigned_to_user_id not in {m.id for m in members}:
        raise HTTPException(status_code=400, detail="El usuario asignado no pertenece a esta pareja")

    svc = RecurringService(
        couple_id=body.couple_id,
        name=body.name,
        estimated_amount=body.estimated_amount,
        assigned_to_user_id=body.assigned_to_user_id,
        category=body.category,
        day_of_month=body.day_of_month,
        icon=body.icon,
        starts_at=body.starts_at,
        ends_at=body.ends_at,
    )
    db.add(svc)
    db.commit()
    db.refresh(svc)
    return _build_service_read(svc, db)


@router.put("/services/{service_id}", response_model=RecurringServiceRead)
def update_service(
    service_id: int,
    body: RecurringServiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc = db.query(RecurringService).filter(RecurringService.id == service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    _assert_couple_member(db, svc.couple_id, current_user.id)

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(svc, field, value)

    db.commit()
    db.refresh(svc)
    return _build_service_read(svc, db)


@router.delete("/services/{service_id}", status_code=204)
def deactivate_service(
    service_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    svc = db.query(RecurringService).filter(RecurringService.id == service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")
    _assert_couple_member(db, svc.couple_id, current_user.id)
    svc.is_active = False
    db.commit()


# ── Entries ───────────────────────────────────────────────────────────────────

@router.get("/entries", response_model=RecurringEntriesResponse)
def list_entries(
    couple_id: int = Query(...),
    year: int = Query(...),
    month: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _assert_couple_member(db, couple_id, current_user.id)
    _generate_entries_for_month(db, couple_id, year, month)

    entries_db = (
        db.query(RecurringEntry)
        .filter(
            RecurringEntry.couple_id == couple_id,
            RecurringEntry.year == year,
            RecurringEntry.month == month,
        )
        .order_by(RecurringEntry.service_id)
        .all()
    )

    today = date.today()
    entries: list[RecurringEntryRead] = []
    warnings: list[RecurringEntryRead] = []

    for entry in entries_db:
        svc = db.query(RecurringService).filter(RecurringService.id == entry.service_id).first()
        if not svc:
            continue
        read = _build_entry_read(entry, svc, db, today)
        entries.append(read)
        if read.status == "pending" and read.due_in_days is not None and read.due_in_days <= WARNING_DAYS:
            warnings.append(read)

    return RecurringEntriesResponse(entries=entries, warnings=warnings)


@router.post("/entries/{entry_id}/pay", response_model=RecurringEntryRead)
def pay_entry(
    entry_id: int,
    body: PayEntryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(RecurringEntry).filter(RecurringEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entrada no encontrada")

    members = _assert_couple_member(db, entry.couple_id, current_user.id)

    if entry.status != "pending":
        raise HTTPException(status_code=400, detail="Esta entrada ya fue procesada")

    svc = db.query(RecurringService).filter(RecurringService.id == entry.service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    pay_amount = body.amount if body.amount is not None else entry.amount
    expense_id = None

    if body.create_expense:
        from decimal import Decimal
        from app.services.expense_service import _calculate_splits

        expense = Expense(
            couple_id=entry.couple_id,
            paid_by=current_user.id,
            category=svc.category or "Servicios",
            subcategory=svc.name,
            description=f"Pago automático: {svc.name} ({entry.month}/{entry.year})",
            total_amount=pay_amount,
            split_type="proportional",
            scope="shared",
        )
        db.add(expense)
        db.flush()

        for user_id, percentage, amount in _calculate_splits(
            "proportional", pay_amount, members, current_user.id, None
        ):
            db.add(ExpenseSplit(
                expense_id=expense.id,
                user_id=user_id,
                percentage=percentage,
                amount=amount,
            ))

        expense_id = expense.id

    entry.status = "paid"
    entry.paid_by_user_id = current_user.id
    entry.paid_at = datetime.now(timezone.utc)
    entry.amount = pay_amount
    entry.expense_id = expense_id

    db.commit()
    db.refresh(entry)
    return _build_entry_read(entry, svc, db, date.today())


@router.post("/entries/{entry_id}/skip", response_model=RecurringEntryRead)
def skip_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(RecurringEntry).filter(RecurringEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entrada no encontrada")

    _assert_couple_member(db, entry.couple_id, current_user.id)

    if entry.status != "pending":
        raise HTTPException(status_code=400, detail="Esta entrada ya fue procesada")

    svc = db.query(RecurringService).filter(RecurringService.id == entry.service_id).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Servicio no encontrado")

    entry.status = "skipped"
    db.commit()
    db.refresh(entry)
    return _build_entry_read(entry, svc, db, date.today())
