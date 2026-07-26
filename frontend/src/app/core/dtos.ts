import { MedicalSeverity, MedicalStatus, UserRole } from './models';

export interface UserCreateDto {
  username: string;
  full_name: string;
  role: UserRole;
  password: string;
  active: boolean;
  zone_ids: string[];
}

export interface UserUpdateDto {
  username?: string;
  full_name?: string;
  role?: string;
  active?: boolean;
  zone_ids?: string[];
}

export interface HouseholdWriteDto {
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

export interface PersonWriteDto {
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

export interface FamilyRelationWriteDto {
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

export interface MedicalHistoryWriteDto {
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

export interface FieldMetadataDto {
  label: string;
  help: string;
}

export interface FieldCatalogDto {
  language: string;
  models: Record<string, Record<string, FieldMetadataDto>>;
}

export interface FormDefinitionWriteDto {
  title: Record<string, string>;
  description: Record<string, string>;
  fields: any[];
  status: string;
  version?: number;
}

export interface ZoneWriteDto {
  name: string | Record<string, string>;
  code: string;
  type: string;
  parent_id?: string | null;
  status?: string;
}

export interface CampaignWriteDto {
  name: string | Record<string, string>;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  zone_ids: string[];
}

export interface AppRoleWriteDto {
  name: string | Record<string, string>;
  description?: string | Record<string, string> | null;
  permissions: string[];
}
