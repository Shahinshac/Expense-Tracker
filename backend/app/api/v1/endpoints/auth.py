import secrets
from datetime import datetime, timezone, timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.deps import get_db, get_current_user, AdminUserPrincipal
from app.models.models import User
from app.schemas.schemas import UserCreate, UserLogin, AdminLogin, UserResponse, RegisterResponse, Token
from app.database.init_db import seed_user_defaults

router = APIRouter()

@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # 1. Enforce MAX_USERS capacity safeguard if configured
    if settings.MAX_USERS is not None:
        user_count = db.query(User).count()
        if user_count >= settings.MAX_USERS:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Registration is currently closed because the maximum number of users has been reached."
            )

    # 2. Check for duplicate email
    existing = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    # 3. Create regular user (always PENDING, never admin)
    user = User(
        email=user_in.email.lower(),
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        currency=user_in.currency or "INR",
        status="PENDING",
        is_admin=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Automatically seed default student categories and accounts
    seed_user_defaults(db, user.id)

    # Normal users default to PENDING and receive NO JWT access token
    return RegisterResponse(
        message="Registration successful. Your account is waiting for administrator approval.",
        status=user.status,
        email=user.email,
        id=user.id
    )


@router.post("/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email.lower()).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    # Check account approval status
    if user.status == "PENDING":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is awaiting administrator approval."
        )
    elif user.status == "REJECTED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your registration request was rejected."
        )
    elif user.status == "DISABLED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been disabled."
        )
    elif user.status != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account access denied."
        )

    # Ensure defaults are seeded
    seed_user_defaults(db, user.id)

    access_token = create_access_token(subject=user.id, is_admin=user.is_admin)
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.post("/admin/login", response_model=Token)
def admin_login(admin_in: AdminLogin):
    """
    Dedicated administrator login.
    Authenticates directly against backend environment variables ADMIN_USERNAME and ADMIN_PASSWORD.
    Does NOT require a database user record.
    """
    if not settings.ADMIN_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Administrator login is not configured on this server."
        )

    username_match = secrets.compare_digest(
        admin_in.username.strip().lower(),
        settings.ADMIN_USERNAME.strip().lower()
    )
    password_match = secrets.compare_digest(
        admin_in.password,
        settings.ADMIN_PASSWORD
    )

    if not (username_match and password_match):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect admin username or password."
        )

    access_token = create_access_token(
        subject="admin",
        is_admin=True,
        extra_claims={"role": "admin", "username": settings.ADMIN_USERNAME}
    )

    admin_user = UserResponse(
        id=0,
        email=f"{settings.ADMIN_USERNAME.lower()}@finstudent.admin",
        full_name=settings.ADMIN_USERNAME,
        currency="INR",
        status="APPROVED",
        is_admin=True,
        created_at=datetime.now(timezone.utc)
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=admin_user
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: Any = Depends(get_current_user)):
    if isinstance(current_user, AdminUserPrincipal):
        return UserResponse(
            id=current_user.id,
            email=current_user.email,
            full_name=current_user.full_name,
            currency=current_user.currency,
            status=current_user.status,
            is_admin=current_user.is_admin,
            created_at=current_user.created_at
        )
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
def update_profile(
    update_data: dict,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if isinstance(current_user, AdminUserPrincipal):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrator account is managed via environment configuration."
        )

    # Strictly whitelist allowed fields; users CANNOT modify is_admin or status
    if "full_name" in update_data and update_data["full_name"]:
        current_user.full_name = str(update_data["full_name"]).strip()
    if "currency" in update_data and update_data["currency"]:
        current_user.currency = str(update_data["currency"]).strip()
    if "password" in update_data and update_data["password"]:
        if len(update_data["password"]) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        current_user.hashed_password = get_password_hash(update_data["password"])

    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)
