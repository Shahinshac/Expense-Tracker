from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.deps import get_db, get_current_user
from app.models.models import User
from app.schemas.schemas import UserCreate, UserLogin, UserResponse, RegisterResponse, Token
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

    # 3. Check for initial admin bootstrap email
    is_bootstrap_admin = bool(
        settings.ADMIN_EMAIL and user_in.email.lower() == settings.ADMIN_EMAIL.lower()
    )
    initial_status = "APPROVED" if is_bootstrap_admin else "PENDING"
    initial_is_admin = is_bootstrap_admin

    user = User(
        email=user_in.email.lower(),
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        currency=user_in.currency or "INR",
        status=initial_status,
        is_admin=initial_is_admin
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

    # Bootstrap configured admin account if matched
    if settings.ADMIN_EMAIL and user.email.lower() == settings.ADMIN_EMAIL.lower():
        if not user.is_admin or user.status != "APPROVED":
            user.is_admin = True
            user.status = "APPROVED"
            db.commit()
            db.refresh(user)

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

    access_token = create_access_token(subject=user.id)
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
def update_profile(
    update_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
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
