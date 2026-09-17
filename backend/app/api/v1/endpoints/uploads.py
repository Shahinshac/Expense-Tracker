import os
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.orm import Session
import httpx

from app.core.config import settings
from app.core.deps import get_db, get_current_user
from app.models.models import User, Attachment, Expense
from app.schemas.schemas import UploadResponse, SignedUrlResponse

router = APIRouter()

ALLOWED_MIME_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}

SIGNED_URL_EXPIRATION_SECONDS = 600  # 10 minutes


async def create_supabase_signed_url(object_path: str, expires_in: int = SIGNED_URL_EXPIRATION_SECONDS) -> str:
    """
    Generate a short-lived signed URL for a receipt stored in a PRIVATE Supabase Storage bucket.
    If Supabase is not configured (local dev/test), fallback to the local file URL.
    """
    if not (settings.SUPABASE_URL and settings.SUPABASE_KEY):
        if object_path.startswith("http://") or object_path.startswith("https://") or object_path.startswith("/"):
            return object_path
        return f"/uploads/{object_path}"

    # Clean the path: remove leading slash and bucket prefix if present
    clean_path = object_path.lstrip("/")
    bucket_prefix = f"{settings.SUPABASE_STORAGE_BUCKET}/"
    if clean_path.startswith(bucket_prefix):
        clean_path = clean_path[len(bucket_prefix):]

    sign_api = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/sign/{settings.SUPABASE_STORAGE_BUCKET}/{clean_path}"
    headers = {
        "Authorization": f"Bearer {settings.SUPABASE_KEY}",
        "apiKey": settings.SUPABASE_KEY,
        "Content-Type": "application/json"
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(sign_api, json={"expiresIn": expires_in}, headers=headers)
            if res.status_code == 200:
                data = res.json()
                signed_part = data.get("signedURL") or data.get("signedUrl")
                if signed_part:
                    if signed_part.startswith("http://") or signed_part.startswith("https://"):
                        return signed_part
                    return f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1{signed_part}"
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Supabase Storage returned invalid signed URL format."
                )
            elif res.status_code == 404:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Receipt file not found in storage bucket."
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Failed to generate signed URL from Supabase Storage: {res.text}"
                )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error connecting to Supabase Storage: {str(e)}"
        )


