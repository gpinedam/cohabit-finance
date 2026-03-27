"""
ExtraIncome — one-off extra income a user records for a specific month.
Only one entry per (user_id, year, month) is allowed.
"""
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, UniqueConstraint

from db.session import Base


class ExtraIncome(Base):
    __tablename__ = "extra_incomes"
    __table_args__ = (
        UniqueConstraint("user_id", "year", "month", name="uq_extra_income_user_month"),
    )

    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    year       = Column(Integer, nullable=False)
    month      = Column(Integer, nullable=False)
    amount     = Column(Numeric(10, 2), nullable=False)
    note       = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
