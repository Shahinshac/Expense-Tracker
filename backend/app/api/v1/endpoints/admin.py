from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_admin_user
from app.models.models import User
from app.schemas.schemas import AdminUserResponse, AdminStatsResponse

router = APIRouter()

@router.get("/stats", response_model=AdminStatsResponse)
def get_user_stats(
    current_admin: Any = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Return user counts by status for the admin dashboard header."""
    total = db.query(User).count()
    pending = db.query(User).filter(User.status == "PENDING").count()
    approved = db.query(User).filter(User.status == "APPROVED").count()
    rejected = db.query(User).filter(User.status == "REJECTED").count()
    disabled = db.query(User).filter(User.status == "DISABLED").count()

    return AdminStatsResponse(
        total_users=total,
        pending_users=pending,
        approved_users=approved,
        rejected_users=rejected,
        disabled_users=disabled
    )


@router.get("/users", response_model=List[AdminUserResponse])
def list_users(
    status_filter: Optional[str] = Query(None, alias="status", pattern="^(PENDING|APPROVED|REJECTED|DISABLED)$"),
    search: Optional[str] = Query(None),
    current_admin: Any = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    List users with safe profile attributes only.
    Strictly filters out passwords, hashes, and secrets.
    """
    query = db.query(User)
    if status_filter:
        query = query.filter(User.status == status_filter.upper())
    if search:
        term = f"%{search.strip()}%"
        query = query.filter((User.email.ilike(term)) | (User.full_name.ilike(term)))

    users = query.order_by(User.created_at.desc()).all()
    return [AdminUserResponse.model_validate(u) for u in users]


@router.get("/users/{user_id}", response_model=AdminUserResponse)
def get_user(
    user_id: int,
    current_admin: Any = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Retrieve a single user's safe public profile for administrative review."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return AdminUserResponse.model_validate(user)


@router.post("/users/{user_id}/approve", response_model=AdminUserResponse)
def approve_user(
    user_id: int,
    current_admin: Any = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Approve a pending or rejected user registration."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    user.status = "APPROVED"
    db.commit()
    db.refresh(user)
    return AdminUserResponse.model_validate(user)


@router.post("/users/{user_id}/reject", response_model=AdminUserResponse)
def reject_user(
    user_id: int,
    current_admin: Any = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Reject a pending registration."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if user.id == current_admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Administrators cannot reject their own account.")

    user.status = "REJECTED"
    db.commit()
    db.refresh(user)
    return AdminUserResponse.model_validate(user)


@router.post("/users/{user_id}/disable", response_model=AdminUserResponse)
def disable_user(
    user_id: int,
    current_admin: Any = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Disable an active user account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if user.id == current_admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Administrators cannot disable their own account.")

    user.status = "DISABLED"
    db.commit()
    db.refresh(user)
    return AdminUserResponse.model_validate(user)


@router.post("/users/{user_id}/enable", response_model=AdminUserResponse)
def enable_user(
    user_id: int,
    current_admin: Any = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Re-enable a disabled user account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    user.status = "APPROVED"
    db.commit()
    db.refresh(user)
    return AdminUserResponse.model_validate(user)


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    current_admin: Any = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a user account and associated records."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if user.id == current_admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Administrators cannot delete their own account.")

    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully", "id": user_id}
