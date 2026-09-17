from typing import Generator, Optional, Any
from datetime import datetime, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.database.session import get_db
from app.models.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

class AdminUserPrincipal:
    """Lightweight principal representing the configuration-level administrator."""
    def __init__(self, username: str):
        self.id = 0
        self.email = f"{username.lower()}@finstudent.admin"
        self.full_name = username
        self.currency = "INR"
        self.status = "APPROVED"
        self.is_admin = True
        self.created_at = datetime.now(timezone.utc)

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> Any:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        sub: Optional[str] = payload.get("sub")
        is_admin_claim: bool = bool(payload.get("is_admin", False))
        if sub is None:
            raise credentials_exception
    except (JWTError, ValueError):
        raise credentials_exception

    # Check for direct configuration-level administrator token
    if sub == "admin" and is_admin_claim:
        username = payload.get("username") or settings.ADMIN_USERNAME
        return AdminUserPrincipal(username=username)

    try:
        user_id = int(sub)
    except ValueError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    # Enforce account approval status
    if user.status != "APPROVED":
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
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account access denied."
            )

    return user

def get_current_admin_user(
    current_user: Any = Depends(get_current_user)
) -> Any:
    """Dependency that strictly verifies the requesting user is an active administrator."""
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required."
        )
    return current_user
