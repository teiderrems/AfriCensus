import { SelectComponent } from '@/app/shared/select/select.component';
import { LucideAngularModule } from 'lucide-angular';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PersonWriteDto } from '@/app/core/dtos';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { Campaign, HouseholdRecord, Zone } from '@/app/core/models';
import { ModalComponent } from '@/app/shared/modal/modal.component';

@Component({
  selector: 'acl-person-form-modal',
  imports: [LucideAngularModule, FormsModule, ModalComponent, SelectComponent],
  templateUrl: './person-form-modal.component.html',
  styleUrl: './person-form-modal.component.css',
})
export class PersonFormModalComponent {
  @Input({ required: true }) open = false;
  @Input({ required: true }) title = '';
  @Input() subtitle = 'Les champs campagne, zone et ménage sont requis par le backend.';
  @Input({ required: true }) draft!: PersonWriteDto;
  @Input() households: HouseholdRecord[] = [];
  @Input() campaigns: Campaign[] = [];
  @Input() zones: Zone[] = [];
  @Input() disabled = false;
  @Input() submitLabel = 'Enregistrer';
  @Input() submitIcon = 'save';
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();
  @Output() readonly draftChange = new EventEmitter<PersonWriteDto>();
  @Output() readonly householdSelected = new EventEmitter<string>();

  get genderOptions() {
    return [
      {label: this.i18n.t('person.gender.F'), value: 'F'},
      {label: this.i18n.t('person.gender.M'), value: 'M'},
      {label: this.i18n.t('person.gender.OTHER'), value: 'OTHER'}
    ];
  }

  get householdOptions() { return this.households.map(h => ({label: h.household_code + ' \u00b7 ' + h.address_text, value: h.id})); }
  get campaignOptions() { return this.campaigns.map(c => ({label: c.name, value: c.id})); }
  get zoneOptions() { return this.zones.map(z => ({label: z.name, value: z.id})); }

  constructor(readonly i18n: I18nService) {}

  update<Key extends keyof PersonWriteDto>(key: Key, value: PersonWriteDto[Key]): void {
    this.draftChange.emit({ ...this.draft, [key]: value });
  }

  campaignLabel(campaignId: string): string {
    const campaign = this.campaigns.find((item) => item.id === campaignId);
    return campaign ? `${campaign.name} · ${campaign.status}` : '';
  }

  zoneLabel(zoneId: string): string {
    const zone = this.zones.find((item) => item.id === zoneId);
    return zone ? `${zone.name} · ${zone.code}` : '';
  }
}
