"""
Goals API — shared couple savings & emergency fund goals.
"""
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user, get_db
from app.models.couple import CoupleMember
from app.models.goal import CoupleGoal, GoalDeposit
from app.models.user import User
from app.schemas.goal import DepositCreate, DepositRead, GoalCreate, GoalDepositRead, GoalRead, GoalUpdate

router = APIRouter(prefix="/goals", tags=["goals"])


def _check_membership(db: Session, couple_id: int, user_id: int) -> None:
    if not db.query(CoupleMember).filter(
        CoupleMember.couple_id == couple_id,
        CoupleMember.user_id == user_id,
    ).first():
        raise HTTPException(status_code=403, detail="No perteneces a esta pareja")


def _build_goal_read(goal: CoupleGoal, db: Session) -> GoalRead:
    deposits = (
        db.query(GoalDeposit)
        .filter(GoalDeposit.goal_id == goal.id)
        .order_by(GoalDeposit.created_at.desc())
        .all()
    )
    user_names = {
        u.id: u.name
        for u in db.query(User).filter(User.id.in_({d.user_id for d in deposits})).all()
    }
    now = datetime.utcnow()
    accumulated = sum(Decimal(str(d.amount)) for d in deposits)
    this_month = sum(
        Decimal(str(d.amount)) for d in deposits
        if d.created_at.year == now.year and d.created_at.month == now.month
    )
    target = Decimal(str(goal.target))
    pct = float(accumulated / target * 100) if target > 0 else 0.0

    deposit_reads = [
        GoalDepositRead(
            id=d.id,
            goal_id=d.goal_id,
            user_id=d.user_id,
            user_name=user_names.get(d.user_id, "?"),
            amount=d.amount,
            note=d.note,
            created_at=d.created_at,
        )
        for d in deposits
    ]

    return GoalRead(
        id=goal.id,
        couple_id=goal.couple_id,
        user_id=goal.user_id,
        scope=goal.scope or "shared",
        name=goal.name,
        icon=goal.icon,
        goal_type=goal.goal_type,
        target=goal.target,
        color=goal.color,
        is_active=goal.is_active,
        accumulated=accumulated,
        pct=min(pct, 100.0),
        this_month=this_month,
        deposits=deposit_reads,
        created_at=goal.created_at,
    )


# ── Goals CRUD ────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[GoalRead])
def list_goals(
    couple_id: int | None = Query(None),
    scope: str = Query("shared"),
    include_archived: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if scope == "private":
        q = db.query(CoupleGoal).filter(
            CoupleGoal.user_id == current_user.id,
            CoupleGoal.scope == "private",
        )
    else:
        if couple_id is None:
            return []
        _check_membership(db, couple_id, current_user.id)
        q = db.query(CoupleGoal).filter(
            CoupleGoal.couple_id == couple_id,
            CoupleGoal.scope == "shared",
        )
    if not include_archived:
        q = q.filter(CoupleGoal.is_active == 1)
    goals = q.order_by(CoupleGoal.created_at).all()
    return [_build_goal_read(g, db) for g in goals]


@router.post("/", response_model=GoalRead, status_code=201)
def create_goal(
    body: GoalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.scope == "private":
        goal = CoupleGoal(
            couple_id=0,  # sentinel; SQLite column has NOT NULL from original schema
            user_id=current_user.id,
            scope="private",
            name=body.name,
            icon=body.icon,
            goal_type=body.goal_type,
            target=body.target,
            color=body.color,
        )
    else:
        if body.couple_id is None:
            raise HTTPException(status_code=422, detail="couple_id requerido para metas compartidas")
        _check_membership(db, body.couple_id, current_user.id)
        goal = CoupleGoal(
            couple_id=body.couple_id,
            user_id=None,
            scope="shared",
            name=body.name,
            icon=body.icon,
            goal_type=body.goal_type,
            target=body.target,
            color=body.color,
        )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return _build_goal_read(goal, db)


@router.patch("/{goal_id}", response_model=GoalRead)
def update_goal(
    goal_id: int,
    body: GoalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = db.query(CoupleGoal).filter(CoupleGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Meta no encontrada")
    if goal.scope == "private":
        if goal.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="No tienes acceso a esta meta")
    else:
        _check_membership(db, goal.couple_id, current_user.id)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(goal, field, value)
    db.commit()
    db.refresh(goal)
    return _build_goal_read(goal, db)


@router.delete("/{goal_id}", status_code=204)
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = db.query(CoupleGoal).filter(CoupleGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Meta no encontrada")
    if goal.scope == "private":
        if goal.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="No tienes acceso a esta meta")
    else:
        _check_membership(db, goal.couple_id, current_user.id)
    db.query(GoalDeposit).filter(GoalDeposit.goal_id == goal_id).delete()
    db.delete(goal)
    db.commit()


# ── Deposits ──────────────────────────────────────────────────────────────────

@router.post("/{goal_id}/deposits", response_model=GoalRead, status_code=201)
def add_deposit(
    goal_id: int,
    body: DepositCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = db.query(CoupleGoal).filter(CoupleGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Meta no encontrada")
    if goal.scope == "private":
        if goal.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="No tienes acceso a esta meta")
    else:
        _check_membership(db, goal.couple_id, current_user.id)
    deposit = GoalDeposit(
        goal_id=goal_id,
        user_id=current_user.id,
        amount=body.amount,
        note=body.note,
    )
    db.add(deposit)
    db.commit()
    db.refresh(goal)
    return _build_goal_read(goal, db)


@router.delete("/{goal_id}/deposits/{deposit_id}", response_model=GoalRead)
def delete_deposit(
    goal_id: int,
    deposit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = db.query(CoupleGoal).filter(CoupleGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Meta no encontrada")
    if goal.scope == "private":
        if goal.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="No tienes acceso a esta meta")
    else:
        _check_membership(db, goal.couple_id, current_user.id)
    deposit = db.query(GoalDeposit).filter(
        GoalDeposit.id == deposit_id,
        GoalDeposit.goal_id == goal_id,
    ).first()
    if not deposit:
        raise HTTPException(status_code=404, detail="Aporte no encontrado")
    # Only the depositor can delete their own contribution
    if deposit.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Solo puedes eliminar tus propios aportes")
    db.delete(deposit)
    db.commit()
    db.refresh(goal)
    return _build_goal_read(goal, db)
