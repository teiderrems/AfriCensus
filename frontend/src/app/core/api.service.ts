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
  FormDefinitionWriteDto,
} from './dtos';
import {
  AuditLog,
  Campaign,
  CensusRecord,
  DashboardSummary,
  DuplicateCandidate,
  FamilyMedicalSummary,
  FamilyRelationRecord,
  FamilyTree,
  FormDefinition,
  HomeContent,
  HouseholdRecord,
  LoginResponse,
  MedicalHistory,
  PaginatedResponse,
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

  branding() {
    return this.http.get<any>('/api/v1/branding');
  }

  getForms(page = 1, pageSize = 100, search = '', sortBy = '', sortOrder = '') {
    let params = new HttpParams().set('page', page).set('page_size', pageSize);
    if (sortBy) params = params.set('sort_by', sortBy);
    if (sortOrder) params = params.set('sort_order', sortOrder);
    if (search) params = params.set('search', search);
    return this.http.get<PaginatedResponse<FormDefinition>>('/api/v1/forms', { params });
  }

  createForm(payload: FormDefinitionWriteDto) {
    return this.http.post<FormDefinition>('/api/v1/forms', payload);
  }

  updateForm(id: string, payload: FormDefinitionWriteDto) {
    return this.http.put<FormDefinition>(`/api/v1/forms/${id}`, payload);
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

  zones(page = 1, pageSize = 100, search = '', sortBy = '', sortOrder = '') {
    let params = new HttpParams().set('page', page).set('page_size', pageSize);
    if (sortBy) params = params.set('sort_by', sortBy);
    if (sortOrder) params = params.set('sort_order', sortOrder);
    if (search) params = params.set('search', search);
    return this.http.get<PaginatedResponse<Zone>>('/api/v1/zones', { params });
  }

  createZone(payload: import('./dtos').ZoneWriteDto) {
    return this.http.post<Zone>('/api/v1/zones', payload);
  }

  updateZone(id: string, payload: import('./dtos').ZoneWriteDto) {
    return this.http.put<Zone>(`/api/v1/zones/${id}`, payload);
  }

  deleteZone(id: string) {
    return this.http.delete<void>(`/api/v1/zones/${id}`);
  }

  campaigns(page = 1, pageSize = 100, search = '', sortBy = '', sortOrder = '') {
    let params = new HttpParams().set('page', page).set('page_size', pageSize);
    if (sortBy) params = params.set('sort_by', sortBy);
    if (sortOrder) params = params.set('sort_order', sortOrder);
    if (search) params = params.set('search', search);
    return this.http.get<PaginatedResponse<Campaign>>('/api/v1/campaigns', { params });
  }

  createCampaign(payload: import('./dtos').CampaignWriteDto) {
    return this.http.post<Campaign>('/api/v1/campaigns', payload);
  }

  updateCampaign(id: string, payload: import('./dtos').CampaignWriteDto) {
    return this.http.put<Campaign>(`/api/v1/campaigns/${id}`, payload);
  }

  deleteCampaign(id: string) {
    return this.http.delete<void>(`/api/v1/campaigns/${id}`);
  }


  users(page = 1, pageSize = 10, search = '', role = '', active: boolean | string = '', sortBy = '', sortOrder = '') {
    let params = new HttpParams().set('page', page).set('page_size', pageSize);
    if (sortBy) params = params.set('sort_by', sortBy);
    if (sortOrder) params = params.set('sort_order', sortOrder);
    if (search) params = params.set('search', search);
    if (role) params = params.set('role', role);
    if (active !== '') params = params.set('active', active);
    return this.http.get<PaginatedResponse<User>>('/api/v1/users', { params });
  }

  createUser(payload: UserCreateDto) {
    return this.http.post<User>('/api/v1/users', payload);
  }

  updateUser(id: string, payload: UserUpdateDto) {
    return this.http.put<User>(`/api/v1/users/${id}`, payload);
  }

  duplicates(page = 1, pageSize = 100, status = '', sortBy = '', sortOrder = '') {
    let params = new HttpParams().set('page', page).set('page_size', pageSize);
    if (sortBy) params = params.set('sort_by', sortBy);
    if (sortOrder) params = params.set('sort_order', sortOrder);
    if (status) params = params.set('status', status);
    return this.http.get<PaginatedResponse<DuplicateCandidate>>('/api/v1/duplicates/', { params });
  }

  scanDuplicates() {
    return this.http.post('/api/v1/duplicates/scan', {});
  }

  resolveDuplicate(id: string, action: string) {
    return this.http.post(`/api/v1/duplicates/${id}/resolve?action=${action}`, {});
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

  households(page = 1, pageSize = 10, search = '', status = '', sortBy = '', sortOrder = '') {
    let params = new HttpParams().set('page', page).set('page_size', pageSize);
    if (sortBy) params = params.set('sort_by', sortBy);
    if (sortOrder) params = params.set('sort_order', sortOrder);
    if (search) params = params.set('search', search);
    if (status) params = params.set('status', status);
    return this.http.get<PaginatedResponse<HouseholdRecord>>('/api/v1/households', { params });
  }

  getHousehold(id: string) {
    return this.http.get<HouseholdRecord>(`/api/v1/households/${id}`);
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

  persons(page = 1, pageSize = 10, search = '', status = '', sortBy = '', sortOrder = '') {
    let params = new HttpParams().set('page', page).set('page_size', pageSize);
    if (sortBy) params = params.set('sort_by', sortBy);
    if (sortOrder) params = params.set('sort_order', sortOrder);
    if (search) params = params.set('search', search);
    if (status) params = params.set('status', status);
    return this.http.get<PaginatedResponse<PersonRecord>>('/api/v1/persons', { params });
  }

  getPerson(id: string) {
    return this.http.get<PersonRecord>(`/api/v1/persons/${id}`);
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

  zone(id: string) {
    return this.http.get<Zone>(`/api/v1/zones/${id}`);
  }

  agents(page = 1, pageSize = 100, sortBy = '', sortOrder = '') {
    let params = new HttpParams().set('page', page).set('page_size', pageSize).set('role', 'AGENT');
    if (sortBy) params = params.set('sort_by', sortBy);
    if (sortOrder) params = params.set('sort_order', sortOrder);
    return this.http.get<PaginatedResponse<User>>('/api/v1/users', { params });
  }

  familyTree(personId: string, depth = 2) {
    const params = new HttpParams().set('depth', depth);
    return this.http.get<FamilyTree>(`/api/v1/persons/${personId}/family-tree`, { params });
  }

  createFamilyRelation(payload: FamilyRelationWriteDto) {
    return this.http.post<FamilyRelationRecord>('/api/v1/family-relations', payload);
  }

  validationQueue(params?: any) {
    let httpParams = new HttpParams();
    if (params) {
      if (params.page) httpParams = httpParams.set('page', params.page);
      if (params.pageSize) httpParams = httpParams.set('page_size', params.pageSize);
      if (params.search) httpParams = httpParams.set('search', params.search);
      if (params.entity_type) httpParams = httpParams.set('entity_type', params.entity_type);
      if (params.sortBy) httpParams = httpParams.set('sort_by', params.sortBy);
      if (params.sortOrder) httpParams = httpParams.set('sort_order', params.sortOrder);
    }
    return this.http.get<PaginatedResponse<CensusRecord>>('/api/v1/validation-queue', { params: httpParams });
  }

  validatePerson(id: string) {
    return this.http.post(`/api/v1/persons/${id}/validate`, {});
  }

  requestCorrection(id: string, comment: string) {
    return this.http.post(`/api/v1/persons/${id}/request-correction`, { comment });
  }

  validateHousehold(id: string) {
    return this.http.post(`/api/v1/households/${id}/validate`, {});
  }

  requestCorrectionHousehold(id: string, comment: string) {
    return this.http.post(`/api/v1/households/${id}/request-correction`, { comment });
  }

  populationSummary() {
    return this.http.get<PopulationSummary>('/api/v1/reports/population-summary');
  }

  medicalHistories(personId?: string, sortBy = '', sortOrder = '') {
    let params = new HttpParams();
    if (personId) params = params.set('person_id', personId);
    if (sortBy) params = params.set('sort_by', sortBy);
    if (sortOrder) params = params.set('sort_order', sortOrder);
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

  auditLogs(page = 1, pageSize = 10, search = '', sortBy = '', sortOrder = '') {
    let params = new HttpParams().set('page', page).set('page_size', pageSize);
    if (sortBy) params = params.set('sort_by', sortBy);
    if (sortOrder) params = params.set('sort_order', sortOrder);
    if (search) params = params.set('search', search);
    return this.http.get<PaginatedResponse<AuditLog>>('/api/v1/audit-logs', { params });
  }

  getRoles() {
    return this.http.get<import('./models').AppRole[]>('/api/v1/roles');
  }

  getRole(id: string) {
    return this.http.get<import('./models').AppRole>(`/api/v1/roles/${id}`);
  }

  createRole(payload: import('./dtos').AppRoleWriteDto) {
    return this.http.post<import('./models').AppRole>('/api/v1/roles', payload);
  }

  updateRole(id: string, payload: import('./dtos').AppRoleWriteDto) {
    return this.http.put<import('./models').AppRole>(`/api/v1/roles/${id}`, payload);
  }

  deleteRole(id: string) {
    return this.http.delete<void>(`/api/v1/roles/${id}`);
  }

  availablePermissions() {
    return this.http.get<import('./models').PermissionModule[]>('/api/v1/roles/permissions/available');
  }
}
