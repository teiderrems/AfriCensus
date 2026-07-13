import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

import {
  FamilyRelationWriteDto,
  FieldCatalogDto,
  HouseholdWriteDto,
  MedicalHistoryWriteDto,
  PersonWriteDto,
  UserCreateDto,
  UserUpdateDto,
} from './dtos';
import {
  AuditLog,
  Campaign,
  CensusRecord,
  DashboardSummary,
  FamilyMedicalSummary,
  FamilyRelationRecord,
  FamilyTree,
  HomeContent,
  HouseholdRecord,
  MedicalHistory,
  PersonRecord,
  PopulationSummary,
  SyncPullResponse,
  SyncPushRequest,
  SyncPushResponse,
  User,
  UserRole,
  Zone,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private readonly http: HttpClient) {}

  homeContent(lang?: string) {
    const params = lang ? new HttpParams().set('lang', lang) : undefined;
    return this.http.get<HomeContent>('/api/v1/home-content', { params });
  }

  fieldCatalog(lang?: string) {
    const params = lang ? new HttpParams().set('lang', lang) : undefined;
    return this.http.get<FieldCatalogDto>('/api/v1/i18n/fields', { params });
  }

  homeContentSource() {
    return this.http.get<HomeContent>('/api/v1/home-content', { params: new HttpParams().set('raw', true) });
  }

  updateHomeContent(payload: HomeContent) {
    return this.http.put<HomeContent>('/api/v1/home-content', payload);
  }

  dashboard() {
    return this.http.get<DashboardSummary>('/api/v1/dashboard/summary');
  }

  zones() {
    return this.http.get<Zone[]>('/api/v1/zones');
  }

  campaigns() {
    return this.http.get<Campaign[]>('/api/v1/campaigns');
  }

  users() {
    return this.http.get<User[]>('/api/v1/users');
  }

  createUser(payload: UserCreateDto) {
    return this.http.post<User>('/api/v1/users', payload);
  }

  updateUser(id: string, payload: UserUpdateDto) {
    return this.http.put<User>(`/api/v1/users/${id}`, payload);
  }

  changeUserRole(id: string, role: UserRole) {
    return this.http.post<User>(`/api/v1/users/${id}/role`, { role });
  }

  resetUserPassword(id: string, password: string) {
    return this.http.post<void>(`/api/v1/users/${id}/password`, { password });
  }

  activateUser(id: string) {
    return this.http.post<User>(`/api/v1/users/${id}/activate`, {});
  }

  deactivateUser(id: string) {
    return this.http.post<User>(`/api/v1/users/${id}/deactivate`, {});
  }

  deleteUser(id: string) {
    return this.http.delete<void>(`/api/v1/users/${id}`);
  }

  households() {
    return this.http.get<HouseholdRecord[]>('/api/v1/households');
  }

  createHousehold(payload: HouseholdWriteDto) {
    return this.http.post<HouseholdRecord>('/api/v1/households', payload);
  }

  updateHousehold(id: string, payload: HouseholdWriteDto) {
    return this.http.put<HouseholdRecord>(`/api/v1/households/${id}`, payload);
  }

  deleteHousehold(id: string) {
    return this.http.delete<void>(`/api/v1/households/${id}`);
  }

  submitHousehold(id: string) {
    return this.http.post<HouseholdRecord>(`/api/v1/households/${id}/submit`, {});
  }

  persons() {
    return this.http.get<PersonRecord[]>('/api/v1/persons');
  }

  createPerson(payload: PersonWriteDto) {
    return this.http.post<PersonRecord>('/api/v1/persons', payload);
  }

  updatePerson(id: string, payload: PersonWriteDto) {
    return this.http.put<PersonRecord>(`/api/v1/persons/${id}`, payload);
  }

  deletePerson(id: string) {
    return this.http.delete<void>(`/api/v1/persons/${id}`);
  }

  submitPerson(id: string) {
    return this.http.post<PersonRecord>(`/api/v1/persons/${id}/submit`, {});
  }

  familyTree(personId: string, depth = 2) {
    const params = new HttpParams().set('depth', depth);
    return this.http.get<FamilyTree>(`/api/v1/persons/${personId}/family-tree`, { params });
  }

  createFamilyRelation(payload: FamilyRelationWriteDto) {
    return this.http.post<FamilyRelationRecord>('/api/v1/family-relations', payload);
  }

  validationQueue() {
    return this.http.get<CensusRecord[]>('/api/v1/validation-queue');
  }

  validatePerson(id: string) {
    return this.http.post(`/api/v1/persons/${id}/validate`, {});
  }

  requestCorrection(id: string, comment: string) {
    return this.http.post(`/api/v1/persons/${id}/request-correction`, { comment });
  }

  populationSummary() {
    return this.http.get<PopulationSummary>('/api/v1/reports/population-summary');
  }

  medicalHistories(personId?: string) {
    const params = personId ? new HttpParams().set('person_id', personId) : undefined;
    return this.http.get<MedicalHistory[]>('/api/v1/medical-histories', { params });
  }

  createMedicalHistory(payload: MedicalHistoryWriteDto) {
    return this.http.post<MedicalHistory>('/api/v1/medical-histories', payload);
  }

  syncPush(payload: SyncPushRequest) {
    return this.http.post<SyncPushResponse>('/api/v1/sync/push', payload);
  }

  syncPull() {
    return this.http.post<SyncPullResponse>('/api/v1/sync/pull', {});
  }

  familyMedicalSummary(personId: string, depth = 2) {
    const params = new HttpParams().set('depth', depth);
    return this.http.get<FamilyMedicalSummary>(`/api/v1/persons/${personId}/medical-family-summary`, { params });
  }

  auditLogs() {
    return this.http.get<AuditLog[]>('/api/v1/audit-logs');
  }
}
