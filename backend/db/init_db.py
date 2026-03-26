"""
Database initialization: create all tables and run idempotent migrations.
No Alembic needed for MVP — migrations are applied via column existence checks.
"""
import logging
from decimal import Decimal

from sqlalchemy import inspect, text

from app.core.security import get_password_hash, get_pin_hash
from app.models.couple import Couple, CoupleMember  # noqa: F401 – register with Base
from app.models.expense import Expense, ExpenseSplit, Payment  # noqa: F401
from app.models.user import User  # noqa: F401
from db.session import Base, SessionLocal, engine

logger = logging.getLogger(__name__)


def _column_exists(table: str, column: str) -> bool:
    insp = inspect(engine)
    cols = [c["name"] for c in insp.get_columns(table)]
    return column in cols


def _run_migrations() -> None:
    """Idempotent schema migrations (add new columns without dropping data)."""
    with engine.connect() as conn:
        if not _column_exists("users", "pin_hash"):
            conn.execute(text("ALTER TABLE users ADD COLUMN pin_hash VARCHAR(255)"))
            conn.commit()
            logger.info("Migration: added users.pin_hash")
        if not _column_exists("users", "income"):
            conn.execute(text("ALTER TABLE users ADD COLUMN income NUMERIC(10,2) DEFAULT 0"))
            conn.commit()
            logger.info("Migration: added users.income")


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _run_migrations()
    _seed()


def _seed() -> None:
    """Create a demo couple with two users if the database is empty."""
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            # Ensure both seed users always have the default PIN (idempotent)
            for email in ("a@cohabit.local", "b@cohabit.local"):
                u = db.query(User).filter(User.email == email).first()
                if u and not u.pin_hash:
                    u.pin_hash = get_pin_hash("111111")
            db.commit()
            return

        default_pin = get_pin_hash("111111")

        user_a = User(
            name="Usuario A",
            email="a@cohabit.local",
            hashed_password=get_password_hash("demo1234"),
            pin_hash=default_pin,
            income=Decimal("3000.00"),
        )
        user_b = User(
            name="Usuario B",
            email="b@cohabit.local",
            hashed_password=get_password_hash("demo1234"),
            pin_hash=default_pin,
            income=Decimal("2000.00"),
        )
        db.add_all([user_a, user_b])
        db.flush()

        couple = Couple(name="Cohabit Demo")
        db.add(couple)
        db.flush()

        db.add_all([
            CoupleMember(user_id=user_a.id, couple_id=couple.id),
            CoupleMember(user_id=user_b.id, couple_id=couple.id),
        ])
        db.commit()
        logger.info("Seed: created demo couple with PIN 111111 for both users")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
