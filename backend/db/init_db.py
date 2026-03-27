"""
Database initialization: create all tables and run idempotent migrations.
No Alembic needed for MVP — migrations are applied via column existence checks.
"""
import logging
from decimal import Decimal

from sqlalchemy import inspect, text

from app.core.security import get_password_hash, get_pin_hash, encrypt_pin
from app.models.couple import Couple, CoupleMember  # noqa: F401 – register with Base
from app.models.expense import Expense, ExpenseSplit, Payment  # noqa: F401
from app.models.extra_income import ExtraIncome  # noqa: F401
from app.models.goal import CoupleGoal, GoalDeposit  # noqa: F401
from app.models.recurring import RecurringEntry, RecurringService  # noqa: F401
from app.models.settlement import Settlement  # noqa: F401
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
        if not _column_exists("users", "avatar"):
            conn.execute(text("ALTER TABLE users ADD COLUMN avatar VARCHAR(255)"))
            conn.commit()
            logger.info("Migration: added users.avatar")
        if not _column_exists("expenses", "scope"):
            conn.execute(text("ALTER TABLE expenses ADD COLUMN scope VARCHAR(10) NOT NULL DEFAULT 'shared'"))
            conn.commit()
            logger.info("Migration: added expenses.scope")
        if not _column_exists("users", "savings_goal_pct"):
            conn.execute(text("ALTER TABLE users ADD COLUMN savings_goal_pct INTEGER"))
            conn.commit()
            logger.info("Migration: added users.savings_goal_pct")
        if not _column_exists("users", "emergency_fund_pct"):
            conn.execute(text("ALTER TABLE users ADD COLUMN emergency_fund_pct INTEGER"))
            conn.commit()
            logger.info("Migration: added users.emergency_fund_pct")
        # Unique constraint to prevent duplicate recurring entries for same service+month
        conn.execute(text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_recurring_entry "
            "ON recurring_entries (service_id, year, month)"
        ))
        conn.commit()
        # Private goals support
        if not _column_exists("couple_goals", "scope"):
            conn.execute(text("ALTER TABLE couple_goals ADD COLUMN scope VARCHAR(10) NOT NULL DEFAULT 'shared'"))
            conn.commit()
            logger.info("Migration: added couple_goals.scope")
        if not _column_exists("couple_goals", "user_id"):
            conn.execute(text("ALTER TABLE couple_goals ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE"))
            conn.commit()
            logger.info("Migration: added couple_goals.user_id")
        if not _column_exists("users", "security_question"):
            conn.execute(text("ALTER TABLE users ADD COLUMN security_question VARCHAR(500)"))
            conn.commit()
            logger.info("Migration: added users.security_question")
        if not _column_exists("users", "security_answer_hash"):
            conn.execute(text("ALTER TABLE users ADD COLUMN security_answer_hash VARCHAR(255)"))
            conn.commit()
            logger.info("Migration: added users.security_answer_hash")
        if not _column_exists("users", "pin_encrypted"):
            conn.execute(text("ALTER TABLE users ADD COLUMN pin_encrypted VARCHAR(512)"))
            conn.commit()
            logger.info("Migration: added users.pin_encrypted")
        # settlements and recurring tables are created by Base.metadata.create_all via the model imports


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
        default_pin_enc = encrypt_pin("111111")

        user_a = User(
            name="Usuario A",
            email="a@cohabit.local",
            hashed_password=get_password_hash("demo1234"),
            pin_hash=default_pin,
            pin_encrypted=default_pin_enc,
            income=Decimal("3000.00"),
        )
        user_b = User(
            name="Usuario B",
            email="b@cohabit.local",
            hashed_password=get_password_hash("demo1234"),
            pin_hash=default_pin,
            pin_encrypted=default_pin_enc,
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
