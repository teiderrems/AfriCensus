import os
import shutil
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.dependencies import current_user

from app.storage import get_storage_provider

router = APIRouter()

@router.post("")
def upload_attachment(
    id: Annotated[str, Form()],
    entity_type: Annotated[str, Form()],
    entity_id: Annotated[str, Form()],
    attachment_type: Annotated[str, Form()],
    local_id: Annotated[str | None, Form()] = None,
    created_at: Annotated[str | None, Form()] = None,
    created_by: Annotated[str | None, Form()] = None,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _user: dict = Depends(current_user),
):
    """
    Upload a new attachment file (image/pdf).
    """
    # Check if attachment already exists
    stmt = select(models.Attachment).where(models.Attachment.id == id)
    existing = db.execute(stmt).scalar_one_or_none()
    
    storage = get_storage_provider()
    file_extension = Path(file.filename or "").suffix

    if existing:
        # Return existing but ensure we provide the URL
        result = existing.to_dict()
        result["file_url"] = storage.get_url(existing.id, file_extension, existing.file_path)
        return result

    # Save via storage provider
    file_url = storage.save(id, file_extension, file.file)
    file_path = storage.get_file_path(id, file_extension)
    
    # Calculate size if it's local (for S3 we might need another way, but let's just get size from the stream if possible, or assume it's small for now)
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)

    new_attachment = models.Attachment(
        id=id,
        local_id=local_id,
        entity_type=entity_type,
        entity_id=entity_id,
        attachment_type=attachment_type,
        file_name=file.filename or "unknown",
        mime_type=file.content_type or "application/octet-stream",
        file_size=file_size,
        file_path=file_path,
        sync_status="synced",
        created_at=created_at,
        created_by=created_by,
    )
    db.add(new_attachment)
    db.commit()
    db.refresh(new_attachment)

    result = new_attachment.to_dict()
    result["file_url"] = file_url
    return result


@router.get("/{attachment_id}/download")
def download_attachment(
    attachment_id: str,
    db: Session = Depends(get_db),
    _user: dict = Depends(current_user),
):
    """
    Download the file for a specific attachment.
    """
    stmt = select(models.Attachment).where(models.Attachment.id == attachment_id)
    attachment = db.execute(stmt).scalar_one_or_none()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    storage = get_storage_provider()
    
    # If the storage is not local, we should just redirect to the public URL
    # We can determine this by checking if get_url returns an absolute URL (http)
    file_extension = Path(attachment.file_path).suffix
    url = storage.get_url(attachment.id, file_extension, attachment.file_path)
    
    if url.startswith("http://") or url.startswith("https://"):
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url)

    file_path = Path(attachment.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File physical path not found")

    return FileResponse(
        path=file_path,
        filename=attachment.file_name,
        media_type=attachment.mime_type
    )
