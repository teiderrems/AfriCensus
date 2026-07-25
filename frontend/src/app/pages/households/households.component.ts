import { SelectComponent } from '@/app/shared/select/select.component';
import { LucideAngularModule } from 'lucide-angular';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '@/app/core/api.service';
import { ConfirmService } from '@/app/core/confirm';
import { HouseholdWriteDto, PersonWriteDto } from '@/app/core/dtos';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { Campaign, HouseholdRecord, PersonRecord, Zone } from '@/app/core/models';
import { ToastService } from '@/app/core/toast.service';
import { DetailDrawerComponent, DetailDrawerItem } from '@/app/shared/detail-drawer/detail-drawer.component';
import { ModalComponent } from '@/app/shared/modal/modal.component';
import { PageSizeSelectComponent } from '@/app/shared/page-size-select/page-size-select.component';
import { PersonFormModalComponent } from '@/app/shared/person-form-modal/person-form-modal.component';
import { StatusFilterComponent } from '@/app/shared/status-filter/status-filter.component';
import { TablePaginationComponent } from '@/app/shared/table-pagination/table-pagination.component';
import { CardComponent } from '@/app/shared/card/card.component';
import { ButtonComponent } from '@/app/shared/button/button';
import { AclTooltipDirective } from '@/app/shared/tooltip/tooltip';

@Component({
  imports: [LucideAngularModule, FormsModule, DetailDrawerComponent, ModalComponent, PageSizeSelectComponent, PersonFormModalComponent, StatusFilterComponent, TablePaginationComponent, SelectComponent, CardComponent, ButtonComponent, AclTooltipDirective],
  templateUrl: './households.component.html',
  styleUrl: './households.component.css',
})
export class HouseholdsComponent implements OnInit {
  responsiblePersonOptions = computed(() => [
    { label: this.i18n.t('household.selectResponsible'), value: '' },
    ...this.persons().map(p => ({ label: p.first_name + ' ' + p.last_name, value: p.id }))
  ]);
  householdCampaignOptions = computed(() => [
    { label: this.i18n.t('admin.campaign.select'), value: '' },
    ...this.campaigns().map(c => ({ label: c.name, value: c.id }))
  ]);
  householdZoneOptions = computed(() => [
    { label: this.i18n.t('admin.zone.select'), value: '' },
    ...this.zones().map(z => ({ label: z.name, value: z.id }))
  ]);

  readonly households = signal<HouseholdRecord[]>([]);
  readonly persons = signal<PersonRecord[]>([]);
  readonly campaigns = signal<Campaign[]>([]);
  readonly zones = signal<Zone[]>([]);
  readonly draft = signal<HouseholdWriteDto>(this.emptyDraft());
  readonly editingHouseholdId = signal<string | null>(null);
  readonly householdModalOpen = signal(false);
  readonly saving = signal(false);
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

  constructor(
    private readonly api: ApiService,
    readonly i18n: I18nService,
    private readonly confirmService: ConfirmService,
    private readonly toastService: ToastService
  ) { }
  ngOnInit(): void {
    this.api.households().subscribe({
      next: (rows) => this.households.set(rows.items),
      error: () => this.households.set([]),
    });
    this.api.campaigns().subscribe({
      next: (rows) => {
        this.campaigns.set(rows.items);
        const firstCampaign = rows.items[0];
        if (firstCampaign && !this.draft().campaign_id) {
          this.updateDraft('campaign_id', firstCampaign.id);
        }
      },
      error: () => this.campaigns.set([]),
    });
    this.api.zones().subscribe({
      next: (rows) => {
        this.zones.set(rows.items);
        const firstZone = rows.items[0];
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

  async saveHousehold(): Promise<void> {
    if (!this.canSaveHousehold()) return;
    const confirmed = await this.confirmService.ask(
      this.i18n.t('action.confirm'),
      this.i18n.t('households.confirmSave')
    );
    if (!confirmed) return;

    this.saving.set(true);
    const id = this.editingHouseholdId();
    const request = id ? this.api.updateHousehold(id, this.draft()) : this.api.createHousehold(this.draft());
    request.subscribe({
      next: (household) => {
        this.upsertHousehold(household);
        this.toastService.success(id ? 'Ménage mis à jour.' : 'Ménage créé.');
        this.householdModalOpen.set(false);
        this.resetDraft();
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  assignResponsiblePerson(): void {
    const household = this.responsibleHousehold();
    const personId = this.responsiblePersonId();
    if (!household || !personId) return;
    this.saving.set(true);
    const payload: HouseholdWriteDto = { ...this.householdToInput(household), head_person_id: personId };
    this.api.updateHousehold(household.id, payload).subscribe({
      next: (updated) => {
        this.upsertHousehold(updated);
        this.toastService.success(this.i18n.t('households.status.headAssigned'));
        this.closeResponsibleModal();
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
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

  async createAndAssignResponsiblePerson(): Promise<void> {
    if (!this.canSaveResponsiblePerson()) return;
    const confirmed = await this.confirmService.ask(
      this.i18n.t('action.confirm'),
      this.i18n.t('households.confirmAssignHead')
    );
    if (!confirmed) return;

    this.saving.set(true);
    this.api.createPerson(this.responsiblePersonDraft()).subscribe({
      next: (person) => {
        this.persons.update((rows) => [person, ...rows.filter((row) => row.id !== person.id)]);
        this.responsiblePersonId.set(person.id);
        this.responsiblePersonModalOpen.set(false);
        this.saving.set(false);
        this.assignResponsiblePerson();
      },
      error: () => this.saving.set(false),
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

  async submitHousehold(household: HouseholdRecord): Promise<void> {
    const confirmed = await this.confirmService.ask(
      this.i18n.t('action.confirm'),
      this.i18n.t('households.confirmSubmit')
    );
    if (!confirmed) return;

    this.saving.set(true);
    this.api.submitHousehold(household.id).subscribe({
      next: (updated) => {
        this.upsertHousehold(updated);
        this.toastService.success(this.i18n.t('households.status.submitted') || 'Ménage soumis avec succès.');
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  async deleteHousehold(household: HouseholdRecord): Promise<void> {
    const confirmed = await this.confirmService.ask(
      this.i18n.t('action.confirm'),
      this.i18n.t('households.confirmDelete')
    );
    if (!confirmed) return;

    this.saving.set(true);
    this.api.deleteHousehold(household.id).subscribe({
      next: () => {
        this.households.update((rows) => rows.filter((row) => row.id !== household.id));
        if (this.selectedHousehold()?.id === household.id) this.selectedHousehold.set(null);
        this.toastService.success(this.i18n.t('households.status.deleted') || 'Ménage supprimé avec succès.');
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
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
      next: (rows) => this.persons.set(rows.items),
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
