from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, Numeric, String

from db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=True, index=True)
    hashed_password = Column(String(255), nullable=True)
    pin_hash = Column(String(255), nullable=True)
    income = Column(Numeric(10, 2), nullable=False, default=0)
    savings_goal_pct = Column(Integer, nullable=True)
    emergency_fund_pct = Column(Integer, nullable=True)
    avatar = Column(String(255), nullable=True)
    security_question = Column(String(500), nullable=True)
    security_answer_hash = Column(String(255), nullable=True)
    pin_encrypted = Column(String(512), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
