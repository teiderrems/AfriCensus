import { SelectComponent } from '@/app/shared/select/select.component';
import { LucideAngularModule } from 'lucide-angular';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '@/app/core/api.service';
import { ConfirmService } from '@/app/core/confirm';
import { MedicalHistoryWriteDto } from '@/app/core/dtos';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { FamilyMedicalRecord, FamilyMedicalSummary, MedicalSeverity, MedicalStatus, PersonRecord } from '@/app/core/models';
import { OfflineSyncService } from '@/app/core/offline-sync.service';
import { DetailDrawerComponent, DetailDrawerItem } from '@/app/shared/detail-drawer/detail-drawer.component';
import { PageSizeSelectComponent } from '@/app/shared/page-size-select/page-size-select.component';
import { TablePaginationComponent } from '@/app/shared/table-pagination/table-pagination.component';
import { CardComponent } from '@/app/shared/card/card.component';
import { ButtonComponent } from '@/app/shared/button/button';
import { AclTooltipDirective } from '@/app/shared/tooltip/tooltip';

@Component({
  selector: 'acl-medical-history-page',
  imports: [LucideAngularModule, FormsModule, DetailDrawerComponent, PageSizeSelectComponent, TablePaginationComponent, SelectComponent, CardComponent, ButtonComponent, AclTooltipDirective],
  templateUrl: './medical-history.component.html',
  styleUrl: './medical-history.component.css',
})
export class MedicalHistoryComponent implements OnInit {
  personOptions = computed(() => this.persons().map(p => ({label: p.first_name + ' ' + p.last_name, value: p.id})));
  categoryOptions = computed(() => [
    {label: this.i18n.t('medical.cat.CHRONIC'), value: 'CHRONIC'},
    {label: this.i18n.t('medical.cat.GENETIC'), value: 'GENETIC'},
    {label: this.i18n.t('medical.cat.ALLERGY'), value: 'ALLERGY'},
    {label: this.i18n.t('medical.cat.SURGERY'), value: 'SURGERY'},
    {label: this.i18n.t('medical.cat.OTHER'), value: 'OTHER'}
  ]);
  severityOptions = computed(() => [
    {label: this.i18n.t('medical.sev.MILD'), value: 'MILD'},
    {label: this.i18n.t('medical.sev.MODERATE'), value: 'MODERATE'},
    {label: this.i18n.t('medical.sev.SEVERE'), value: 'SEVERE'},
    {label: this.i18n.t('medical.sev.CRITICAL'), value: 'CRITICAL'}
  ]);
  statusOptions = computed(() => [
    {label: this.i18n.t('medical.status.ACTIVE'), value: 'ACTIVE'},
    {label: this.i18n.t('medical.status.RESOLVED'), value: 'RESOLVED'},
    {label: this.i18n.t('medical.status.MANAGED'), value: 'MANAGED'}
  ]);
  medicalGroupOptions = computed(() => [
    {label: this.i18n.t('medical.group.all'), value: ''},
    {label: this.i18n.t('medical.group.personal'), value: 'personal'},
    {label: this.i18n.t('medical.group.family'), value: 'family'}
  ]);
  medicalSeverityOptions = computed(() => [
    {label: this.i18n.t('medical.sev.all'), value: ''},
    {label: this.i18n.t('medical.sev.MILD'), value: 'MILD'},
    {label: this.i18n.t('medical.sev.MODERATE'), value: 'MODERATE'},
    {label: this.i18n.t('medical.sev.SEVERE'), value: 'SEVERE'},
    {label: this.i18n.t('medical.sev.CRITICAL'), value: 'CRITICAL'}
  ]);
  medicalRiskOptions = computed(() => [
    {label: this.i18n.t('medical.risk.all'), value: ''},
    {label: this.i18n.t('medical.risk.low'), value: 'low'},
    {label: this.i18n.t('medical.risk.medium'), value: 'medium'},
    {label: this.i18n.t('medical.risk.high'), value: 'high'}
  ]);

