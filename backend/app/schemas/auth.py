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


class SecurityAnswerRequest(BaseModel):
    user_id: int
    answer: str


class SecurityQuestionRequest(BaseModel):
    question: str
    answer: str
