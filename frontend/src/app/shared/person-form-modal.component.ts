import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { PersonWriteDto } from '../core/dtos';
import { I18nService } from '../core/i18n/i18n.service';
import { Campaign, HouseholdRecord, Zone } from '../core/models';
import { ModalComponent } from './modal.component';

@Component({
  selector: 'acl-person-form-modal',
  imports: [FormsModule, ModalComponent],
  template: `
    <acl-modal [open]="open" [title]="title" [subtitle]="subtitle" [isForm]="true" (submitted)="saved.emit()" (closed)="closed.emit()">
      <div class="person-form">
        <div class="field">
          <label for="personModalFirstName">{{ i18n.t('person.firstName') }}</label>
          <input id="personModalFirstName" name="firstName" required [ngModel]="draft.first_name" (ngModelChange)="update('first_name', $event)" />
        </div>
        <div class="field">
          <label for="personModalLastName">{{ i18n.t('person.lastName') }}</label>
          <input id="personModalLastName" name="lastName" required [ngModel]="draft.last_name" (ngModelChange)="update('last_name', $event)" />
        </div>
        <div class="field">
          <label for="personModalGender">{{ i18n.t('person.gender') }}</label>
          <select id="personModalGender" name="gender" [ngModel]="draft.gender" (ngModelChange)="update('gender', $event)">
            <option value="F">{{ i18n.t('person.gender.F') }}</option>
            <option value="M">{{ i18n.t('person.gender.M') }}</option>
            <option value="OTHER">{{ i18n.t('person.gender.OTHER') }}</option>
          </select>
        </div>
        <div class="field">
          <label for="personModalHousehold">{{ i18n.t('person.household') }}</label>
          <select id="personModalHousehold" name="household" required [ngModel]="draft.household_id" (ngModelChange)="householdSelected.emit($event)">
            <option value="">{{ i18n.t('person.select') }}</option>
            @for (household of households; track household.id) {
              <option [value]="household.id">{{ household.household_code }} · {{ household.address_text }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label for="personModalCampaign">{{ i18n.t('person.campaign') }}</label>
          <select id="personModalCampaign" name="campaign" required [ngModel]="draft.campaign_id" (ngModelChange)="update('campaign_id', $event)">
            <option value="">{{ i18n.t('person.select') }}</option>
            @for (campaign of campaigns; track campaign.id) {
              <option [value]="campaign.id">{{ campaign.name }} · {{ campaign.status }}</option>
            }
            @if (draft.campaign_id && !campaignLabel(draft.campaign_id)) {
              <option [value]="draft.campaign_id">{{ draft.campaign_id }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label for="personModalZone">{{ i18n.t('person.zone') }}</label>
          <select id="personModalZone" name="zone" required [ngModel]="draft.zone_id" (ngModelChange)="update('zone_id', $event)">
            <option value="">{{ i18n.t('person.select') }}</option>
            @for (zone of zones; track zone.id) {
              <option [value]="zone.id">{{ zone.name }} · {{ zone.code }}</option>
            }
            @if (draft.zone_id && !zoneLabel(draft.zone_id)) {
              <option [value]="draft.zone_id">{{ draft.zone_id }}</option>
            }
          </select>
        </div>
        <label class="check">
          <input type="checkbox" name="withoutDocument" [ngModel]="draft.is_without_document" (ngModelChange)="update('is_without_document', $event)" />
          {{ i18n.t('person.withoutDocument') }}
        </label>
      </div>
      <ng-container modal-actions>
        <button type="button" class="btn secondary" (click)="closed.emit()">{{ i18n.t('person.cancel') }}</button>
        <button class="btn primary" type="submit" [disabled]="disabled">
          <span class="material-symbols-outlined">{{ submitIcon }}</span>
          {{ submitLabel }}
        </button>
      </ng-container>
    </acl-modal>
  `,
  styles: `
    .person-form { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; align-items: end; }
    .check { min-height: 48px; display: flex; align-items: center; gap: 10px; font-weight: 800; }
    .check input { width: 22px; height: 22px; accent-color: var(--primary); }
    @media(max-width: 760px) {
      .person-form { grid-template-columns: 1fr; }
    }
  `,
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
