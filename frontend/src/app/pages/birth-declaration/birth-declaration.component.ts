import { SelectComponent } from '@/app/shared/select/select.component';
import { LucideAngularModule } from 'lucide-angular';
import { NgTemplateOutlet } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';

import { ApiService } from '@/app/core/api.service';
import { FamilyRelationWriteDto, PersonWriteDto } from '@/app/core/dtos';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { HouseholdRecord, PersonRecord } from '@/app/core/models';

type ParticipantKey = 'child' | 'mother' | 'father';
type ParticipantMode = 'existing' | 'new';
type ParticipantState = {
  mode: ParticipantMode;
  existingId: string;
  draft: PersonWriteDto;
};

import { ConfirmService } from '@/app/core/confirm';
import { DatePickerComponent } from '@/app/shared/date-picker/date-picker.component';
import { ButtonComponent } from '@/app/shared/button/button';
import { CardComponent } from "@/app/shared/card/card.component";

@Component({
  selector: 'acl-birth-declaration-page',
  imports: [LucideAngularModule, FormsModule, NgTemplateOutlet, SelectComponent, DatePickerComponent, ButtonComponent, CardComponent],
  templateUrl: './birth-declaration.component.html',
  styleUrl: './birth-declaration.component.css',
})
export class BirthDeclarationComponent implements OnInit {
  readonly households = signal<HouseholdRecord[]>([]);
  readonly persons = signal<PersonRecord[]>([]);
  readonly selectedHouseholdId = signal('');
  readonly child = signal<ParticipantState>(this.emptyParticipant('child'));
  readonly mother = signal<ParticipantState>(this.emptyParticipant('mother'));
  readonly father = signal<ParticipantState>(this.emptyParticipant('father'));
  readonly saving = signal(false);
  readonly status = signal('');
  readonly canSubmit = computed(() => this.hasParticipant(this.child()) && (this.hasParticipant(this.mother()) || this.hasParticipant(this.father())) && !this.saving());
  readonly summaryText = computed(() => {
    const parentCount = Number(this.hasParticipant(this.mother())) + Number(this.hasParticipant(this.father()));
    if (!this.hasParticipant(this.child())) return 'Sélectionnez ou créez l’enfant.';
    if (!parentCount) return 'Ajoutez au moins un parent pour créer la filiation.';
    return `${parentCount} lien(s) de filiation seront créés après enregistrement des fiches manquantes.`;
  });

  constructor(private readonly api: ApiService, readonly i18n: I18nService, private readonly confirmService: ConfirmService) { }

  ngOnInit(): void {
    this.api.households().subscribe({
      next: (households) => {
        this.households.set(households.items);
        if (households.items.length > 0) this.selectHousehold(households.items[0].id);
      },
      error: () => this.households.set([]),
    });
    this.loadPersons();
  }

  setMode(key: ParticipantKey, mode: ParticipantMode): void {
    this.updateParticipant(key, (state) => ({ ...state, mode }));
  }

  setExisting(key: ParticipantKey, personId: string): void {
    this.updateParticipant(key, (state) => ({ ...state, existingId: personId }));
  }

  updateDraft<Key extends keyof PersonWriteDto>(participant: ParticipantKey, key: Key, value: PersonWriteDto[Key]): void {
    this.updateParticipant(participant, (state) => ({ ...state, draft: { ...state.draft, [key]: value } }));
  }

  householdOptions = computed(() => this.households().map(h => ({ label: h.household_code + ' · ' + h.address_text, value: h.id })));

  personOptions = computed(() => [
    { label: this.i18n.t('birthDeclaration.notSpecified'), value: '' },
    ...this.persons().map(p => ({ label: p.first_name + ' ' + p.last_name + ' · ' + (p.birth_date || p.gender), value: p.id }))
  ]);

  genderOptions = computed(() => [
    { label: this.i18n.t('person.gender.F'), value: 'F' },
    { label: this.i18n.t('person.gender.M'), value: 'M' },
    { label: this.i18n.t('person.gender.OTHER'), value: 'OTHER' }
  ]);

