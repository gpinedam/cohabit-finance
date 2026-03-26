from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, field_validator, model_validator


class CustomSplitInput(BaseModel):
    user_id: int
    percentage: Decimal


class ExpenseCreate(BaseModel):
    couple_id: int
    category: str
    subcategory: str | None = None
    description: str | None = None
    total_amount: Decimal
    split_type: Literal["equal", "proportional", "on_me", "custom"]
    custom_splits: list[CustomSplitInput] | None = None
    scope: Literal["shared", "private"] = "shared"

    @field_validator("total_amount")
    @classmethod
    def amount_must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("El monto debe ser mayor que 0")
        return v

    @model_validator(mode="after")
    def validate_custom_splits(self) -> "ExpenseCreate":
        if self.split_type == "custom":
            if not self.custom_splits:
                raise ValueError("custom_splits es requerido cuando split_type es 'custom'")
            total_pct = sum(s.percentage for s in self.custom_splits)
            if abs(total_pct - Decimal("100")) > Decimal("0.01"):
                raise ValueError("Los porcentajes del split personalizado deben sumar 100")
        return self


class PrivateExpenseCreate(BaseModel):
    category: str
    subcategory: str | None = None
    description: str | None = None
    total_amount: Decimal

    @field_validator("total_amount")
    @classmethod
    def amount_must_be_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("El monto debe ser mayor que 0")
        return v


class ExpenseUpdate(BaseModel):
    category: str | None = None
    subcategory: str | None = None
    description: str | None = None
    total_amount: Decimal | None = None

    @field_validator("total_amount")
    @classmethod
    def amount_must_be_positive(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and v <= 0:
            raise ValueError("El monto debe ser mayor que 0")
        return v


class SplitRead(BaseModel):
    id: int
    user_id: int
    percentage: Decimal
    amount: Decimal

    model_config = {"from_attributes": True}


class ExpenseRead(BaseModel):
    id: int
    couple_id: int
    paid_by: int
    category: str
    subcategory: str | None
    description: str | None
    total_amount: Decimal
    split_type: str
    scope: str
    created_at: datetime
    splits: list[SplitRead] = []

    model_config = {"from_attributes": True}
