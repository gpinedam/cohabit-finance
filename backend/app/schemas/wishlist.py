from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class WishlistItemCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    price: float | None = None
    stars: int = Field(default=3, ge=1, le=5)
    url: str | None = None

    @field_validator("price")
    @classmethod
    def price_must_be_positive(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("El precio no puede ser negativo")
        return v


class WishlistItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    price: float | None = None
    stars: int | None = Field(default=None, ge=1, le=5)
    url: str | None = None

    @field_validator("price")
    @classmethod
    def price_must_be_positive(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("El precio no puede ser negativo")
        return v


class WishlistItemRead(BaseModel):
    id: int
    user_id: int
    title: str
    description: str | None
    price: float | None
    stars: int
    photo_url: str | None  # computed from filename in router
    url: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