  selectHousehold(householdId: string): void {
    this.selectedHouseholdId.set(householdId);
    const household = this.households().find((item) => item.id === householdId);
    if (!household) return;
    for (const key of ['child', 'mother', 'father'] as ParticipantKey[]) {
      this.updateParticipant(key, (state) => ({
        ...state,
        draft: {
          ...state.draft,
          household_id: household.id,
          campaign_id: household.campaign_id,
          zone_id: household.zone_id,
        },
      }));
    }
  }

  emptyToNull(value: string): string | null {
    return value || null;
  }

  async submitDeclaration(): Promise<void> {
    if (!this.canSubmit()) return;
    const confirmed = await this.confirmService.ask(
      this.i18n.t('action.submit'),
      this.i18n.t('birth.confirmSubmit'),
      'warning'
    );
    if (!confirmed) return;

    this.saving.set(true);
    this.status.set('');
    this.resolveParticipant(this.child())
      .pipe(
        switchMap((child) =>
          forkJoin({
            mother: this.hasParticipant(this.mother()) ? this.resolveParticipant(this.mother()) : of(null),
            father: this.hasParticipant(this.father()) ? this.resolveParticipant(this.father()) : of(null),
          }).pipe(
            switchMap(({ mother, father }) => {
              const relations: Observable<unknown>[] = [];
              if (mother) relations.push(this.api.createFamilyRelation(this.relationPayload(mother, child, 'MERE_DE')));
              if (father) relations.push(this.api.createFamilyRelation(this.relationPayload(father, child, 'PERE_DE')));
              return relations.length ? forkJoin(relations).pipe(map(() => child)) : of(child);
            }),
          ),
        ),
      )
      .subscribe({
        next: () => {
          this.status.set(this.i18n.t('birth.status.created'));
          this.saving.set(false);
          this.resetWorkflow();
          this.loadPersons();
        },
        error: () => {
          this.status.set(this.i18n.t('birth.status.createError'));
          this.saving.set(false);
        },
      });
  }

  private loadPersons(): void {
    this.api.persons().subscribe({
      next: (persons) => this.persons.set(persons.items),
      error: () => this.persons.set([]),
    });
  }

  private resolveParticipant(state: ParticipantState): Observable<PersonRecord> {
    if (state.mode === 'existing') {
      const person = this.persons().find((item) => item.id === state.existingId);
      return person ? of(person) : this.api.createPerson(state.draft);
    }
    return this.api.createPerson(state.draft);
  }

  private relationPayload(parent: PersonRecord, child: PersonRecord, relationType: 'MERE_DE' | 'PERE_DE'): FamilyRelationWriteDto {
    return {
      campaign_id: child.campaign_id,
      source_person_id: parent.id,
      target_person_id: child.id,
      relation_type: relationType,
      evidence_type: 'DECLARATION',
      source_type: 'AGENT_WORKFLOW',
      comment: 'Lien créé depuis le workflow de déclaration de naissance.',
    };
  }

  private hasParticipant(state: ParticipantState): boolean {
    if (state.mode === 'existing') return Boolean(state.existingId);
    return Boolean(state.draft.first_name.trim() && state.draft.last_name.trim() && state.draft.household_id && state.draft.campaign_id && state.draft.zone_id);
  }

  private updateParticipant(key: ParticipantKey, updater: (state: ParticipantState) => ParticipantState): void {
    const target = key === 'child' ? this.child : key === 'mother' ? this.mother : this.father;
    target.update(updater);
  }

  private resetWorkflow(): void {
    this.child.set(this.emptyParticipant('child'));
    this.mother.set(this.emptyParticipant('mother'));
    this.father.set(this.emptyParticipant('father'));
    if (this.selectedHouseholdId()) this.selectHousehold(this.selectedHouseholdId());
  }

  private emptyParticipant(key: ParticipantKey): ParticipantState {
    return {
      mode: key === 'child' ? 'new' : 'existing',
      existingId: '',
      draft: {
        household_id: '',
        campaign_id: '',
        zone_id: '',
        first_name: '',
        last_name: '',
        gender: key === 'father' ? 'M' : 'F',
        birth_date: null,
        birth_date_estimated: false,
        is_without_document: key === 'child',
        data_source_type: 'DECLARATION',
      },
    };
  }
}
