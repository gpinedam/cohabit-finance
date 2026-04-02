from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, Numeric, String

from db.session import Base


class RecurringService(Base):
    __tablename__ = "recurring_services"

    id = Column(Integer, primary_key=True, index=True)
    couple_id = Column(Integer, ForeignKey("couples.id"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    estimated_amount = Column(Numeric(10, 2), nullable=False)
    assigned_to_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String(50), nullable=True)
    day_of_month = Column(Integer, nullable=False, default=1)  # 1–28
    icon = Column(String(10), nullable=True)
    starts_at = Column(Date, nullable=False)
    ends_at = Column(Date, nullable=True)  # None = indefinite
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class RecurringEntry(Base):
    __tablename__ = "recurring_entries"

    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(
        Integer, ForeignKey("recurring_services.id", ondelete="CASCADE"), nullable=False, index=True
    )
    couple_id = Column(Integer, ForeignKey("couples.id"), nullable=False, index=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    status = Column(String(10), nullable=False, default="pending")  # pending|paid|skipped
    paid_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    paid_at = Column(DateTime, nullable=True)
    expense_id = Column(Integer, ForeignKey("expenses.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
