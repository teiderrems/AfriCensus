import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { get, set, keys, del } from 'idb-keyval';
import imageCompression from 'browser-image-compression';
import { firstValueFrom } from 'rxjs';

export interface AttachmentRecord {
  id: string; // Unique ID (UUID)
  entity_type: 'person' | 'household' | 'document';
  entity_id: string; // local_id or server id of the entity
  attachment_type: 'profile_photo' | 'id_scan' | 'document';
  file_name: string;
  mime_type: string;
  file_size: number;
  sync_status: 'PENDING_SYNC' | 'SYNCED' | 'ERROR';
  blob?: Blob; // The actual file data stored locally
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class AttachmentService {
  constructor(private http: HttpClient) {}

  /**
   * Compress an image heavily for offline-first usage.
   */
  async compressImage(file: File): Promise<File> {
    const options = {
      maxSizeMB: 0.1, // 100KB
      maxWidthOrHeight: 800,
      useWebWorker: true
    };
    try {
      return await imageCompression(file, options);
    } catch (error) {
      console.error('Image compression failed', error);
      return file;
    }
  }

  /**
   * Store attachment metadata and blob in IndexedDB (idb-keyval)
   */
  async saveAttachmentLocally(record: AttachmentRecord, blob: Blob): Promise<void> {
    record.blob = blob;
    await set(`attachment_${record.id}`, record);
  }

  /**
   * Retrieve an attachment from IndexedDB
   */
  async getAttachmentLocally(id: string): Promise<AttachmentRecord | undefined> {
    return await get(`attachment_${id}`);
  }

  /**
   * Get an attachment by entity id and type from IndexedDB
   */
  async getAttachmentByEntity(entityId: string, attachmentType: string): Promise<AttachmentRecord | undefined> {
    const allKeys = await keys();
    const attachmentKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith('attachment_'));
    for (const key of attachmentKeys) {
      const record = await get(key) as AttachmentRecord;
      if (record && record.entity_id === entityId && record.attachment_type === attachmentType) {
        return record;
      }
    }
    return undefined;
  }

  /**
   * Generate an Object URL for the blob. Remember to revoke it!
   */
  async getAttachmentUrlByEntity(entityId: string, attachmentType: string): Promise<string | null> {
    const record = await this.getAttachmentByEntity(entityId, attachmentType);
    if (record && record.blob) {
      return URL.createObjectURL(record.blob);
    }
    // Try to see if it's already on the server, although normally it's fetched locally first
    return null;
  }

  /**
   * Get all attachments that need to be synced
   */
  async getPendingAttachments(): Promise<AttachmentRecord[]> {
    const allKeys = await keys();
    const attachmentKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith('attachment_'));
    const records: AttachmentRecord[] = [];
    for (const key of attachmentKeys) {
      const record = await get(key) as AttachmentRecord;
      if (record && record.sync_status === 'PENDING_SYNC') {
        records.push(record);
      }
    }
    return records;
  }

  /**
   * Upload an attachment to the server using FormData
   */
  async uploadAttachment(record: AttachmentRecord): Promise<boolean> {
    if (!record.blob) return false;

    const formData = new FormData();
    formData.append('id', record.id);
    formData.append('entity_type', record.entity_type);
    formData.append('entity_id', record.entity_id);
    formData.append('attachment_type', record.attachment_type);
    formData.append('created_at', record.created_at);
    // Construct a file object
    const file = new File([record.blob], record.file_name, { type: record.mime_type });
    formData.append('file', file);

    try {
      const response = await firstValueFrom(this.http.post<any>('/api/v1/attachments', formData));
      if (response && response.id) {
        // Mark as synced
        record.sync_status = 'SYNCED';
        await this.saveAttachmentLocally(record, record.blob);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to upload attachment', err);
      return false;
    }
  }
}
