export interface User {
  id: string;
  username: string;
  full_name: string;
  role: 'AGENT' | 'SUPERVISOR' | 'ADMIN' | 'STATISTICIAN' | 'AUDITOR';
  zone_ids: string[];
  active?: boolean;
}

export type UserRole = User['role'];

export interface UserCreateInput {
  username: string;
  full_name: string;
  role: UserRole;
  password: string;
  active: boolean;
  zone_ids: string[];
}

export interface UserUpdateInput {
  username?: string;
  full_name?: string;
  active?: boolean;
  zone_ids?: string[];
}

export type ValidationStatus = 'DRAFT' | 'SUBMITTED' | 'VALIDATED' | 'NEEDS_CORRECTION' | 'REJECTED';

export interface Zone {
  id: string;
  name: string;
  code: string;
  type: string;
  parent_id?: string | null;
  status: string;
  progress?: number;
}

export interface Campaign {
  id: string;
  name: string;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  zone_ids: string[];
}

export interface DashboardSummary {
  totalPersons: number;
  totalHouseholds: number;
  submitted: number;
  validated: number;
  needsCorrection: number;
  potentialDuplicates: number;
  activeAgents: number;
  zoneProgress: Array<{ id: string; name: string; progress: number; status: string }>;
  recentSubmissions: CensusRecord[];
}

export interface HomeLink {
  label: string;
  href: string;
  icon?: string | null;
  style?: 'primary' | 'secondary' | string | null;
}

export interface HomeHero {
  badge: string;
  title: string;
  subtitle: string;
  image_url?: string | null;
  image_alt?: string | null;
  actions: HomeLink[];
}

export interface HomeMetric {
  value: string;
  label: string;
  tone: string;
}

export interface HomeValueCard {
  icon: string;
  title: string;
  text: string;
}

export interface HomeSection {
  id: string;
  eyebrow: string;
  title: string;
  text: string;
  bullets: string[];
  visual: 'dashboard' | 'phone' | string;
  tone: string;
}

export interface HomeFooter {
  title: string;
  text: string;
  contact: string;
}

export interface HomeContent {
  id: string;
  brand: string;
  nav_links: HomeLink[];
  actions: HomeLink[];
  hero: HomeHero;
  metrics: HomeMetric[];
  values: HomeValueCard[];
  sections: HomeSection[];
  footer: HomeFooter;
  published: boolean;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
}

export interface CensusRecord {
  id: string;
  household_code?: string;
  first_name?: string;
  last_name?: string;
  address_text?: string;
  gender?: string;
  campaign_id: string;
  zone_id: string;
  validation_status: ValidationStatus;
  updated_at: string;
  entity_type?: string;
}

export interface HouseholdRecord extends CensusRecord, HouseholdInput {
  id: string;
  validation_status: ValidationStatus;
  updated_at: string;
  household_code: string;
  address_text: string;
  member_count: number;
}

export interface HouseholdInput {
  local_id?: string | null;
  household_code: string;
  campaign_id: string;
  zone_id: string;
  head_person_id?: string | null;
  address_text: string;
  gps_latitude?: number | null;
  gps_longitude?: number | null;
  housing_type?: string | null;
  occupancy_status?: string | null;
  member_count: number;
  observation?: string | null;
}

export interface PersonRecord extends CensusRecord, PersonInput {
  id: string;
  validation_status: ValidationStatus;
  updated_at: string;
  first_name: string;
  last_name: string;
  gender: string;
  is_without_document: boolean;
}

export interface PersonInput {
  local_id?: string | null;
  household_id: string;
  campaign_id: string;
  zone_id: string;
  first_name: string;
  last_name: string;
  other_names?: string | null;
  nickname?: string | null;
  gender: string;
  birth_date?: string | null;
  birth_date_estimated: boolean;
  estimated_age?: number | null;
  birth_place?: string | null;
  nationality?: string | null;
  primary_language?: string | null;
  marital_status?: string | null;
  occupation?: string | null;
  education_level?: string | null;
  phone?: string | null;
  is_without_document: boolean;
  data_source_type?: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  user_name?: string | null;
  entity_name?: string | null;
  created_at: string;
}

