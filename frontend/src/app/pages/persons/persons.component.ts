import { LucideAngularModule } from 'lucide-angular';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '@/app/core/api.service';
import { PersonWriteDto } from '@/app/core/dtos';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { ConfirmService } from '@/app/core/confirm';
import { Campaign, HouseholdRecord, PersonRecord, Zone } from '@/app/core/models';
import { ToastService } from '@/app/core/toast.service';
import { DetailDrawerComponent, DetailDrawerItem } from '@/app/shared/detail-drawer/detail-drawer.component';
import { PageSizeSelectComponent } from '@/app/shared/page-size-select/page-size-select.component';
import { PersonFormModalComponent } from '@/app/shared/person-form-modal/person-form-modal.component';
import { StatusFilterComponent } from '@/app/shared/status-filter/status-filter.component';
import { TablePaginationComponent } from '@/app/shared/table-pagination/table-pagination.component';

@Component({
  selector: 'acl-persons-page',
  imports: [LucideAngularModule, FormsModule, DetailDrawerComponent, PageSizeSelectComponent, PersonFormModalComponent, StatusFilterComponent, TablePaginationComponent],
  templateUrl: './persons.component.html',
  styleUrl: './persons.component.css',
})
export class PersonsComponent implements OnInit {
  readonly persons = signal<PersonRecord[]>([]);
  readonly households = signal<HouseholdRecord[]>([]);
  readonly campaigns = signal<Campaign[]>([]);
  readonly zones = signal<Zone[]>([]);
  readonly draft = signal<PersonWriteDto>(this.emptyDraft());
  readonly editingPersonId = signal<string | null>(null);
  readonly personModalOpen = signal(false);
  readonly saving = signal(false);
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

  constructor(
    private readonly api: ApiService,
    readonly i18n: I18nService,
    private readonly confirmService: ConfirmService,
    private readonly toastService: ToastService
  ) {}
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

  async savePerson(): Promise<void> {
    if (!this.canSavePerson()) return;
    const confirmed = await this.confirmService.ask(
      this.i18n.t('action.confirm'),
      this.i18n.t('persons.confirmSave')
    );
    if (!confirmed) return;

    this.saving.set(true);
    const id = this.editingPersonId();
    const request = id ? this.api.updatePerson(id, this.draft()) : this.api.createPerson(this.draft());
    request.subscribe({
      next: (person) => {
        this.upsertPerson(person);
        this.toastService.success(id ? this.i18n.t('persons.status.updated') : this.i18n.t('persons.status.created'));
        this.personModalOpen.set(false);
        this.resetDraft();
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
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

  async submitPerson(person: PersonRecord): Promise<void> {
    const confirmed = await this.confirmService.ask(
      this.i18n.t('action.confirm'),
      this.i18n.t('persons.confirmSubmit')
    );
    if (!confirmed) return;

    this.saving.set(true);
    this.api.submitPerson(person.id).subscribe({
      next: (updated) => {
        this.upsertPerson(updated);
        this.toastService.success(this.i18n.t('persons.status.submitted') || 'Personne soumise avec succès.');
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  async deletePerson(person: PersonRecord): Promise<void> {
    const confirmed = await this.confirmService.ask(
      this.i18n.t('action.confirm'),
      this.i18n.t('persons.confirmDelete')
    );
    if (!confirmed) return;

    this.saving.set(true);
    this.api.deletePerson(person.id).subscribe({
      next: () => {
        this.persons.update((rows) => rows.filter((row) => row.id !== person.id));
        if (this.selectedPerson()?.id === person.id) this.selectedPerson.set(null);
        this.toastService.success(this.i18n.t('persons.status.deleted') || 'Personne supprimée avec succès.');
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
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
