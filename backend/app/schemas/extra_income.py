from decimal import Decimal

from pydantic import BaseModel, field_validator


class ExtraIncomeUpsert(BaseModel):
    year: int
    month: int
    amount: Decimal
    note: str | None = None

    @field_validator("month")
    @classmethod
    def valid_month(cls, v: int) -> int:
        if not 1 <= v <= 12:
            raise ValueError("mes inválido")
        return v

    @field_validator("amount")
    @classmethod
    def positive_amount(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("el monto debe ser positivo")
        return v


class ExtraIncomeRead(BaseModel):
    year: int
    month: int
    amount: Decimal
    note: str | None = None

    model_config = {"from_attributes": True}