export interface PopulationSummary {
  totalPersons: number;
  totalHouseholds: number;
  personsByGender: Record<string, number>;
  averageMembersPerHousehold: number;
}

export type MedicalSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type MedicalStatus = 'ACTIVE' | 'MONITORED' | 'RESOLVED' | 'UNKNOWN';

export interface MedicalHistory {
  id: string;
  local_id?: string | null;
  person_id: string;
  campaign_id: string;
  zone_id: string;
  condition_name: string;
  condition_code?: string | null;
  category: string;
  diagnosis_age?: number | null;
  diagnosis_date?: string | null;
  severity: MedicalSeverity;
  status: MedicalStatus;
  hereditary_risk: boolean;
  notes?: string | null;
  validation_status: ValidationStatus;
  sync_status: string;
  decision_comment?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
}

export interface MedicalHistoryInput {
  local_id?: string | null;
  person_id: string;
  campaign_id: string;
  condition_name: string;
  condition_code?: string | null;
  category: string;
  diagnosis_age?: number | null;
  diagnosis_date?: string | null;
  severity: MedicalSeverity;
  status: MedicalStatus;
  hereditary_risk: boolean;
  notes?: string | null;
}

export interface FamilyMedicalRecord extends MedicalHistory {
  person_label: string;
  family_group: FamilyTreeNode['group'];
}

export interface FamilyMedicalConditionSummary {
  condition_name: string;
  category: string;
  total_cases: number;
  hereditary_cases: number;
  affected_generations: FamilyTreeNode['group'][];
  severity_counts: Record<string, number>;
}

export interface FamilyMedicalSummary {
  root_person_id: string;
  depth: number;
  total_family_members: number;
  total_medical_records: number;
  hereditary_records: number;
  conditions: FamilyMedicalConditionSummary[];
  records: FamilyMedicalRecord[];
}

export interface FamilyTreeNode {
  id: string;
  label: string;
  gender?: string;
  birth_date?: string | null;
  estimated_age?: number | null;
  validation_status?: ValidationStatus;
  group: 'root' | 'parent' | 'spouse' | 'child' | 'sibling' | 'relative';
}

export interface FamilyTreeLink {
  id: string;
  source: string;
  target: string;
  type: string;
  category: 'parent_child' | 'spouse' | 'guardian' | 'other';
  status?: ValidationStatus | string;
}

export interface FamilyRelationInput {
  local_id?: string | null;
  campaign_id: string;
  source_person_id: string;
  target_person_id: string;
  relation_type: 'PERE_DE' | 'MERE_DE' | 'ENFANT_DE' | 'CONJOINT_DE' | 'TUTEUR_DE' | 'RESPONSABLE_LEGAL_DE' | string;
  evidence_type?: string | null;
  source_type?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  comment?: string | null;
}

export interface FamilyRelationRecord extends FamilyRelationInput {
  id: string;
  zone_id?: string | null;
  validation_status: ValidationStatus;
  sync_status: string;
  decision_comment?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
}

export interface FamilyTree {
  root: FamilyTreeNode;
  depth: number;
  nodes: FamilyTreeNode[];
  links: FamilyTreeLink[];
  parents: CensusRecord[];
  children: CensusRecord[];
  spouses: CensusRecord[];
  siblings: CensusRecord[];
}

export type SyncEntityType = 'household' | 'person' | 'family_relation' | 'medical_history';
export type SyncOperation = 'CREATE' | 'UPDATE' | 'DELETE';

export interface SyncItem {
  entity_type: SyncEntityType;
  operation: SyncOperation;
  local_entity_id: string;
  payload: Record<string, unknown>;
}

export interface SyncPushRequest {
  items: SyncItem[];
}

export interface SyncPushResult {
  local_entity_id: string;
  server_id?: string;
  status: 'SYNCED' | 'ERROR';
  error?: string;
}

export interface SyncPushResponse {
  results: SyncPushResult[];
}

export interface SyncPullResponse {
  zones: Zone[];
  campaigns: Campaign[];
  households: HouseholdRecord[];
  persons: PersonRecord[];
  family_relations: Array<Record<string, unknown>>;
  medical_histories: MedicalHistory[];
  corrections: CensusRecord[];
  forms: Array<Record<string, unknown>>;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
  zones: Zone[];
}
