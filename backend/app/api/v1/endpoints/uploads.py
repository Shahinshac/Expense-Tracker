import os
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
import httpx

from app.core.config import settings
from app.core.deps import get_db, get_current_user
from app.models.models import User, Attachment

router = APIRouter()

ALLOWED_MIME_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}

@router.post("/", status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not file.content_type or file.content_type.lower() not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Only JPEG, PNG, WebP, and PDF are accepted."
        )

    ext = ALLOWED_MIME_TYPES[file.content_type.lower()]
    unique_filename = f"{uuid.uuid4().hex}{ext}"

    # Read content and enforce size limit
    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum allowed size is {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    file_url = f"/uploads/{unique_filename}"
    storage_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    # Supabase Storage upload if configured
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        supabase_path = f"user_{current_user.id}/{unique_filename}"
        supabase_api = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/{settings.SUPABASE_STORAGE_BUCKET}/{supabase_path}"
        headers = {
            "Authorization": f"Bearer {settings.SUPABASE_KEY}",
            "apiKey": settings.SUPABASE_KEY,
            "Content-Type": file.content_type,
            "x-upsert": "true"
        }
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(supabase_api, content=content, headers=headers)
                if res.status_code in (200, 201):
                    file_url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{settings.SUPABASE_STORAGE_BUCKET}/{supabase_path}"
                    storage_path = supabase_path
                else:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Failed to upload receipt to Supabase Storage: {res.text}"
                    )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Error connecting to Supabase Storage: {str(e)}"
            )
    else:
        # Local file storage
        with open(storage_path, "wb") as f:
            f.write(content)

    attachment = Attachment(
        user_id=current_user.id,
        file_name=file.filename or unique_filename,
        file_path=file_url,
        file_size=len(content),
        mime_type=file.content_type
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return {
        "id": attachment.id,
        "file_name": attachment.file_name,
        "file_url": file_url,
        "file_size": attachment.file_size,
        "mime_type": attachment.mime_type
    }

@router.delete("/{id}", status_code=status.HTTP_200_OK)
async def delete_attachment(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    attachment = db.query(Attachment).filter(
        Attachment.id == id,
        Attachment.user_id == current_user.id
    ).first()

    if not attachment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found.")

    # Remove from Supabase Storage if remote, or local disk if local
    if settings.SUPABASE_URL and settings.SUPABASE_KEY and attachment.file_path.startswith("http"):
        try:
            # Extract relative object path
            prefix = f"{settings.SUPABASE_STORAGE_BUCKET}/"
            if prefix in attachment.file_path:
                rel_path = attachment.file_path.split(prefix, 1)[-1]
                delete_api = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/{settings.SUPABASE_STORAGE_BUCKET}"
                headers = {
                    "Authorization": f"Bearer {settings.SUPABASE_KEY}",
                    "apiKey": settings.SUPABASE_KEY,
                    "Content-Type": "application/json"
                }
                async with httpx.AsyncClient(timeout=10.0) as client:
                    await client.request("DELETE", delete_api, json={"prefixes": [rel_path]}, headers=headers)
        except Exception as e:
            print(f"[Supabase Storage Delete Warning] {e}")
    else:
        # Check if local file exists
        local_filename = os.path.basename(attachment.file_path)
        local_full_path = os.path.join(settings.UPLOAD_DIR, local_filename)
        if os.path.exists(local_full_path):
            try:
                os.remove(local_full_path)
            except OSError:
                pass

    db.delete(attachment)
    db.commit()
    return {"message": "Attachment deleted successfully", "id": id}
