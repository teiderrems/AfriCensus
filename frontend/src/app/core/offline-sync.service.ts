import { Injectable, computed, signal } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';

import { ApiService } from './api.service';
import { FamilyRelationWriteDto, HouseholdWriteDto, MedicalHistoryWriteDto, PersonWriteDto } from './dtos';
import { I18nService } from './i18n/i18n.service';
import { FamilyRelationRecord, HouseholdRecord, MedicalHistory, PersonRecord, SyncItem, SyncPullResponse, SyncPushResult } from './models';

@Injectable({ providedIn: 'root' })
export class OfflineSyncService {
  private readonly queueKey = 'africensus_offline_queue';
  private readonly pullCacheKey = 'africensus_sync_pull_cache';
  private readonly lastSyncKey = 'africensus_last_sync_at';
  private readonly queue = signal<SyncItem[]>(this.readQueue());
  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  readonly syncing = signal(false);
  readonly lastSyncAt = signal<string | null>(this.storageGet(this.lastSyncKey));
  readonly lastSyncError = signal('');
  readonly pendingCount = computed(() => this.queue().length);
  readonly hasPending = computed(() => this.pendingCount() > 0);

  constructor(
    private readonly api: ApiService,
    private readonly i18n: I18nService,
  ) {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.online.set(true);
        this.syncNow();
      });
      window.addEventListener('offline', () => this.online.set(false));
    }
    if (typeof window !== 'undefined' && this.online() && this.hasPending()) {
      window.setTimeout(() => this.syncNow(), 500);
    }
  }

  cachedPull(): SyncPullResponse | null {
    const raw = this.storageGet(this.pullCacheKey);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as SyncPullResponse;
    } catch {
      return null;
    }
  }

  // ─── Household Offline ───────────────────────────────────────────────
  createHousehold(payload: HouseholdWriteDto): Observable<HouseholdRecord> {
    if (!this.online()) {
      return of(this.queueHousehold(payload));
    }
    return this.api.createHousehold(payload).pipe(
      catchError((error) => {
        if (error?.status === 0) {
          return of(this.queueHousehold(payload));
        }
        return throwError(() => error);
      }),
    );
  }

  queueHousehold(payload: HouseholdWriteDto): HouseholdRecord {
    const localId = payload.local_id || this.localId('household');
    const item: SyncItem = {
      entity_type: 'household',
      operation: 'CREATE',
      local_entity_id: localId,
      payload: { ...payload, local_id: localId } as any,
    };
    this.enqueue(item);
    return {
      id: localId,
      ...payload,
      local_id: localId,
      validation_status: 'DRAFT',
      sync_status: 'PENDING_SYNC',
      updated_at: new Date().toISOString(),
    } as HouseholdRecord;
  }

  // ─── Person Offline ──────────────────────────────────────────────────
  createPerson(payload: PersonWriteDto): Observable<PersonRecord> {
    if (!this.online()) {
      return of(this.queuePerson(payload));
    }
    return this.api.createPerson(payload).pipe(
      catchError((error) => {
        if (error?.status === 0) {
          return of(this.queuePerson(payload));
        }
        return throwError(() => error);
      }),
    );
  }

  queuePerson(payload: PersonWriteDto): PersonRecord {
    const localId = payload.local_id || this.localId('person');
    const item: SyncItem = {
      entity_type: 'person',
      operation: 'CREATE',
      local_entity_id: localId,
      payload: { ...payload, local_id: localId } as any,
    };
    this.enqueue(item);
    return {
      id: localId,
      ...payload,
      local_id: localId,
      validation_status: 'DRAFT',
      sync_status: 'PENDING_SYNC',
      updated_at: new Date().toISOString(),
    } as PersonRecord;
  }

  // ─── Family Relation Offline ─────────────────────────────────────────
  createFamilyRelation(payload: FamilyRelationWriteDto): Observable<FamilyRelationRecord> {
    if (!this.online()) {
      return of(this.queueFamilyRelation(payload));
    }
    return this.api.createFamilyRelation(payload).pipe(
      catchError((error) => {
        if (error?.status === 0) {
          return of(this.queueFamilyRelation(payload));
        }
        return throwError(() => error);
      }),
    );
  }

  queueFamilyRelation(payload: FamilyRelationWriteDto): FamilyRelationRecord {
    const localId = payload.local_id || this.localId('family-relation');
    const item: SyncItem = {
      entity_type: 'family_relation',
      operation: 'CREATE',
      local_entity_id: localId,
      payload: { ...payload, local_id: localId } as any,
    };
    this.enqueue(item);
    return {
      id: localId,
      ...payload,
      local_id: localId,
      validation_status: 'DRAFT',
      sync_status: 'PENDING_SYNC',
      updated_at: new Date().toISOString(),
    } as FamilyRelationRecord;
  }

  createMedicalHistory(payload: MedicalHistoryWriteDto): Observable<MedicalHistory> {
    if (!this.online()) {
      return of(this.queueMedicalHistory(payload));
    }
    return this.api.createMedicalHistory(payload).pipe(
      catchError((error) => {
        if (error?.status === 0) {
          return of(this.queueMedicalHistory(payload));
        }
        return throwError(() => error);
      }),
    );
  }

  queueMedicalHistory(payload: MedicalHistoryWriteDto): MedicalHistory {
    const localId = payload.local_id || this.localId('medical-history');
    const item: SyncItem = {
      entity_type: 'medical_history',
      operation: 'CREATE',
      local_entity_id: localId,
      payload: { ...payload, local_id: localId },
    };
    this.enqueue(item);
    return {
      id: localId,
      ...payload,
      local_id: localId,
      zone_id: 'offline',
      validation_status: 'DRAFT',
      sync_status: 'PENDING_SYNC',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      decision_comment: null,
      created_by: null,
    };
  }

  enqueue(item: SyncItem): void {
    this.queue.update((items) => [...items.filter((queued) => queued.local_entity_id !== item.local_entity_id), item]);
    this.persistQueue();
  }

  syncNow(): void {
    if (!this.online() || this.syncing()) {
      return;
    }
    const items = this.queue();
    this.syncing.set(true);
    this.lastSyncError.set('');
    if (!items.length) {
      this.pullLatest();
      return;
    }
    this.api.syncPush({ items }).subscribe({
      next: (response) => {
        this.applyPushResults(response.results);
        this.pullLatest();
      },
      error: (error) => {
        this.lastSyncError.set(error?.message || this.i18n.t('sync.unavailable'));
        this.syncing.set(false);
      },
    });
  }

  private pullLatest(): void {
    this.api.syncPull().subscribe({
      next: (payload) => {
        this.storageSet(this.pullCacheKey, JSON.stringify(payload));
        const now = new Date().toISOString();
        this.storageSet(this.lastSyncKey, now);
        this.lastSyncAt.set(now);
        this.syncing.set(false);
      },
      error: (error) => {
        this.lastSyncError.set(error?.message || this.i18n.t('sync.pullUnavailable'));
        this.syncing.set(false);
      },
    });
  }

  private applyPushResults(results: SyncPushResult[]): void {
    const syncedIds = new Set(results.filter((result) => result.status === 'SYNCED').map((result) => result.local_entity_id));
    const errors = results.filter((result) => result.status === 'ERROR');
    this.queue.set(this.queue().filter((item) => !syncedIds.has(item.local_entity_id)));
    this.persistQueue();
    if (errors.length) {
      this.lastSyncError.set(`${errors.length} élément(s) n'ont pas pu être synchronisés.`);
    }
  }

  private readQueue(): SyncItem[] {
    const raw = this.storageGet(this.queueKey);
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw) as SyncItem[];
    } catch {
      return [];
    }
  }

  private persistQueue(): void {
    this.storageSet(this.queueKey, JSON.stringify(this.queue()));
  }

  private localId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  private storageGet(key: string): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem(key);
  }

  private storageSet(key: string, value: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(key, value);
  }
}
