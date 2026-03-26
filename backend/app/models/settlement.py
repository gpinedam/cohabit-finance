from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, Text

from db.session import Base


class Settlement(Base):
    """
    Records that a couple settled their outstanding balance at a point in time.
    After a settlement, the balance is computed only from expenses created after
    settled_at — everything before is considered paid.
    """
    __tablename__ = "settlements"

    id          = Column(Integer, primary_key=True, index=True)
    couple_id   = Column(Integer, ForeignKey("couples.id"), nullable=False, index=True)
    settled_by  = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount      = Column(Numeric(10, 2), nullable=False)   # the net debt that was cleared
    note        = Column(Text, nullable=True)
    settled_at  = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
