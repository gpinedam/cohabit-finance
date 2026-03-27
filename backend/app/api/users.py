import os
import re
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.security import get_pin_hash, verify_pin, encrypt_pin
from app.dependencies.auth import get_current_user, get_db
from app.models.couple import CoupleMember
from app.models.extra_income import ExtraIncome
from app.models.user import User
from app.schemas.extra_income import ExtraIncomeRead, ExtraIncomeUpsert
from app.schemas.user import PinStatus, PinUpdate, UserRead, UserUpdate
from app.schemas.auth import SecurityQuestionRequest

def _avatars_dir() -> Path:
    """Resolved lazily so COHABIT_DATA_DIR is read after main.py sets it."""
    return Path(os.getenv("COHABIT_DATA_DIR", "data")) / "avatars"

ALLOWED_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
MAX_SIZE = 5 * 1024 * 1024  # 5 MB

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserRead)
def update_me(
    body: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.name is not None:
        current_user.name = body.name
    if body.income is not None:
        current_user.income = body.income
    if body.savings_goal_pct is not None:
        current_user.savings_goal_pct = body.savings_goal_pct
    if body.emergency_fund_pct is not None:
        current_user.emergency_fund_pct = body.emergency_fund_pct
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/me/pin-status", response_model=PinStatus)
def get_pin_status(current_user: User = Depends(get_current_user)):
    return PinStatus(has_pin=bool(current_user.pin_hash))


@router.put("/me/pin")
def set_pin(
    body: PinUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check PIN uniqueness within the couple
    member = db.query(CoupleMember).filter(CoupleMember.user_id == current_user.id).first()
    if member:
        other_members = (
            db.query(User)
            .join(CoupleMember, CoupleMember.user_id == User.id)
            .filter(
                CoupleMember.couple_id == member.couple_id,
                User.id != current_user.id,
                User.pin_hash.isnot(None),
            )
            .all()
        )
        for other in other_members:
            if verify_pin(body.pin, other.pin_hash):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Ese PIN ya lo está usando otro miembro de la pareja",
                )
    current_user.pin_hash = get_pin_hash(body.pin)
    current_user.pin_encrypted = encrypt_pin(body.pin)
    db.commit()
    return {"message": "PIN actualizado correctamente"}


@router.delete("/me/pin")
def delete_pin(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user.pin_hash = None
    db.commit()
    return {"message": "PIN eliminado"}


@router.post("/me/avatar", response_model=UserRead)
async def upload_avatar(
    file: UploadFile,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Solo se aceptan imágenes JPG, PNG o WebP")

    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="La imagen no puede superar los 5 MB")

    AVATARS = _avatars_dir()
    AVATARS.mkdir(parents=True, exist_ok=True)
    ext = ALLOWED_TYPES[file.content_type]
    filename = f"{current_user.id}.{ext}"

    # Remove previous avatar files for this user (any extension)
    for old in AVATARS.glob(f"{current_user.id}.*"):
        old.unlink(missing_ok=True)

    (AVATARS / filename).write_bytes(contents)
    current_user.avatar = filename
    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/me/avatar", response_model=UserRead)
def delete_avatar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.avatar:
        AVATARS = _avatars_dir()
        for old in AVATARS.glob(f"{current_user.id}.*"):
            old.unlink(missing_ok=True)
    current_user.avatar = None
    db.commit()
    db.refresh(current_user)
    return current_user


# ── Extra income (one-off monthly income) ─────────────────────────────────────

@router.get("/me/extra-income", response_model=ExtraIncomeRead | None)
def get_extra_income(
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(ExtraIncome)
        .filter(
            ExtraIncome.user_id == current_user.id,
            ExtraIncome.year == year,
            ExtraIncome.month == month,
        )
        .first()
    )


@router.put("/me/extra-income", response_model=ExtraIncomeRead)
def upsert_extra_income(
    body: ExtraIncomeUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = (
        db.query(ExtraIncome)
        .filter(
            ExtraIncome.user_id == current_user.id,
            ExtraIncome.year == body.year,
            ExtraIncome.month == body.month,
        )
        .first()
    )
    if entry:
        entry.amount = body.amount
        entry.note = body.note
    else:
        entry = ExtraIncome(
            user_id=current_user.id,
            year=body.year,
            month=body.month,
            amount=body.amount,
            note=body.note,
        )
        db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/me/extra-income/{year}/{month}", status_code=204)
def delete_extra_income(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = (
        db.query(ExtraIncome)
        .filter(
            ExtraIncome.user_id == current_user.id,
            ExtraIncome.year == year,
            ExtraIncome.month == month,
        )
        .first()
    )
    if entry:
        db.delete(entry)
        db.commit()


# ── Security question ─────────────────────────────────────────────────────────

@router.get("/me/security-question-status")
def get_security_question_status(current_user: User = Depends(get_current_user)):
    return {"has_question": bool(current_user.security_question)}


@router.put("/me/security-question")
def set_user_security_question(
    body: SecurityQuestionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    normalized = re.sub(r'[^A-Z0-9]', '', body.answer.upper())
    if not normalized:
        raise HTTPException(status_code=400, detail="La respuesta no puede estar vacía")
    current_user.security_question = body.question.strip()
    current_user.security_answer_hash = get_pin_hash(normalized)
    db.commit()
    return {"ok": True}