@router.post("/", response_model=UploadResponse, status_code=status.HTTP_201_CREATED)
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

    # Read content and enforce 5 MB size limit
    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum allowed size is {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    storage_path = f"/uploads/{unique_filename}"
    signed_url = f"/uploads/{unique_filename}"

    # Supabase Private Storage upload if configured
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
                    # Store only the private object storage path (no public URL)
                    storage_path = supabase_path
                    # Generate temporary signed URL for immediate client preview
                    signed_url = await create_supabase_signed_url(supabase_path, SIGNED_URL_EXPIRATION_SECONDS)
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
        local_full_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
        with open(local_full_path, "wb") as f:
            f.write(content)

    attachment = Attachment(
        user_id=current_user.id,
        file_name=file.filename or unique_filename,
        file_path=storage_path,
        file_size=len(content),
        mime_type=file.content_type
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)

    return UploadResponse(
        id=attachment.id,
        file_name=attachment.file_name,
        file_path=storage_path,
        file_url=signed_url,
        signed_url=signed_url,
        expires_in=SIGNED_URL_EXPIRATION_SECONDS,
        file_size=attachment.file_size,
        mime_type=attachment.mime_type
    )


@router.get("/{id}/signed-url", response_model=SignedUrlResponse)
async def get_attachment_signed_url(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate a 10-minute short-lived signed URL to view/download a private receipt.
    Strictly verifies that the attachment belongs to the current user.
    """
    attachment = db.query(Attachment).filter(Attachment.id == id).first()
    if not attachment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found."
        )

    if attachment.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only view receipts belonging to your own account."
        )

    signed_url = await create_supabase_signed_url(attachment.file_path, SIGNED_URL_EXPIRATION_SECONDS)
    return SignedUrlResponse(
        signed_url=signed_url,
        expires_in=SIGNED_URL_EXPIRATION_SECONDS,
        file_path=attachment.file_path,
        attachment_id=attachment.id
    )


@router.get("/signed-url", response_model=SignedUrlResponse)
async def get_signed_url_by_path(
    path: str = Query(..., description="Object storage path or attachment reference"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate a 10-minute short-lived signed URL for a receipt given its storage path.
    Enforces strict ownership validation:
    - Verifies path belongs to user_{current_user.id}/
    - Prevents cross-user traversal and tampering
    """
    # Guard against path traversal
    if ".." in path or "\\" in path:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid receipt path."
        )

    clean_path = path.strip().lstrip("/")

    # Strip full URL if legacy or full URL was provided
    bucket_marker = f"/{settings.SUPABASE_STORAGE_BUCKET}/"
    if bucket_marker in clean_path:
        clean_path = clean_path.split(bucket_marker, 1)[-1]

    # Check user prefix isolation
    user_prefix = f"user_{current_user.id}/"

    # If path belongs to another user (e.g. user_2/ while current is 1), explicitly deny with 403
    if clean_path.startswith("user_") and not clean_path.startswith(user_prefix):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only view receipts belonging to your own account."
        )

    # Local uploads path check
    if clean_path.startswith("uploads/"):
        attach = db.query(Attachment).filter(
            Attachment.user_id == current_user.id,
            (Attachment.file_path == f"/{clean_path}") | (Attachment.file_path == clean_path) | (Attachment.file_path.endswith(clean_path))
        ).first()
        exp = db.query(Expense).filter(
            Expense.user_id == current_user.id,
            (Expense.attachment_url == f"/{clean_path}") | (Expense.attachment_url == clean_path) | (Expense.attachment_url.endswith(clean_path))
        ).first()
        if not attach and not exp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Receipt not found."
            )
        signed_url = f"/{clean_path}" if not clean_path.startswith("/") else clean_path
        return SignedUrlResponse(
            signed_url=signed_url,
            expires_in=SIGNED_URL_EXPIRATION_SECONDS,
            file_path=clean_path,
            attachment_id=attach.id if attach else None
        )

    # For Supabase storage paths: must start with user_{current_user.id}/
    if not clean_path.startswith(user_prefix):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Invalid receipt path format."
        )

    # Verify that this record actually belongs to the user in database
    attach = db.query(Attachment).filter(
        Attachment.user_id == current_user.id,
        (Attachment.file_path == clean_path) | (Attachment.file_path.endswith(clean_path))
    ).first()
    exp = db.query(Expense).filter(
        Expense.user_id == current_user.id,
        (Expense.attachment_url == clean_path) | (Expense.attachment_url.endswith(clean_path))
    ).first()
    if not attach and not exp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt not found."
        )

    signed_url = await create_supabase_signed_url(clean_path, SIGNED_URL_EXPIRATION_SECONDS)
    return SignedUrlResponse(
        signed_url=signed_url,
        expires_in=SIGNED_URL_EXPIRATION_SECONDS,
        file_path=clean_path,
        attachment_id=attach.id if attach else None
    )


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
        # Check if it exists for another user to maintain proper 404 response
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found.")

    # Remove from Supabase Storage if remote, or local disk if local
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        try:
            raw_path = attachment.file_path
            prefix = f"{settings.SUPABASE_STORAGE_BUCKET}/"
            if prefix in raw_path:
                rel_path = raw_path.split(prefix, 1)[-1]
            else:
                rel_path = raw_path.lstrip("/")

            # Clean URL remnants if present
            if "/storage/v1/object/" in rel_path:
                rel_path = rel_path.split("/storage/v1/object/", 1)[-1]
                if rel_path.startswith(f"public/{settings.SUPABASE_STORAGE_BUCKET}/"):
                    rel_path = rel_path.split(f"public/{settings.SUPABASE_STORAGE_BUCKET}/", 1)[-1]
                elif rel_path.startswith(f"sign/{settings.SUPABASE_STORAGE_BUCKET}/"):
                    rel_path = rel_path.split(f"sign/{settings.SUPABASE_STORAGE_BUCKET}/", 1)[-1]

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
