import io
import os
import uuid
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from PIL import Image, ImageOps
from sqlalchemy.orm import Session

from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.wishlist import WishlistItem
from app.schemas.wishlist import WishlistItemCreate, WishlistItemRead, WishlistItemUpdate
from db.session import SessionLocal

router = APIRouter(prefix="/wishlist", tags=["wishlist"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_DIMENSION = 1200               # px — longest side after resize


def _process_and_save_image(raw_bytes: bytes, dest: Path) -> None:
    """Open an image, auto-rotate via EXIF, resize to MAX_DIMENSION on the
    longest side (preserving aspect ratio), convert to RGB JPEG, and save."""
    img: Image.Image = Image.open(io.BytesIO(raw_bytes))
    # Auto-rotate using EXIF orientation (handles phone photos correctly)
    img = ImageOps.exif_transpose(img)
    # Convert palette / RGBA → RGB so JPEG save works in all cases
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    # Resize only if larger than MAX_DIMENSION
    if max(img.size) > MAX_DIMENSION:
        img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)
    img.save(dest, format="JPEG", quality=85, optimize=True, progressive=True)


def _get_wishlist_dir() -> Path:
    data_dir = Path(os.environ.get("COHABIT_DATA_DIR", "data"))
    d = data_dir / "wishlist"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _to_read(item: WishlistItem) -> WishlistItemRead:
    """Convert ORM model → schema, computing photo_url from filename."""
    return WishlistItemRead(
        id=item.id,
        user_id=item.user_id,
        title=item.title,
        description=item.description,
        price=item.price,
        stars=item.stars,
        photo_url=f"/wishlist-photos/{item.photo}" if item.photo else None,
        url=item.url,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _own_or_403(item: WishlistItem | None, user: User) -> WishlistItem:
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item no encontrado")
    if item.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sin permisos")
    return item


# ── List ────────────────────────────────────────────────────────────────────

@router.get("/", response_model=list[WishlistItemRead])
def list_items(
    stars: int | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    sort: Literal["recent", "stars", "price_asc", "price_desc"] = "recent",
    db: Session = Depends(_get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(WishlistItem).filter(WishlistItem.user_id == current_user.id)

    if stars is not None:
        q = q.filter(WishlistItem.stars == stars)
    if min_price is not None:
        q = q.filter(WishlistItem.price >= min_price)
    if max_price is not None:
        q = q.filter(WishlistItem.price <= max_price)

    if sort == "recent":
        q = q.order_by(WishlistItem.created_at.desc())
    elif sort == "stars":
        q = q.order_by(WishlistItem.stars.desc(), WishlistItem.created_at.desc())
    elif sort == "price_asc":
        q = q.order_by(WishlistItem.price.asc().nullslast(), WishlistItem.created_at.desc())
    elif sort == "price_desc":
        q = q.order_by(WishlistItem.price.desc().nullsfirst(), WishlistItem.created_at.desc())

    return [_to_read(i) for i in q.all()]


# ── Create ───────────────────────────────────────────────────────────────────

@router.post("/", response_model=WishlistItemRead, status_code=status.HTTP_201_CREATED)
def create_item(
    payload: WishlistItemCreate,
    db: Session = Depends(_get_db),
    current_user: User = Depends(get_current_user),
):
    item = WishlistItem(user_id=current_user.id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_read(item)


# ── Update ───────────────────────────────────────────────────────────────────

@router.patch("/{item_id}", response_model=WishlistItemRead)
def update_item(
    item_id: int,
    payload: WishlistItemUpdate,
    db: Session = Depends(_get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(WishlistItem).filter(WishlistItem.id == item_id).first()
    _own_or_403(item, current_user)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return _to_read(item)


# ── Delete ───────────────────────────────────────────────────────────────────

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(
    item_id: int,
    db: Session = Depends(_get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(WishlistItem).filter(WishlistItem.id == item_id).first()
    _own_or_403(item, current_user)

    # Remove photo file if it exists
    if item.photo:
        photo_path = _get_wishlist_dir() / item.photo
        photo_path.unlink(missing_ok=True)

    db.delete(item)
    db.commit()


# ── Photo upload ─────────────────────────────────────────────────────────────

@router.post("/{item_id}/photo", response_model=WishlistItemRead)
async def upload_photo(
    item_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(_get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(WishlistItem).filter(WishlistItem.id == item_id).first()
    _own_or_403(item, current_user)

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tipo de archivo no permitido. Usa JPEG, PNG, WEBP o GIF.",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo es demasiado grande (máximo 5 MB).",
        )

    # Delete old photo if any
    if item.photo:
        old_path = _get_wishlist_dir() / item.photo
        old_path.unlink(missing_ok=True)

    # Resize and convert to JPEG for consistent storage and fast loading
    filename = f"{uuid.uuid4().hex}.jpg"
    dest = _get_wishlist_dir() / filename
    _process_and_save_image(contents, dest)
    

    item.photo = filename
    db.commit()
    db.refresh(item)
    return _to_read(item)


# ── Photo delete ─────────────────────────────────────────────────────────────

@router.delete("/{item_id}/photo", response_model=WishlistItemRead)
def delete_photo(
    item_id: int,
    db: Session = Depends(_get_db),
    current_user: User = Depends(get_current_user),
):
    item = db.query(WishlistItem).filter(WishlistItem.id == item_id).first()
    _own_or_403(item, current_user)

    if item.photo:
        photo_path = _get_wishlist_dir() / item.photo
        photo_path.unlink(missing_ok=True)
        item.photo = None
        db.commit()
        db.refresh(item)

    return _to_read(item)