  readonly persons = signal<PersonRecord[]>([]);
  readonly selectedPersonId = signal('');
  readonly depth = signal(2);
  readonly summary = signal<FamilyMedicalSummary | null>(null);
  readonly depthOptions = [0, 1, 2, 3, 4, 5, 6].map(v => ({label: v.toString(), value: v}));
  readonly severities: MedicalSeverity[] = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];
  readonly statuses: MedicalStatus[] = ['ACTIVE', 'MONITORED', 'RESOLVED', 'UNKNOWN'];
  readonly draft = signal<MedicalHistoryWriteDto>(this.emptyDraft());
  readonly canSubmit = computed(() => Boolean(this.selectedPersonId() && this.draft().condition_name.trim()));
  readonly pageSizes = [5, 10, 20, 50];
  readonly medicalSearch = signal('');
  readonly medicalGroupFilter = signal('');
  readonly medicalSeverityFilter = signal('');
  readonly medicalRiskFilter = signal('');
  readonly medicalPage = signal(1);
  readonly medicalPageSize = signal(10);
  readonly selectedMedicalRecord = signal<FamilyMedicalRecord | null>(null);
  readonly filteredMedicalRecords = computed(() => {
    const query = this.medicalSearch().trim().toLowerCase();
    const group = this.medicalGroupFilter();
    const severity = this.medicalSeverityFilter();
    const risk = this.medicalRiskFilter();
    return (this.summary()?.records || []).filter((record) => {
      const matchesGroup = !group || record.family_group === group;
      const matchesSeverity = !severity || record.severity === severity;
      const matchesRisk =
        !risk || (risk === 'hereditary' && record.hereditary_risk) || (risk === 'non_hereditary' && !record.hereditary_risk);
      const searchable = `${record.person_label} ${record.condition_name} ${record.category} ${record.condition_code || ''} ${record.status}`.toLowerCase();
      return matchesGroup && matchesSeverity && matchesRisk && (!query || searchable.includes(query));
    });
  });
  readonly medicalTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredMedicalRecords().length / this.medicalPageSize())));
  readonly pagedMedicalRecords = computed(() => {
    const start = (Math.min(this.medicalPage(), this.medicalTotalPages()) - 1) * this.medicalPageSize();
    return this.filteredMedicalRecords().slice(start, start + this.medicalPageSize());
  });
  readonly medicalDrawerOpen = computed(() => Boolean(this.selectedMedicalRecord()));
  readonly selectedMedicalTitle = computed(() => this.selectedMedicalRecord()?.condition_name || 'Détails');
  readonly selectedMedicalDetails = computed<DetailDrawerItem[]>(() => {
    const record = this.selectedMedicalRecord();
    if (!record) return [];
    return [
      { label: 'Personne', value: record.person_label },
      { label: 'Génération', value: this.groupLabel(record.family_group) },
      { label: 'Catégorie', value: record.category },
      { label: 'Code médical', value: record.condition_code },
      { label: 'Gravité', value: this.severityLabel(record.severity) },
      { label: 'Statut', value: this.statusLabel(record.status) },
      { label: 'Risque héréditaire', value: record.hereditary_risk },
      { label: 'Âge au diagnostic', value: record.diagnosis_age },
      { label: 'Date de diagnostic', value: record.diagnosis_date },
      { label: 'Synchronisation', value: record.sync_status },
      { label: 'Validation', value: record.validation_status },
      { label: 'Notes', value: record.notes },
    ];
  });

  constructor(
    private readonly api: ApiService,
    private readonly offline: OfflineSyncService,
    readonly i18n: I18nService,
    private readonly confirmService: ConfirmService
  ) {}

  ngOnInit(): void {
    this.api.persons().subscribe({
      next: (persons) => {
        this.persons.set(persons.items);
        if (persons.items.length) {
          this.selectPerson(persons.items[0].id);
        }
      },
      error: () => this.persons.set([]),
    });
  }

  selectPerson(personId: string): void {
    if (!personId) return;
    const person = this.persons().find((item) => item.id === personId);
    this.selectedPersonId.set(personId);
    this.draft.set({ ...this.emptyDraft(), person_id: personId, campaign_id: person?.campaign_id || '' });
    this.loadSummary();
  }

  setDepth(value: number | string): void {
    const nextDepth = Math.min(6, Math.max(0, Number(value)));
    this.depth.set(Number.isNaN(nextDepth) ? 2 : nextDepth);
    this.medicalPage.set(1);
    this.loadSummary();
  }

  updateDraft<Key extends keyof MedicalHistoryWriteDto>(key: Key, value: MedicalHistoryWriteDto[Key]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  async createHistory(): Promise<void> {
    if (!this.canSubmit()) return;
    const confirmed = await this.confirmService.ask(
      this.i18n.t('action.confirm'),
      this.i18n.t('medical.confirmSave')
    );
    if (!confirmed) return;

    this.offline.createMedicalHistory(this.draft()).subscribe({
      next: () => {
        const personId = this.selectedPersonId();
        const campaignId = this.draft().campaign_id;
        this.draft.set({ ...this.emptyDraft(), person_id: personId, campaign_id: campaignId });
        if (this.offline.online()) {
          this.loadSummary();
        }
      },
      error: () => undefined,
    });
  }

  numberOrNull(value: string | number | null): number | null {
    if (value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  severityLabel(severity: MedicalSeverity | string): string {
    return { LOW: 'Faible', MODERATE: 'Modérée', HIGH: 'Élevée', CRITICAL: 'Critique' }[severity] || severity;
  }

  statusLabel(status: MedicalStatus | string): string {
    return { ACTIVE: 'Actif', MONITORED: 'Suivi', RESOLVED: 'Résolu', UNKNOWN: 'Inconnu' }[status] || status;
  }

  groupLabel(group: string): string {
    return {
      root: 'Personne centrale',
      parent: 'Parent',
      spouse: 'Conjoint',
      child: 'Enfant',
      sibling: 'Fratrie',
      relative: 'Proche',
    }[group] || group;
  }

  generationLabels(groups: string[]): string {
    return groups.map((group) => this.groupLabel(group)).join(', ');
  }

  setMedicalSearch(value: string): void {
    this.medicalSearch.set(value);
    this.medicalPage.set(1);
  }

  setMedicalGroupFilter(value: string): void {
    this.medicalGroupFilter.set(value);
    this.medicalPage.set(1);
  }

  setMedicalSeverityFilter(value: string): void {
    this.medicalSeverityFilter.set(value);
    this.medicalPage.set(1);
  }

  setMedicalRiskFilter(value: string): void {
    this.medicalRiskFilter.set(value);
    this.medicalPage.set(1);
  }

  setMedicalPageSize(value: number | string): void {
    this.medicalPageSize.set(Number(value));
    this.medicalPage.set(1);
  }

  previousMedicalPage(): void {
    this.medicalPage.set(Math.max(1, this.medicalPage() - 1));
  }

  nextMedicalPage(): void {
    this.medicalPage.set(Math.min(this.medicalTotalPages(), this.medicalPage() + 1));
  }

  openMedicalRecord(record: FamilyMedicalRecord): void {
    this.selectedMedicalRecord.set(record);
  }

  private loadSummary(): void {
    if (!this.selectedPersonId()) return;
    this.api.familyMedicalSummary(this.selectedPersonId(), this.depth()).subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.medicalPage.set(1);
      },
      error: () => this.summary.set(null),
    });
  }

  private emptyDraft(): MedicalHistoryWriteDto {
    return {
      person_id: '',
      campaign_id: '',
      condition_name: '',
      condition_code: '',
      category: 'CARDIOVASCULAR',
      diagnosis_age: null,
      diagnosis_date: null,
      severity: 'MODERATE',
      status: 'ACTIVE',
      hereditary_risk: false,
      notes: '',
    };
  }
}
