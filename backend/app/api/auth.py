import re

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password, verify_pin
from app.dependencies.auth import get_db
from app.models.couple import CoupleMember
from app.models.user import User
from app.schemas.auth import PinLoginByIdRequest, PinLoginRequest, SecurityAnswerRequest, Token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token)


@router.post("/pin-login", response_model=Token)
def pin_login(body: PinLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not user.pin_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="PIN no configurado")
    if not verify_pin(body.pin, user.pin_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="PIN incorrecto")
    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token)


@router.post("/pin-login-id", response_model=Token)
def pin_login_by_id(body: PinLoginByIdRequest, db: Session = Depends(get_db)):
    """Login by user_id + PIN (no email required)."""
    user = db.query(User).filter(User.id == body.user_id).first()
    if not user or not user.pin_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="PIN incorrecto")
    if not verify_pin(body.pin, user.pin_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="PIN incorrecto")
    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token)


@router.get("/users")
def list_users(db: Session = Depends(get_db)):
    """Public endpoint: returns all users (id + name + avatar) for the login screen."""
    users = db.query(User).order_by(User.id).all()
    return [{"id": u.id, "name": u.name, "avatar": u.avatar} for u in users]


@router.get("/security-question/{user_id}")
def get_security_question(user_id: int, db: Session = Depends(get_db)):
    """Public: return the security question text for a user (no auth needed)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.security_question:
        raise HTTPException(status_code=404, detail="Sin pregunta de seguridad configurada")
    return {"question": user.security_question}


@router.post("/security-answer", response_model=Token)
def verify_security_answer(body: SecurityAnswerRequest, db: Session = Depends(get_db)):
    """Public: verify security answer and return a JWT (fallback when PIN is forgotten)."""
    user = db.query(User).filter(User.id == body.user_id).first()
    if not user or not user.security_answer_hash:
        raise HTTPException(status_code=401, detail="Sin pregunta de seguridad configurada")
    normalized = re.sub(r'[^A-Z0-9]', '', body.answer.upper())
    if not verify_pin(normalized, user.security_answer_hash):
        raise HTTPException(status_code=401, detail="Respuesta incorrecta")
    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token)
