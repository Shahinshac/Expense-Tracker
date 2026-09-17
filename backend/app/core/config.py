import os
from typing import List, Optional, Any
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator, ValidationInfo

class Settings(BaseSettings):
    PROJECT_NAME: str = "Student Personal Expense Tracker"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "student-expense-tracker-super-secret-jwt-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database - Supabase PostgreSQL or SQLite
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./expense_tracker.db")

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def assemble_db_connection(cls, v: str) -> str:
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v
    
    # Supabase Storage Settings
    SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL", None)
    SUPABASE_KEY: Optional[str] = os.getenv("SUPABASE_KEY", os.getenv("SUPABASE_SERVICE_ROLE_KEY", None))
    SUPABASE_STORAGE_BUCKET: str = os.getenv("SUPABASE_STORAGE_BUCKET", "receipts")

    # Admin Credentials & User Safeguards
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "Shahinsha")
    ADMIN_PASSWORD: Optional[str] = os.getenv("ADMIN_PASSWORD", None)
    MAX_USERS: Optional[int] = int(os.getenv("MAX_USERS")) if os.getenv("MAX_USERS") and os.getenv("MAX_USERS").strip().isdigit() else None

    # Uploads (Local fallback & size limits)
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")
    MAX_UPLOAD_SIZE_MB: int = 5
    
    # CORS
    FRONTEND_URL: Optional[str] = os.getenv("FRONTEND_URL", None)
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "https://expensfi.vercel.app",
        "https://finstudent.vercel.app",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="after")
    @classmethod
    def assemble_cors_origins(cls, v: List[str], info: ValidationInfo) -> List[str]:
        origins = list(v)
        frontend_url = os.getenv("FRONTEND_URL")
        if not frontend_url and info and info.data:
            frontend_url = info.data.get("FRONTEND_URL")
            
        if frontend_url:
            for url in frontend_url.split(","):
                clean = url.strip()
                if clean:
                    clean_no_slash = clean.rstrip("/")
                    if clean_no_slash and clean_no_slash not in origins:
                        origins.append(clean_no_slash)
                    if clean not in origins:
                        origins.append(clean)
        return origins

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=(
            ".env",
            "backend/.env",
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env")
        ),
        extra="ignore"
    )

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
