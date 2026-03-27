from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, field_validator


# ── Goal ──────────────────────────────────────────────────────────────────────

class GoalCreate(BaseModel):
    couple_id: int
    name: str
    icon: str | None = None
    goal_type: str = "savings"   # "savings" | "emergency"
    target: Decimal
    color: str = "violet"

    @field_validator("target")
    @classmethod
    def positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("la meta debe ser positiva")
        return v

    @field_validator("goal_type")
    @classmethod
    def valid_type(cls, v: str) -> str:
        if v not in ("savings", "emergency"):
            raise ValueError("tipo inválido; usa 'savings' o 'emergency'")
        return v


class GoalUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None
    goal_type: str | None = None
    target: Decimal | None = None
    color: str | None = None
    is_active: int | None = None


class GoalDepositRead(BaseModel):
    id: int
    goal_id: int
    user_id: int
    user_name: str
    amount: Decimal
    note: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class GoalRead(BaseModel):
    id: int
    couple_id: int
    name: str
    icon: str | None
    goal_type: str
    target: Decimal
    color: str | None
    is_active: int
    accumulated: Decimal          # sum of all deposits
    pct: float                    # accumulated / target * 100
    this_month: Decimal           # deposits made this calendar month
    deposits: list[GoalDepositRead]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Deposit ───────────────────────────────────────────────────────────────────

class DepositCreate(BaseModel):
    amount: Decimal
    note: str | None = None

    @field_validator("amount")
    @classmethod
    def positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("el monto debe ser positivo")
        return v


class DepositRead(BaseModel):
    id: int
    goal_id: int
    user_id: int
    amount: Decimal
    note: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
