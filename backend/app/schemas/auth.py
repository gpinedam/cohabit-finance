from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class PinLoginRequest(BaseModel):
    email: str
    pin: str


class PinLoginByIdRequest(BaseModel):
    user_id: int
    pin: str
