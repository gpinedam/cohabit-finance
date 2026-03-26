from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text

from db.session import Base


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    couple_id = Column(Integer, ForeignKey("couples.id"), nullable=False, index=True)
    paid_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String(50), nullable=False)
    subcategory = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    total_amount = Column(Numeric(10, 2), nullable=False)
    split_type = Column(String(20), nullable=False)  # equal|proportional|on_me|custom
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ExpenseSplit(Base):
    __tablename__ = "expense_splits"

    id = Column(Integer, primary_key=True, index=True)
    expense_id = Column(Integer, ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    percentage = Column(Numeric(5, 2), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    expense_id = Column(Integer, ForeignKey("expenses.id"), nullable=False)
    paid_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
