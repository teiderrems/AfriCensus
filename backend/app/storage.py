import os
import shutil
from abc import ABC, abstractmethod
from pathlib import Path
from typing import BinaryIO

from app.config import get_settings


class StorageProvider(ABC):
    @abstractmethod
    def save(self, file_id: str, file_extension: str, file_stream: BinaryIO) -> tuple[str, str]:
        """
        Saves a file to the storage provider.
        Returns a tuple of (absolute_url, storage_path).
        """
        pass

    @abstractmethod
    def get_url(self, file_id: str, file_extension: str, file_path: str) -> str:
        """
        Returns the full public URL to access the file.
        """
        pass

    @abstractmethod
    def get_file_path(self, file_id: str, file_extension: str) -> str:
        """
        Returns the storage path (used in the database).
        """
        pass


class LocalStorageProvider(StorageProvider):
    def __init__(self):
        self.upload_dir = Path("data/uploads")
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.settings = get_settings()

    def get_file_path(self, file_id: str, file_extension: str) -> str:
        return (self.upload_dir / f"{file_id}{file_extension}").as_posix()

    def save(self, file_id: str, file_extension: str, file_stream: BinaryIO) -> tuple[str, str]:
        file_path = Path(self.get_file_path(file_id, file_extension))
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file_stream, buffer)
        url = self.get_url(file_id, file_extension, file_path.as_posix())
        return url, file_path.as_posix()

    def get_url(self, file_id: str, file_extension: str, file_path: str) -> str:
        if self.settings.media_base_url:
            base = self.settings.media_base_url.rstrip("/")
            filename = f"{file_id}{file_extension}"
            return f"{base}/{filename}"
        
        # Default behavior: point to the API download route
        return f"/api/v1/attachments/{file_id}/download"


class S3StorageProvider(StorageProvider):
    def __init__(self):
        pass

    def get_file_path(self, file_id: str, file_extension: str) -> str:
        return f"{file_id}{file_extension}"

    def save(self, file_id: str, file_extension: str, file_stream: BinaryIO) -> tuple[str, str]:
        raise NotImplementedError("S3 storage provider is not fully implemented yet.")

    def get_url(self, file_id: str, file_extension: str, file_path: str) -> str:
        raise NotImplementedError("S3 storage provider is not fully implemented yet.")


class GoogleDriveStorageProvider(StorageProvider):
    def __init__(self):
        import json
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        self.settings = get_settings()
        if not self.settings.google_application_credentials_json:
            raise ValueError("Google Application Credentials JSON is required")
        if not self.settings.google_drive_folder_id:
            raise ValueError("Google Drive Folder ID is required")
            
        credentials_info = json.loads(self.settings.google_application_credentials_json)
        self.credentials = service_account.Credentials.from_service_account_info(
            credentials_info,
            scopes=["https://www.googleapis.com/auth/drive"]
        )
        self.service = build('drive', 'v3', credentials=self.credentials, cache_discovery=False)
        self.folder_id = self.settings.google_drive_folder_id

    def get_file_path(self, file_id: str, file_extension: str) -> str:
        # We only use this as a fallback. `save()` will return the drive_file_id as the path.
        return f"gdrive_{file_id}{file_extension}"

    def save(self, file_id: str, file_extension: str, file_stream: BinaryIO) -> tuple[str, str]:
        import tempfile
        from googleapiclient.http import MediaFileUpload
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_extension) as temp_file:
            shutil.copyfileobj(file_stream, temp_file)
            temp_path = temp_file.name

        try:
            file_metadata = {
                'name': f"{file_id}{file_extension}",
                'parents': [self.folder_id]
            }
            media = MediaFileUpload(temp_path, resumable=True)
            uploaded_file = self.service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id'
            ).execute()
            
            drive_file_id = uploaded_file.get('id')
            
            # Make it public
            permission = {
                'type': 'anyone',
                'role': 'reader'
            }
            self.service.permissions().create(
                fileId=drive_file_id,
                body=permission
            ).execute()
            
            url = self.get_url(file_id, file_extension, drive_file_id)
            return url, drive_file_id
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def get_url(self, file_id: str, file_extension: str, file_path: str) -> str:
        # Google Drive allows viewing via uc?id=...
        return f"https://drive.google.com/uc?id={file_path}"


def get_storage_provider() -> StorageProvider:
    settings = get_settings()
    if settings.media_storage_provider.lower() == "s3":
        return S3StorageProvider()
    if settings.media_storage_provider.lower() == "google_drive":
        return GoogleDriveStorageProvider()
    return LocalStorageProvider()
