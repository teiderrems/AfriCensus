import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../core/api.service';
import { PersonWriteDto } from '../core/dtos';
import { I18nService } from '../core/i18n/i18n.service';
import { Campaign, HouseholdRecord, PersonRecord, Zone } from '../core/models';
import { DetailDrawerComponent, DetailDrawerItem } from '../shared/detail-drawer.component';
import { PageSizeSelectComponent } from '../shared/page-size-select.component';
import { PersonFormModalComponent } from '../shared/person-form-modal.component';
import { StatusFilterComponent } from '../shared/status-filter.component';
import { TablePaginationComponent } from '../shared/table-pagination.component';

@Component({
  selector: 'acl-persons-page',
  imports: [FormsModule, DetailDrawerComponent, PageSizeSelectComponent, PersonFormModalComponent, StatusFilterComponent, TablePaginationComponent],
  template: `
    <section class="page">
      <header class="page-head">
        <div>
          <h1>{{ i18n.t('persons.title') }}</h1>
          @if (formStatus()) {
            <p class="form-status" [class.error]="formStatus().startsWith('Erreur')">{{ formStatus() }}</p>
          }
        </div>
        <button type="button" class="btn primary" (click)="openCreatePerson()">
          <span class="material-symbols-outlined">add</span>
          {{ i18n.t('persons.create') }}
        </button>
      </header>
      <article class="card">
        <div class="table-controls" aria-label="Filtres des personnes">
          <div class="field">
            <label for="personSearch">{{ i18n.t('persons.search') }}</label>
            <input id="personSearch" name="personSearch" type="search" [ngModel]="search()" (ngModelChange)="setSearch($event)" [placeholder]="i18n.t('persons.search.placeholder')" />
          </div>
          <acl-status-filter controlId="personStatus" [value]="statusFilter()" (valueChange)="setStatusFilter($event)" />
          <acl-page-size-select controlId="personPageSize" [value]="pageSize()" [options]="pageSizes" (valueChange)="setPageSize($event)" />
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>{{ i18n.t('persons.table.name') }}</th><th>{{ i18n.t('persons.table.gender') }}</th><th>{{ i18n.t('persons.table.withoutDocument') }}</th><th>{{ i18n.t('persons.table.status') }}</th><th>{{ i18n.t('persons.table.actions') }}</th></tr></thead>
            <tbody>
              @for (row of pagedPersons(); track row.id) {
                <tr>
                  <td><strong>{{ row.first_name }} {{ row.last_name }}</strong></td>
                  <td>{{ row.gender }}</td>
                  <td>{{ row.is_without_document ? i18n.t('persons.yes') : i18n.t('persons.no') }}</td>
                  <td><span class="chip {{ row.validation_status }}">{{ row.validation_status }}</span></td>
                  <td class="row-actions">
                    <button type="button" class="icon-action" aria-label="Voir les détails de la personne" (click)="openPerson(row)">
                      <span class="material-symbols-outlined" aria-hidden="true">visibility</span>
                    </button>
                    <button type="button" class="icon-action" aria-label="Modifier la personne" (click)="editPerson(row)">
                      <span class="material-symbols-outlined" aria-hidden="true">edit</span>
                    </button>
                    <button type="button" class="icon-action" aria-label="Soumettre la personne" (click)="submitPerson(row)">
                      <span class="material-symbols-outlined" aria-hidden="true">upload</span>
                    </button>
                    <button type="button" class="icon-action danger" aria-label="Supprimer la personne" (click)="deletePerson(row)">
                      <span class="material-symbols-outlined" aria-hidden="true">delete</span>
                    </button>
                  </td>
                </tr>
              }
              @if (!pagedPersons().length) {
                <tr><td colspan="5" class="empty-cell">{{ i18n.t('persons.empty') }}</td></tr>
              }
            </tbody>
          </table>
        </div>
        <acl-table-pagination
          ariaLabel="Pagination des personnes"
          [totalItems]="filteredPersons().length"
          [page]="page()"
          [totalPages]="totalPages()"
          (previous)="previousPage()"
          (next)="nextPage()"
        />
      </article>
      <acl-detail-drawer
        [open]="personDrawerOpen()"
        [title]="selectedPersonTitle()"
        [subtitle]="i18n.t('persons.drawer.subtitle')"
        [items]="selectedPersonDetails()"
        (closed)="selectedPerson.set(null)"
      />
      <acl-person-form-modal
        [open]="personModalOpen()"
        [title]="editingPersonId() ? i18n.t('persons.edit') : i18n.t('persons.create')"
        [draft]="draft()"
        [households]="households()"
        [campaigns]="campaigns()"
        [zones]="zones()"
        [disabled]="!canSavePerson()"
        [submitIcon]="editingPersonId() ? 'save' : 'add'"
        [submitLabel]="editingPersonId() ? i18n.t('person.save.btn') : i18n.t('person.create.btn')"
        (closed)="closePersonModal()"
        (draftChange)="draft.set($event)"
        (householdSelected)="selectHousehold($event)"
        (saved)="savePerson()"
      />
    </section>
  `,
  styles: `
    .page { padding: 40px; display: grid; gap: 24px; }
    .page-head { display: flex; align-items: start; justify-content: space-between; gap: 16px; }
    h1 { margin: 0; font-size: 40px; }
    p { margin: 4px 0 0; color: var(--muted); }
    .form-status { font-weight: 800; color: var(--growth); }
    .form-status.error { color: var(--error); }
    .table-controls { grid-template-columns: minmax(220px, 1fr) 190px 130px; margin-top: 0; }
    .icon-action { width: 42px; height: 42px; border: 1px solid var(--outline-soft); border-radius: 8px; background: var(--surface-low); color: var(--primary); display: inline-grid; place-items: center; cursor: pointer; }
    .icon-action.danger { color: var(--error); }
    .icon-action:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
    .row-actions { display: flex; flex-wrap: wrap; gap: 6px; }
    @media(max-width: 860px){
      .page{padding:24px 16px}
      .page-head { flex-direction: column; }
    }
  `,
})
export class PersonsPageComponent implements OnInit {
  readonly persons = signal<PersonRecord[]>([]);
  readonly households = signal<HouseholdRecord[]>([]);
  readonly campaigns = signal<Campaign[]>([]);
  readonly zones = signal<Zone[]>([]);
  readonly draft = signal<PersonWriteDto>(this.emptyDraft());
  readonly editingPersonId = signal<string | null>(null);
  readonly personModalOpen = signal(false);
  readonly formStatus = signal('');
  readonly search = signal('');
  readonly statusFilter = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizes = [5, 10, 20, 50];
  readonly selectedPerson = signal<PersonRecord | null>(null);
  readonly filteredPersons = computed(() => {
    const query = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.persons().filter((row) => {
      const matchesStatus = !status || row.validation_status === status;
      const searchable = `${row.first_name} ${row.last_name} ${row.gender} ${row.validation_status}`.toLowerCase();
      return matchesStatus && (!query || searchable.includes(query));
    });
  });
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredPersons().length / this.pageSize())));
  readonly pagedPersons = computed(() => {
    const start = (Math.min(this.page(), this.totalPages()) - 1) * this.pageSize();
    return this.filteredPersons().slice(start, start + this.pageSize());
  });
  readonly personDrawerOpen = computed(() => Boolean(this.selectedPerson()));
  readonly selectedPersonTitle = computed(() => {
    const person = this.selectedPerson();
    return person ? `${person.first_name} ${person.last_name}` : 'Détails';
  });
  readonly selectedPersonDetails = computed<DetailDrawerItem[]>(() => {
    const person = this.selectedPerson();
    if (!person) return [];
    return [
      { label: 'Identifiant', value: person.id },
      { label: 'Ménage', value: person.household_id },
      { label: 'Campagne', value: this.campaignLabel(person.campaign_id) },
      { label: 'Zone', value: this.zoneLabel(person.zone_id) },
      { label: 'Sexe', value: person.gender },
      { label: 'Sans document', value: person.is_without_document },
      { label: 'Statut', value: person.validation_status },
      { label: 'Dernière mise à jour', value: person.updated_at },
    ];
  });

  constructor(private readonly api: ApiService, readonly i18n: I18nService) {}
  ngOnInit(): void {
    this.api.households().subscribe({
      next: (rows) => {
        this.households.set(rows);
        if (rows.length && !this.draft().household_id) {
          this.selectHousehold(rows[0].id);
        }
      },
      error: () => this.households.set([]),
    });
    this.api.persons().subscribe({
      next: (rows) => this.persons.set(rows),
      error: () => this.persons.set([]),
    });
    this.api.campaigns().subscribe({
      next: (rows) => this.campaigns.set(rows),
      error: () => this.campaigns.set([]),
    });
    this.api.zones().subscribe({
      next: (rows) => this.zones.set(rows),
      error: () => this.zones.set([]),
    });
  }

  setSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
  }

  setStatusFilter(value: string): void {
    this.statusFilter.set(value);
    this.page.set(1);
  }

  setPageSize(value: number | string): void {
    this.pageSize.set(Number(value));
    this.page.set(1);
  }

  previousPage(): void {
    this.page.set(Math.max(1, this.page() - 1));
  }

  nextPage(): void {
    this.page.set(Math.min(this.totalPages(), this.page() + 1));
  }

  openPerson(person: PersonRecord): void {
    this.selectedPerson.set(person);
  }

  openCreatePerson(): void {
    this.resetDraft();
    this.personModalOpen.set(true);
  }

  closePersonModal(): void {
    this.personModalOpen.set(false);
    this.resetDraft();
  }

  updateDraft<Key extends keyof PersonWriteDto>(key: Key, value: PersonWriteDto[Key]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  selectHousehold(householdId: string): void {
    const household = this.households().find((item) => item.id === householdId);
    this.draft.update((draft) => ({
      ...draft,
      household_id: householdId,
      campaign_id: household?.campaign_id || draft.campaign_id,
      zone_id: household?.zone_id || draft.zone_id,
    }));
  }

  canSavePerson(): boolean {
    const draft = this.draft();
    return Boolean(draft.first_name.trim() && draft.last_name.trim() && draft.household_id && draft.campaign_id && draft.zone_id);
  }

  savePerson(): void {
    if (!this.canSavePerson()) return;
    const id = this.editingPersonId();
    const request = id ? this.api.updatePerson(id, this.draft()) : this.api.createPerson(this.draft());
    request.subscribe({
      next: (person) => {
        this.upsertPerson(person);
        this.formStatus.set(id ? 'Personne mise à jour.' : 'Personne créée.');
        this.personModalOpen.set(false);
        this.resetDraft();
      },
      error: () => this.formStatus.set('Erreur : enregistrement impossible.'),
    });
  }

  editPerson(person: PersonRecord): void {
    this.editingPersonId.set(person.id);
    this.draft.set({
      local_id: person.local_id || null,
      household_id: person.household_id,
      campaign_id: person.campaign_id,
      zone_id: person.zone_id,
      first_name: person.first_name,
      last_name: person.last_name,
      other_names: person.other_names || null,
      nickname: person.nickname || null,
      gender: person.gender,
      birth_date: person.birth_date || null,
      birth_date_estimated: person.birth_date_estimated || false,
      estimated_age: person.estimated_age || null,
      birth_place: person.birth_place || null,
      nationality: person.nationality || null,
      primary_language: person.primary_language || null,
      marital_status: person.marital_status || null,
      occupation: person.occupation || null,
      education_level: person.education_level || null,
      phone: person.phone || null,
      is_without_document: person.is_without_document,
      data_source_type: person.data_source_type || null,
    });
    this.personModalOpen.set(true);
  }

  submitPerson(person: PersonRecord): void {
    this.api.submitPerson(person.id).subscribe({
      next: (updated) => this.upsertPerson(updated),
      error: () => this.formStatus.set('Erreur : soumission impossible.'),
    });
  }

  deletePerson(person: PersonRecord): void {
    this.api.deletePerson(person.id).subscribe({
      next: () => {
        this.persons.update((rows) => rows.filter((row) => row.id !== person.id));
        if (this.selectedPerson()?.id === person.id) this.selectedPerson.set(null);
      },
      error: () => this.formStatus.set('Erreur : suppression impossible.'),
    });
  }

  resetDraft(): void {
    const firstHousehold = this.households()[0];
    this.editingPersonId.set(null);
    this.draft.set({
      ...this.emptyDraft(),
      household_id: firstHousehold?.id || '',
      campaign_id: firstHousehold?.campaign_id || '',
      zone_id: firstHousehold?.zone_id || '',
    });
  }

  campaignLabel(campaignId: string): string {
    const campaign = this.campaigns().find((item) => item.id === campaignId);
    return campaign ? `${campaign.name} · ${campaign.status}` : campaignId;
  }

  zoneLabel(zoneId: string): string {
    const zone = this.zones().find((item) => item.id === zoneId);
    return zone ? `${zone.name} · ${zone.code}` : zoneId;
  }

  private upsertPerson(person: PersonRecord): void {
    this.persons.update((rows) => {
      const exists = rows.some((row) => row.id === person.id);
      return exists ? rows.map((row) => (row.id === person.id ? person : row)) : [person, ...rows];
    });
  }

  private emptyDraft(): PersonWriteDto {
    return {
      household_id: '',
      campaign_id: '',
      zone_id: '',
      first_name: '',
      last_name: '',
      gender: 'F',
      birth_date_estimated: false,
      is_without_document: false,
    };
  }
}
