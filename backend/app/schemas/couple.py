from datetime import datetime

from pydantic import BaseModel


class CoupleRead(BaseModel):
    id: int
    name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CoupleMemberRead(BaseModel):
    id: int
    user_id: int
    couple_id: int

    model_config = {"from_attributes": True}
