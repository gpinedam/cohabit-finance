from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, field_validator


class RecurringServiceCreate(BaseModel):
    couple_id: int
    name: str
    estimated_amount: Decimal
    assigned_to_user_id: int
    category: str | None = None
    day_of_month: int = 1
    icon: str | None = None
    starts_at: date
    ends_at: date | None = None

    @field_validator("estimated_amount")
    @classmethod
    def amount_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("El monto debe ser mayor que 0")
        return v

    @field_validator("day_of_month")
    @classmethod
    def day_range(cls, v: int) -> int:
        if not (1 <= v <= 28):
            raise ValueError("El día debe estar entre 1 y 28")
        return v


class RecurringServiceUpdate(BaseModel):
    name: str | None = None
    estimated_amount: Decimal | None = None
    assigned_to_user_id: int | None = None
    category: str | None = None
    day_of_month: int | None = None
    icon: str | None = None
    starts_at: date | None = None
    ends_at: date | None = None
    is_active: bool | None = None

    @field_validator("estimated_amount")
    @classmethod
    def amount_positive(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and v <= 0:
            raise ValueError("El monto debe ser mayor que 0")
        return v

    @field_validator("day_of_month")
    @classmethod
    def day_range(cls, v: int | None) -> int | None:
        if v is not None and not (1 <= v <= 28):
            raise ValueError("El día debe estar entre 1 y 28")
        return v


class RecurringServiceRead(BaseModel):
    id: int
    couple_id: int
    name: str
    estimated_amount: Decimal
    assigned_to_user_id: int
    assigned_to_user_name: str
    category: str | None
    day_of_month: int
    icon: str | None
    starts_at: date
    ends_at: date | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class RecurringEntryRead(BaseModel):
    id: int
    service_id: int
    service_name: str
    service_icon: str | None
    couple_id: int
    year: int
    month: int
    amount: Decimal
    status: str  # pending|paid|skipped
    paid_by_user_id: int | None
    paid_at: datetime | None
    expense_id: int | None
    assigned_to_user_id: int
    assigned_to_user_name: str
    day_of_month: int
    due_in_days: int | None  # None if paid/skipped

    model_config = {"from_attributes": True}


class PayEntryRequest(BaseModel):
    amount: Decimal | None = None  # None = use estimated_amount
    create_expense: bool = True

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and v <= 0:
            raise ValueError("El monto debe ser mayor que 0")
        return v


class RecurringEntriesResponse(BaseModel):
    entries: list[RecurringEntryRead]
    warnings: list[RecurringEntryRead]  # due_in_days <= 3 and pending
