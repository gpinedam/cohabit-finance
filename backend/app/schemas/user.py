from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, EmailStr, field_validator


class UserRead(BaseModel):
    id: int
    name: str
    email: str
    income: Decimal
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    name: str | None = None
    income: Decimal | None = None


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
