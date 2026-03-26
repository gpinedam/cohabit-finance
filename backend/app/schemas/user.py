from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, field_validator


class UserRead(BaseModel):
    id: int
    name: str
    income: Decimal
    savings_goal_pct: int | None = None
    emergency_fund_pct: int | None = None
    avatar: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    name: str | None = None
    income: Decimal | None = None
    savings_goal_pct: int | None = None
    emergency_fund_pct: int | None = None


class PinUpdate(BaseModel):
    pin: str

    @field_validator("pin")
    @classmethod
    def pin_must_be_six_digits(cls, v: str) -> str:
        if not v.isdigit() or len(v) != 6:
            raise ValueError("El PIN debe tener exactamente 6 dígitos numéricos")
        return v


class PinStatus(BaseModel):
    has_pin: bool
