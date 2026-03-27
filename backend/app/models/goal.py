"""
CoupleGoal  — a shared savings / emergency-fund goal for a couple.
GoalDeposit — a contribution made by one user toward a goal.
"""
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String

from db.session import Base


class CoupleGoal(Base):
    __tablename__ = "couple_goals"

    id          = Column(Integer, primary_key=True, index=True)
    couple_id   = Column(Integer, ForeignKey("couples.id", ondelete="CASCADE"), nullable=False, index=True)
    name        = Column(String(100), nullable=False)
    icon        = Column(String(10), nullable=True)   # emoji
    goal_type   = Column(String(20), nullable=False, default="savings")  # "savings" | "emergency"
    target      = Column(Numeric(12, 2), nullable=False)
    color       = Column(String(30), nullable=True, default="violet")    # tailwind color key
    is_active   = Column(Integer, nullable=False, default=1)             # 1=active, 0=archived
    created_at  = Column(DateTime, default=datetime.utcnow)


class GoalDeposit(Base):
    __tablename__ = "goal_deposits"

    id         = Column(Integer, primary_key=True, index=True)
    goal_id    = Column(Integer, ForeignKey("couple_goals.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    amount     = Column(Numeric(10, 2), nullable=False)
    note       = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
