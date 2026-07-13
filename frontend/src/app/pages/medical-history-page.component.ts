import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../core/api.service';
import { MedicalHistoryWriteDto } from '../core/dtos';
import { I18nService } from '../core/i18n/i18n.service';
import { FamilyMedicalRecord, FamilyMedicalSummary, MedicalSeverity, MedicalStatus, PersonRecord } from '../core/models';
import { OfflineSyncService } from '../core/offline-sync.service';
import { DetailDrawerComponent, DetailDrawerItem } from '../shared/detail-drawer.component';
import { PageSizeSelectComponent } from '../shared/page-size-select.component';
import { TablePaginationComponent } from '../shared/table-pagination.component';

@Component({
  selector: 'acl-medical-history-page',
  imports: [FormsModule, DetailDrawerComponent, PageSizeSelectComponent, TablePaginationComponent],
  template: `
    <section class="page">
      <header class="page-head">
        <div>
          <h1>{{ i18n.t('medicalHistory.title') }}</h1>
          <p>{{ i18n.t('medicalHistory.subtitle') }}</p>
        </div>
        <div class="controls">
          <div class="field">
            <label for="person">{{ i18n.t('medicalHistory.centralPerson') }}</label>
            <select id="person" name="person" [ngModel]="selectedPersonId()" (ngModelChange)="selectPerson($event)">
              @for (person of persons(); track person.id) {
                <option [value]="person.id">{{ person.first_name }} {{ person.last_name }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label for="depth">{{ i18n.t('medicalHistory.depth') }}</label>
            <select id="depth" name="depth" [ngModel]="depth()" (ngModelChange)="setDepth($event)">
              @for (option of depthOptions; track option) {
                <option [ngValue]="option">{{ option }}</option>
              }
            </select>
          </div>
        </div>
      </header>

      @if (summary(); as data) {
        <section class="stats-grid" aria-label="Synthèse médicale familiale">
          <article class="stat-card">
            <span class="material-symbols-outlined">groups</span>
            <strong>{{ data.total_family_members }}</strong>
            <p>{{ i18n.t('medicalHistory.analyzedMembers') }}</p>
          </article>
          <article class="stat-card">
            <span class="material-symbols-outlined">clinical_notes</span>
            <strong>{{ data.total_medical_records }}</strong>
            <p>{{ i18n.t('medicalHistory.recordedHistory') }}</p>
          </article>
          <article class="stat-card risk">
            <span class="material-symbols-outlined">genetics</span>
            <strong>{{ data.hereditary_records }}</strong>
            <p>{{ i18n.t('medicalHistory.hereditaryRisks') }}</p>
          </article>
          <article class="stat-card">
            <span class="material-symbols-outlined">monitoring</span>
            <strong>{{ data.conditions.length }}</strong>
            <p>{{ i18n.t('medicalHistory.distinctConditions') }}</p>
          </article>
        </section>

        <section class="workspace">
          <article class="card">
            <h2>{{ i18n.t('medicalHistory.createHistory') }}</h2>
            <form class="medical-form" (ngSubmit)="createHistory()">
              <div class="field">
                <label for="condition">{{ i18n.t('medicalHistory.condition') }}</label>
                <input id="condition" name="condition" required [ngModel]="draft().condition_name" (ngModelChange)="updateDraft('condition_name', $event)" />
              </div>
              <div class="field">
                <label for="category">{{ i18n.t('medicalHistory.category') }}</label>
                <select id="category" name="category" [ngModel]="draft().category" (ngModelChange)="updateDraft('category', $event)">
                  <option value="CARDIOVASCULAR">{{ i18n.t('medicalHistory.category.cardiovascular') }}</option>
                  <option value="METABOLIC">{{ i18n.t('medicalHistory.category.metabolic') }}</option>
                  <option value="RESPIRATORY">{{ i18n.t('medicalHistory.category.respiratory') }}</option>
                  <option value="NEUROLOGICAL">{{ i18n.t('medicalHistory.category.neurological') }}</option>
                  <option value="GENETIC">{{ i18n.t('medicalHistory.category.genetic') }}</option>
                  <option value="OTHER">{{ i18n.t('medicalHistory.category.other') }}</option>
                </select>
              </div>
              <div class="form-row">
                <div class="field">
                  <label for="severity">{{ i18n.t('medicalHistory.severity') }}</label>
                  <select id="severity" name="severity" [ngModel]="draft().severity" (ngModelChange)="updateDraft('severity', $event)">
                    @for (severity of severities; track severity) {
                      <option [value]="severity">{{ severityLabel(severity) }}</option>
                    }
                  </select>
                </div>
                <div class="field">
                  <label for="status">{{ i18n.t('medicalHistory.status') }}</label>
                  <select id="status" name="status" [ngModel]="draft().status" (ngModelChange)="updateDraft('status', $event)">
                    @for (status of statuses; track status) {
                      <option [value]="status">{{ statusLabel(status) }}</option>
                    }
                  </select>
                </div>
              </div>
              <div class="form-row">
                <div class="field">
                  <label for="diagnosisAge">{{ i18n.t('medicalHistory.diagnosisAge') }}</label>
                  <input id="diagnosisAge" name="diagnosisAge" type="number" min="0" max="130" [ngModel]="draft().diagnosis_age" (ngModelChange)="updateDraft('diagnosis_age', numberOrNull($event))" />
                </div>
                <div class="field">
                  <label for="code">{{ i18n.t('medicalHistory.medicalCode') }}</label>
                  <input id="code" name="code" [ngModel]="draft().condition_code" (ngModelChange)="updateDraft('condition_code', $event)" />
                </div>
              </div>
              <label class="check">
                <input type="checkbox" name="hereditary" [ngModel]="draft().hereditary_risk" (ngModelChange)="updateDraft('hereditary_risk', $event)" />
                {{ i18n.t('medicalHistory.hereditaryOrFamilialRisk') }}
              </label>
              <div class="field">
                <label for="notes">{{ i18n.t('medicalHistory.notes') }}</label>
                <textarea id="notes" name="notes" rows="4" [ngModel]="draft().notes" (ngModelChange)="updateDraft('notes', $event)"></textarea>
              </div>
              <button class="btn primary" type="submit" [disabled]="!canSubmit()">
                <span class="material-symbols-outlined">add</span>
                {{ i18n.t('medicalHistory.add') }}
              </button>
            </form>
          </article>

          <article class="card">
            <h2>{{ i18n.t('medicalHistory.recurrentConditions') }}</h2>
            <div class="condition-list">
              @for (condition of data.conditions; track condition.condition_name + condition.category) {
                <article class="condition-item">
                  <div>
                    <strong>{{ condition.condition_name }}</strong>
                    <span>{{ condition.category }} · {{ condition.total_cases }} {{ i18n.t('medicalHistory.cases') }}</span>
                  </div>
                  <div class="condition-meta">
                    <span class="pill">{{ condition.hereditary_cases }} {{ i18n.t('medicalHistory.hereditary') }}</span>
                    <span class="pill">{{ generationLabels(condition.affected_generations) }}</span>
                  </div>
                </article>
              }
              @if (!data.conditions.length) {
                <p class="empty">{{ i18n.t('medicalHistory.emptySummary') }}</p>
              }
            </div>
          </article>
        </section>

        <article class="card">
          <div class="section-head">
            <h2>{{ i18n.t('medicalHistory.historyInFamily') }}</h2>
            <span class="muted">{{ i18n.t('medicalHistory.depth') }} {{ data.depth }}</span>
          </div>
          <div class="table-controls" aria-label="Filtres des antécédents médicaux">
            <div class="field">
              <label for="medicalSearch">{{ i18n.t('persons.search') }}</label>
              <input id="medicalSearch" name="medicalSearch" type="search" [ngModel]="medicalSearch()" (ngModelChange)="setMedicalSearch($event)" [placeholder]="i18n.t('medicalHistory.search.placeholder')" />
            </div>
            <div class="field">
              <label for="medicalGroup">{{ i18n.t('medicalHistory.generation') }}</label>
              <select id="medicalGroup" name="medicalGroup" [ngModel]="medicalGroupFilter()" (ngModelChange)="setMedicalGroupFilter($event)">
                <option value="">{{ i18n.t('medicalHistory.all') }}</option>
                <option value="root">{{ i18n.t('medicalHistory.centralPerson') }}</option>
                <option value="parent">{{ i18n.t('medicalHistory.parent') }}</option>
                <option value="spouse">{{ i18n.t('medicalHistory.spouse') }}</option>
                <option value="child">{{ i18n.t('medicalHistory.child') }}</option>
                <option value="sibling">{{ i18n.t('medicalHistory.sibling') }}</option>
                <option value="relative">{{ i18n.t('medicalHistory.relative') }}</option>
              </select>
            </div>
            <div class="field">
              <label for="medicalSeverity">{{ i18n.t('medicalHistory.severity') }}</label>
              <select id="medicalSeverity" name="medicalSeverity" [ngModel]="medicalSeverityFilter()" (ngModelChange)="setMedicalSeverityFilter($event)">
                <option value="">{{ i18n.t('medicalHistory.all') }}</option>
                @for (severity of severities; track severity) {
                  <option [value]="severity">{{ severityLabel(severity) }}</option>
                }
              </select>
            </div>
            <div class="field">
              <label for="medicalRisk">{{ i18n.t('medicalHistory.risk') }}</label>
              <select id="medicalRisk" name="medicalRisk" [ngModel]="medicalRiskFilter()" (ngModelChange)="setMedicalRiskFilter($event)">
                <option value="">{{ i18n.t('medicalHistory.allRisks') }}</option>
                <option value="hereditary">{{ i18n.t('medicalHistory.hereditaryRisk') }}</option>
                <option value="non_hereditary">{{ i18n.t('medicalHistory.nonHereditaryRisk') }}</option>
              </select>
            </div>
            <acl-page-size-select controlId="medicalPageSize" [value]="medicalPageSize()" [options]="pageSizes" (valueChange)="setMedicalPageSize($event)" />
          </div>
          <div class="table-wrap responsive-card">
            <table class="responsive-table">
              <thead>
                <tr>
                  <th>{{ i18n.t('medicalHistory.person') }}</th>
                  <th>{{ i18n.t('medicalHistory.generation') }}</th>
                  <th>{{ i18n.t('medicalHistory.condition') }}</th>
                  <th>{{ i18n.t('medicalHistory.severity') }}</th>
                  <th>{{ i18n.t('medicalHistory.status') }}</th>
                  <th>{{ i18n.t('medicalHistory.hereditaryRisk') }}</th>
                  <th>{{ i18n.t('medicalHistory.details') }}</th>
                </tr>
              </thead>
              <tbody>
                @for (record of pagedMedicalRecords(); track record.id) {
                  <tr>
                    <td [attr.data-label]="i18n.t('medicalHistory.person')">{{ record.person_label }}</td>
                    <td [attr.data-label]="i18n.t('medicalHistory.generation')">{{ groupLabel(record.family_group) }}</td>
                    <td [attr.data-label]="i18n.t('medicalHistory.condition')"><strong>{{ record.condition_name }}</strong><br /><span class="muted">{{ record.category }}</span></td>
                    <td [attr.data-label]="i18n.t('medicalHistory.severity')"><span class="severity {{ record.severity }}">{{ severityLabel(record.severity) }}</span></td>
                    <td [attr.data-label]="i18n.t('medicalHistory.status')">{{ statusLabel(record.status) }}</td>
                    <td [attr.data-label]="i18n.t('medicalHistory.hereditaryRisk')">{{ record.hereditary_risk ? i18n.t('persons.yes') : i18n.t('persons.no') }}</td>
                    <td [attr.data-label]="i18n.t('medicalHistory.details')">
                      <button type="button" class="icon-action" aria-label="Voir les détails de l'antécédent" (click)="openMedicalRecord(record)">
                        <span class="material-symbols-outlined" aria-hidden="true">visibility</span>
                      </button>
                    </td>
                  </tr>
                }
                @if (!pagedMedicalRecords().length) {
                  <tr><td colspan="7" class="empty-cell">{{ i18n.t('medicalHistory.emptyHistory') }}</td></tr>
                }
              </tbody>
            </table>
          </div>
          <acl-table-pagination
            ariaLabel="Pagination des antécédents médicaux"
            [totalItems]="filteredMedicalRecords().length"
            [page]="medicalPage()"
            [totalPages]="medicalTotalPages()"
            (previous)="previousMedicalPage()"
            (next)="nextMedicalPage()"
          />
        </article>
        <acl-detail-drawer
          [open]="medicalDrawerOpen()"
          [title]="selectedMedicalTitle()"
          [subtitle]="i18n.t('medicalHistory.drawer.subtitle')"
          [items]="selectedMedicalDetails()"
          (closed)="selectedMedicalRecord.set(null)"
        />
      }
    </section>
  `,
  styles: `
    .page { padding: 40px; display: grid; gap: 24px; }
    .page-head, .section-head { display: flex; align-items: end; justify-content: space-between; gap: 24px; }
    h1 { margin: 0; font-size: 40px; line-height: 48px; }
    h2 { margin: 0 0 18px; font-size: 24px; }
    p { margin: 4px 0 0; color: var(--muted); }
    .controls { display: grid; grid-template-columns: minmax(260px, 1fr) 140px; gap: 14px; min-width: 430px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
    .stat-card {
      min-height: 132px; border: 2px solid var(--outline-soft); border-radius: 8px; padding: 18px;
      background: var(--surface); display: grid; gap: 8px; align-content: start;
    }
    .stat-card span { color: var(--primary); }
    .stat-card.risk span { color: var(--terracotta); }
    .stat-card strong { font-size: 34px; line-height: 38px; }
    .workspace { display: grid; grid-template-columns: minmax(320px, 440px) minmax(0, 1fr); gap: 24px; align-items: start; }
    .medical-form { display: grid; gap: 16px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .medical-form .field { min-width: 0; }
    .medical-form input, .medical-form select, .medical-form textarea { min-width: 0; }
    .check { min-height: 48px; display: flex; align-items: center; gap: 10px; font-weight: 800; }
    .check input { width: 22px; height: 22px; accent-color: var(--primary); }
    .condition-list { display: grid; gap: 12px; }
    .condition-item {
      min-height: 76px; border: 2px solid var(--outline-soft); border-radius: 8px; padding: 14px;
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
    }
    .condition-item strong { display: block; font-size: 18px; }
    .condition-item span, .muted { color: var(--muted); }
    .condition-meta { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
    .pill { border: 1px solid var(--outline-soft); border-radius: 999px; padding: 6px 10px; font-size: 12px; font-weight: 900; }
    .severity { border-radius: 999px; padding: 6px 10px; font-size: 12px; font-weight: 900; background: var(--surface-container); }
    .severity.HIGH, .severity.CRITICAL { background: var(--error-soft); color: var(--error); }
    .severity.MODERATE { background: var(--terracotta-soft); color: var(--terracotta); }
    .severity.LOW { background: var(--primary-soft); color: var(--primary); }
    .icon-action { width: 42px; height: 42px; border: 1px solid var(--outline-soft); border-radius: 8px; background: var(--surface-low); color: var(--primary); display: inline-grid; place-items: center; cursor: pointer; }
    .icon-action:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
    .empty { min-height: 120px; display: grid; place-items: center; border: 2px dashed var(--outline-soft); border-radius: 8px; padding: 20px; text-align: center; }
    .table-controls { grid-template-columns: minmax(260px, 1fr) repeat(4, minmax(150px, 190px)); align-items: end; }
    .responsive-card table { min-width: 880px; }
    .responsive-table th, .responsive-table td { white-space: normal; }
    .responsive-table td:last-child { width: 74px; }
    @media(max-width: 1100px) {
      .workspace { grid-template-columns: 1fr; }
      .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .table-controls { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media(max-width: 860px) {
      .page { padding: 24px 16px; }
      .page-head, .section-head { align-items: start; flex-direction: column; }
      .controls, .form-row, .stats-grid, .table-controls { grid-template-columns: 1fr; min-width: 0; width: 100%; }
      .condition-item { align-items: start; flex-direction: column; }
      .condition-meta { justify-content: flex-start; }
      h1 { font-size: 32px; line-height: 40px; }
    }
    @media(max-width: 520px) {
      .page { padding: 16px 8px; gap: 16px; }
      h1 { font-size: 28px; line-height: 36px; }
      h2 { font-size: 20px; line-height: 28px; margin-bottom: 14px; }
      .workspace { gap: 16px; }
      .condition-item { padding: 12px; gap: 12px; }
      .condition-item strong { overflow-wrap: anywhere; }
      .condition-meta { gap: 6px; }
      .pill { max-width: 100%; white-space: normal; line-height: 16px; }
      .section-head { gap: 6px; }
      .table-controls { margin: 14px 0; gap: 10px; }
    }
  `,
})
export class MedicalHistoryPageComponent implements OnInit {
  readonly persons = signal<PersonRecord[]>([]);
  readonly selectedPersonId = signal('');
  readonly depth = signal(2);
  readonly summary = signal<FamilyMedicalSummary | null>(null);
  readonly depthOptions = [0, 1, 2, 3, 4, 5, 6];
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

  constructor(private readonly api: ApiService, private readonly offline: OfflineSyncService, readonly i18n: I18nService) {}

  ngOnInit(): void {
    this.api.persons().subscribe({
      next: (persons) => {
        this.persons.set(persons);
        if (persons.length) {
          this.selectPerson(persons[0].id);
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

  createHistory(): void {
    if (!this.canSubmit()) return;
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
