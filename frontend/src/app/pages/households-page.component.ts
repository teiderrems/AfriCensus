import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../core/api.service';
import { HouseholdWriteDto, PersonWriteDto } from '../core/dtos';
import { I18nService } from '../core/i18n/i18n.service';
import { Campaign, HouseholdRecord, PersonRecord, Zone } from '../core/models';
import { DetailDrawerComponent, DetailDrawerItem } from '../shared/detail-drawer.component';
import { ModalComponent } from '../shared/modal.component';
import { PageSizeSelectComponent } from '../shared/page-size-select.component';
import { PersonFormModalComponent } from '../shared/person-form-modal.component';
import { StatusFilterComponent } from '../shared/status-filter.component';
import { TablePaginationComponent } from '../shared/table-pagination.component';

@Component({
  selector: 'acl-households-page',
  imports: [FormsModule, DetailDrawerComponent, ModalComponent, PageSizeSelectComponent, PersonFormModalComponent, StatusFilterComponent, TablePaginationComponent],
  template: `
    <section class="page">
      <header class="page-head">
        <div>
          <h1>Ménages</h1>
          @if (formStatus()) {
            <p class="form-status" [class.error]="formStatus().startsWith('Erreur')">{{ formStatus() }}</p>
          }
        </div>
        <button type="button" class="btn primary" (click)="openCreateHousehold()">
          <span class="material-symbols-outlined">add</span>
          Créer un ménage
        </button>
      </header>
      <article class="card">
        <div class="table-controls" aria-label="Filtres des ménages">
          <div class="field">
            <label for="householdSearch">Recherche</label>
            <input id="householdSearch" name="householdSearch" type="search" [ngModel]="search()" (ngModelChange)="setSearch($event)" placeholder="Code, adresse, statut..." />
          </div>
          <acl-status-filter controlId="householdStatus" [value]="statusFilter()" (valueChange)="setStatusFilter($event)" />
          <acl-page-size-select controlId="householdPageSize" [value]="pageSize()" [options]="pageSizes" (valueChange)="setPageSize($event)" />
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Code ménage</th><th>Adresse</th><th>Membres</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              @for (row of pagedHouseholds(); track row.id) {
                <tr>
                  <td><strong>{{ row.household_code }}</strong></td>
                  <td>{{ row.address_text }}</td>
                  <td>{{ row.member_count }}</td>
                  <td><span class="chip {{ row.validation_status }}">{{ row.validation_status }}</span></td>
                  <td class="row-actions">
                    <button type="button" class="icon-action" aria-label="Voir les détails du ménage" (click)="openHousehold(row)">
                      <span class="material-symbols-outlined" aria-hidden="true">visibility</span>
                    </button>
                    <button type="button" class="icon-action" aria-label="Modifier le ménage" (click)="editHousehold(row)">
                      <span class="material-symbols-outlined" aria-hidden="true">edit</span>
                    </button>
                    <button type="button" class="icon-action" aria-label="Associer un responsable au ménage" (click)="openResponsibleModal(row)">
                      <span class="material-symbols-outlined" aria-hidden="true">supervisor_account</span>
                    </button>
                    <button type="button" class="icon-action" aria-label="Soumettre le ménage" (click)="submitHousehold(row)">
                      <span class="material-symbols-outlined" aria-hidden="true">upload</span>
                    </button>
                    <button type="button" class="icon-action danger" aria-label="Supprimer le ménage" (click)="deleteHousehold(row)">
                      <span class="material-symbols-outlined" aria-hidden="true">delete</span>
                    </button>
                  </td>
                </tr>
              }
              @if (!pagedHouseholds().length) {
                <tr><td colspan="5" class="empty-cell">Aucun ménage ne correspond aux filtres.</td></tr>
              }
            </tbody>
          </table>
        </div>
        <acl-table-pagination
          ariaLabel="Pagination des ménages"
          [totalItems]="filteredHouseholds().length"
          [page]="page()"
          [totalPages]="totalPages()"
          (previous)="previousPage()"
          (next)="nextPage()"
        />
      </article>
      <acl-detail-drawer
        [open]="householdDrawerOpen()"
        [title]="selectedHouseholdTitle()"
        subtitle="Fiche ménage"
        [items]="selectedHouseholdDetails()"
        (closed)="selectedHousehold.set(null)"
      />
      <acl-modal
        [open]="responsibleModalOpen()"
        [title]="'Responsable du ménage'"
        [subtitle]="responsibleHouseholdLabel()"
        (closed)="closeResponsibleModal()"
      >
        <div class="responsible-panel">
          <div class="field">
            <label for="responsiblePerson">Personne responsable</label>
            <select id="responsiblePerson" name="responsiblePerson" [ngModel]="responsiblePersonId()" (ngModelChange)="responsiblePersonId.set($event)">
              <option value="">Sélectionner une personne existante</option>
              @for (person of responsibleCandidates(); track person.id) {
                <option [value]="person.id">{{ person.first_name }} {{ person.last_name }} · {{ person.gender }}</option>
              }
            </select>
          </div>
          <button type="button" class="btn secondary" (click)="openResponsiblePersonCreation()">
            <span class="material-symbols-outlined">person_add</span>
            Ajouter une personne dans ce ménage
          </button>
        </div>
        <ng-container modal-actions>
          <button type="button" class="btn secondary" (click)="closeResponsibleModal()">Annuler</button>
          <button type="button" class="btn primary" [disabled]="!responsiblePersonId()" (click)="assignResponsiblePerson()">
            <span class="material-symbols-outlined">link</span>
            Associer
          </button>
        </ng-container>
      </acl-modal>
      <acl-person-form-modal
        [open]="responsiblePersonModalOpen()"
        title="Ajouter une personne responsable"
        subtitle="La personne sera créée directement dans le ménage sélectionné."
        [draft]="responsiblePersonDraft()"
        [households]="responsibleHouseholdList()"
        [campaigns]="campaigns()"
        [zones]="zones()"
        [disabled]="!canSaveResponsiblePerson()"
        submitIcon="person_add"
        submitLabel="Créer et associer"
        (closed)="responsiblePersonModalOpen.set(false)"
        (draftChange)="responsiblePersonDraft.set($event)"
        (householdSelected)="selectResponsiblePersonHousehold($event)"
        (saved)="createAndAssignResponsiblePerson()"
      />
      <acl-modal
        [open]="householdModalOpen()"
        [title]="editingHouseholdId() ? i18n.t('household.edit.title') : i18n.t('household.create.title')"
        [subtitle]="i18n.t('household.draft.subtitle')"
        [isForm]="true"
        (submitted)="saveHousehold()"
        (closed)="closeHouseholdModal()"
      >
        <div class="crud-form">
          <div class="field">
            <label for="householdCode">{{ i18n.t('household.code') }}</label>
            <input id="householdCode" name="householdCode" required [ngModel]="draft().household_code" (ngModelChange)="updateDraft('household_code', $event)" />
          </div>
          <div class="field">
            <label for="householdCampaign">{{ i18n.t('household.campaign') }}</label>
            <select id="householdCampaign" name="householdCampaign" required [ngModel]="draft().campaign_id" (ngModelChange)="updateDraft('campaign_id', $event)">
              <option value="">{{ i18n.t('household.select') }}</option>
              @for (campaign of campaigns(); track campaign.id) {
                <option [value]="campaign.id">{{ campaign.name }} · {{ campaign.status }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label for="householdZone">{{ i18n.t('household.zone') }}</label>
            <select id="householdZone" name="householdZone" required [ngModel]="draft().zone_id" (ngModelChange)="updateDraft('zone_id', $event)">
              <option value="">{{ i18n.t('household.select') }}</option>
              @for (zone of zones(); track zone.id) {
                <option [value]="zone.id">{{ zone.name }} · {{ zone.code }}</option>
              }
            </select>
          </div>
          <div class="field wide">
            <label for="householdAddress">{{ i18n.t('household.address') }}</label>
            <input id="householdAddress" name="householdAddress" required [ngModel]="draft().address_text" (ngModelChange)="updateDraft('address_text', $event)" />
          </div>
          <div class="field">
            <label for="householdMembers">{{ i18n.t('household.members') }}</label>
            <input id="householdMembers" name="householdMembers" type="number" min="0" [ngModel]="draft().member_count" (ngModelChange)="updateDraft('member_count', numberValue($event))" />
          </div>
          <div class="field wide">
            <label for="householdObservation">{{ i18n.t('household.observation') }}</label>
            <textarea id="householdObservation" name="householdObservation" rows="3" [ngModel]="draft().observation" (ngModelChange)="updateDraft('observation', $event)"></textarea>
          </div>
        </div>
        <ng-container modal-actions>
          <button type="button" class="btn secondary" (click)="closeHouseholdModal()">{{ i18n.t('household.cancel') }}</button>
          <button class="btn primary" type="submit" [disabled]="!canSaveHousehold()">
            <span class="material-symbols-outlined">{{ editingHouseholdId() ? 'save' : 'add' }}</span>
            {{ editingHouseholdId() ? i18n.t('household.save.btn') : i18n.t('household.create.btn') }}
          </button>
        </ng-container>
      </acl-modal>
    </section>
  `,
  styles: `
    .page { padding: 40px; display: grid; gap: 24px; }
    .page-head { display: flex; align-items: start; justify-content: space-between; gap: 16px; }
    h1 { margin: 0; font-size: 40px; }
    h2 { margin: 0; font-size: 24px; }
    p { margin: 4px 0 0; color: var(--muted); }
    .form-status { font-weight: 800; color: var(--growth); }
    .crud-form { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; align-items: end; }
    .crud-form .wide { grid-column: span 2; }
    .form-status { font-weight: 800; color: var(--growth); margin-bottom: 14px; }
    .form-status.error { color: var(--error); }
    .table-controls { grid-template-columns: minmax(220px, 1fr) 190px 130px; margin-top: 0; }
    .icon-action { width: 42px; height: 42px; border: 1px solid var(--outline-soft); border-radius: 8px; background: var(--surface-low); color: var(--primary); display: inline-grid; place-items: center; cursor: pointer; }
    .icon-action.danger { color: var(--error); }
    .icon-action:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
    .row-actions { display: flex; flex-wrap: wrap; gap: 6px; }
    .responsible-panel { display: grid; gap: 16px; }
    .responsible-panel .btn { justify-self: start; }
    @media(max-width: 860px){
      .page{padding:24px 16px}
      .page-head { flex-direction: column; }
      .crud-form, .crud-form .wide { grid-template-columns: 1fr; grid-column: auto; }
    }
  `,
})
export class HouseholdsPageComponent implements OnInit {
  readonly households = signal<HouseholdRecord[]>([]);
  readonly persons = signal<PersonRecord[]>([]);
  readonly campaigns = signal<Campaign[]>([]);
  readonly zones = signal<Zone[]>([]);
  readonly draft = signal<HouseholdWriteDto>(this.emptyDraft());
  readonly editingHouseholdId = signal<string | null>(null);
  readonly householdModalOpen = signal(false);
  readonly formStatus = signal('');
  readonly search = signal('');
  readonly statusFilter = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizes = [5, 10, 20, 50];
  readonly selectedHousehold = signal<HouseholdRecord | null>(null);
  readonly responsibleHousehold = signal<HouseholdRecord | null>(null);
  readonly responsiblePersonId = signal('');
  readonly responsibleModalOpen = computed(() => Boolean(this.responsibleHousehold()));
  readonly responsiblePersonModalOpen = signal(false);
  readonly responsiblePersonDraft = signal<PersonWriteDto>(this.emptyPersonDraft());
  readonly responsibleHouseholdLabel = computed(() => {
    const household = this.responsibleHousehold();
    return household ? `${household.household_code} · ${household.address_text}` : '';
  });
  readonly responsibleCandidates = computed(() => {
    const household = this.responsibleHousehold();
    if (!household) return [];
    return this.persons().filter((person) => person.household_id === household.id);
  });
  readonly responsibleHouseholdList = computed(() => {
    const household = this.responsibleHousehold();
    return household ? [household] : [];
  });
  readonly filteredHouseholds = computed(() => {
    const query = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.households().filter((row) => {
      const matchesStatus = !status || row.validation_status === status;
      const searchable = `${row.household_code} ${row.address_text} ${row.member_count} ${row.validation_status}`.toLowerCase();
      return matchesStatus && (!query || searchable.includes(query));
    });
  });
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredHouseholds().length / this.pageSize())));
  readonly pagedHouseholds = computed(() => {
    const start = (Math.min(this.page(), this.totalPages()) - 1) * this.pageSize();
    return this.filteredHouseholds().slice(start, start + this.pageSize());
  });
  readonly householdDrawerOpen = computed(() => Boolean(this.selectedHousehold()));
  readonly selectedHouseholdTitle = computed(() => this.selectedHousehold()?.household_code || 'Détails');
  readonly selectedHouseholdDetails = computed<DetailDrawerItem[]>(() => {
    const household = this.selectedHousehold();
    if (!household) return [];
    return [
      { label: 'Identifiant', value: household.id },
      { label: 'Campagne', value: this.campaignLabel(household.campaign_id) },
      { label: 'Zone', value: this.zoneLabel(household.zone_id) },
      { label: 'Chef de ménage', value: household.head_person_id },
      { label: 'Adresse', value: household.address_text },
      { label: 'Membres', value: household.member_count },
      { label: 'Type de logement', value: household.housing_type },
      { label: 'Occupation', value: household.occupancy_status },
      { label: 'Observation', value: household.observation },
      { label: 'Statut', value: household.validation_status },
      { label: 'Dernière mise à jour', value: household.updated_at },
    ];
  });

  constructor(private readonly api: ApiService, readonly i18n: I18nService) {}
  ngOnInit(): void {
    this.api.households().subscribe({
      next: (rows) => this.households.set(rows),
      error: () => this.households.set([]),
    });
    this.api.campaigns().subscribe({
      next: (rows) => {
        this.campaigns.set(rows);
        const firstCampaign = rows[0];
        if (firstCampaign && !this.draft().campaign_id) {
          this.updateDraft('campaign_id', firstCampaign.id);
        }
      },
      error: () => this.campaigns.set([]),
    });
    this.api.zones().subscribe({
      next: (rows) => {
        this.zones.set(rows);
        const firstZone = rows[0];
        if (firstZone && !this.draft().zone_id) {
          this.updateDraft('zone_id', firstZone.id);
        }
      },
      error: () => this.zones.set([]),
    });
    this.loadPersons();
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

  openHousehold(household: HouseholdRecord): void {
    this.selectedHousehold.set(household);
  }

  openCreateHousehold(): void {
    this.resetDraft();
    this.householdModalOpen.set(true);
  }

  closeHouseholdModal(): void {
    this.householdModalOpen.set(false);
    this.resetDraft();
  }

  openResponsibleModal(household: HouseholdRecord): void {
    this.responsibleHousehold.set(household);
    this.responsiblePersonId.set(household.head_person_id || '');
    this.responsiblePersonDraft.set(this.personDraftForHousehold(household));
  }

  closeResponsibleModal(): void {
    this.responsibleHousehold.set(null);
    this.responsiblePersonId.set('');
    this.responsiblePersonModalOpen.set(false);
  }

  updateDraft<Key extends keyof HouseholdWriteDto>(key: Key, value: HouseholdWriteDto[Key]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  numberValue(value: string | number): number {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  canSaveHousehold(): boolean {
    const draft = this.draft();
    return Boolean(draft.household_code.trim() && draft.campaign_id.trim() && draft.zone_id.trim() && draft.address_text.trim());
  }

  saveHousehold(): void {
    if (!this.canSaveHousehold()) return;
    const id = this.editingHouseholdId();
    const request = id ? this.api.updateHousehold(id, this.draft()) : this.api.createHousehold(this.draft());
    request.subscribe({
      next: (household) => {
        this.upsertHousehold(household);
        this.formStatus.set(id ? 'Ménage mis à jour.' : 'Ménage créé.');
        this.householdModalOpen.set(false);
        this.resetDraft();
      },
      error: () => this.formStatus.set('Erreur : enregistrement impossible.'),
    });
  }

  assignResponsiblePerson(): void {
    const household = this.responsibleHousehold();
    const personId = this.responsiblePersonId();
    if (!household || !personId) return;
    const payload: HouseholdWriteDto = { ...this.householdToInput(household), head_person_id: personId };
    this.api.updateHousehold(household.id, payload).subscribe({
      next: (updated) => {
        this.upsertHousehold(updated);
        this.formStatus.set('Responsable associé au ménage.');
        this.closeResponsibleModal();
      },
      error: () => this.formStatus.set('Erreur : association du responsable impossible.'),
    });
  }

  openResponsiblePersonCreation(): void {
    const household = this.responsibleHousehold();
    if (!household) return;
    this.responsiblePersonDraft.set(this.personDraftForHousehold(household));
    this.responsiblePersonModalOpen.set(true);
  }

  selectResponsiblePersonHousehold(householdId: string): void {
    const household = this.households().find((item) => item.id === householdId);
    this.responsiblePersonDraft.update((draft) => ({
      ...draft,
      household_id: householdId,
      campaign_id: household?.campaign_id || draft.campaign_id,
      zone_id: household?.zone_id || draft.zone_id,
    }));
  }

  canSaveResponsiblePerson(): boolean {
    const draft = this.responsiblePersonDraft();
    return Boolean(draft.first_name.trim() && draft.last_name.trim() && draft.household_id && draft.campaign_id && draft.zone_id);
  }

  createAndAssignResponsiblePerson(): void {
    if (!this.canSaveResponsiblePerson()) return;
    this.api.createPerson(this.responsiblePersonDraft()).subscribe({
      next: (person) => {
        this.persons.update((rows) => [person, ...rows.filter((row) => row.id !== person.id)]);
        this.responsiblePersonId.set(person.id);
        this.responsiblePersonModalOpen.set(false);
        this.assignResponsiblePerson();
      },
      error: () => this.formStatus.set('Erreur : création du responsable impossible.'),
    });
  }

  editHousehold(household: HouseholdRecord): void {
    this.editingHouseholdId.set(household.id);
    this.draft.set({
      local_id: household.local_id || null,
      household_code: household.household_code,
      campaign_id: household.campaign_id,
      zone_id: household.zone_id,
      head_person_id: household.head_person_id || null,
      address_text: household.address_text,
      gps_latitude: household.gps_latitude || null,
      gps_longitude: household.gps_longitude || null,
      housing_type: household.housing_type || null,
      occupancy_status: household.occupancy_status || null,
      member_count: household.member_count,
      observation: household.observation || null,
    });
    this.householdModalOpen.set(true);
  }

  submitHousehold(household: HouseholdRecord): void {
    this.api.submitHousehold(household.id).subscribe({
      next: (updated) => this.upsertHousehold(updated),
      error: () => this.formStatus.set('Erreur : soumission impossible.'),
    });
  }

  deleteHousehold(household: HouseholdRecord): void {
    this.api.deleteHousehold(household.id).subscribe({
      next: () => {
        this.households.update((rows) => rows.filter((row) => row.id !== household.id));
        if (this.selectedHousehold()?.id === household.id) this.selectedHousehold.set(null);
      },
      error: () => this.formStatus.set('Erreur : suppression impossible.'),
    });
  }

  resetDraft(): void {
    this.editingHouseholdId.set(null);
    this.draft.set({
      ...this.emptyDraft(),
      campaign_id: this.campaigns()[0]?.id || '',
      zone_id: this.zones()[0]?.id || '',
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

  private upsertHousehold(household: HouseholdRecord): void {
    this.households.update((rows) => {
      const exists = rows.some((row) => row.id === household.id);
      return exists ? rows.map((row) => (row.id === household.id ? household : row)) : [household, ...rows];
    });
  }

  private loadPersons(): void {
    this.api.persons().subscribe({
      next: (rows) => this.persons.set(rows),
      error: () => this.persons.set([]),
    });
  }

  private householdToInput(household: HouseholdRecord): HouseholdWriteDto {
    return {
      local_id: household.local_id || null,
      household_code: household.household_code,
      campaign_id: household.campaign_id,
      zone_id: household.zone_id,
      head_person_id: household.head_person_id || null,
      address_text: household.address_text,
      gps_latitude: household.gps_latitude || null,
      gps_longitude: household.gps_longitude || null,
      housing_type: household.housing_type || null,
      occupancy_status: household.occupancy_status || null,
      member_count: household.member_count,
      observation: household.observation || null,
    };
  }

  private personDraftForHousehold(household: HouseholdRecord): PersonWriteDto {
    return {
      household_id: household.id,
      campaign_id: household.campaign_id,
      zone_id: household.zone_id,
      first_name: '',
      last_name: '',
      gender: 'F',
      birth_date_estimated: false,
      is_without_document: false,
      data_source_type: 'HOUSEHOLD_RESPONSIBLE',
    };
  }

  private emptyDraft(): HouseholdWriteDto {
    return {
      household_code: '',
      campaign_id: '',
      zone_id: '',
      address_text: '',
      member_count: 0,
      observation: '',
    };
  }

  private emptyPersonDraft(): PersonWriteDto {
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
