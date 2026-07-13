import { NgTemplateOutlet } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';

import { ApiService } from '../core/api.service';
import { FamilyRelationWriteDto, PersonWriteDto } from '../core/dtos';
import { I18nService } from '../core/i18n/i18n.service';
import { HouseholdRecord, PersonRecord } from '../core/models';

type ParticipantKey = 'child' | 'mother' | 'father';
type ParticipantMode = 'existing' | 'new';
type ParticipantState = {
  mode: ParticipantMode;
  existingId: string;
  draft: PersonWriteDto;
};

@Component({
  selector: 'acl-birth-declaration-page',
  imports: [FormsModule, NgTemplateOutlet],
  template: `
    <section class="page">
      <header class="page-head">
        <div>
          <h1>{{ i18n.t('birthDeclaration.title') }}</h1>
          <p>{{ i18n.t('birthDeclaration.subtitle') }}</p>
        </div>
        <div class="field">
          <label for="household">{{ i18n.t('birthDeclaration.household') }}</label>
          <select id="household" name="household" [ngModel]="selectedHouseholdId()" (ngModelChange)="selectHousehold($event)">
            @for (household of households(); track household.id) {
              <option [value]="household.id">{{ household.household_code }} · {{ household.address_text }}</option>
            }
          </select>
        </div>
      </header>

      @if (status()) {
        <p class="status" [class.error]="status().startsWith('Erreur')">{{ status() }}</p>
      }

      <section class="steps">
        <article class="card participant">
          <span class="step">1</span>
          <h2>{{ i18n.t('birthDeclaration.child') }}</h2>
          <p>{{ i18n.t('birthDeclaration.child.desc') }}</p>
          <ng-container *ngTemplateOutlet="participantEditor; context: { key: 'child', state: child(), required: true }" />
        </article>

        <article class="card participant">
          <span class="step">2</span>
          <h2>{{ i18n.t('birthDeclaration.mother') }}</h2>
          <p>{{ i18n.t('birthDeclaration.mother.desc') }}</p>
          <ng-container *ngTemplateOutlet="participantEditor; context: { key: 'mother', state: mother(), required: false }" />
        </article>

        <article class="card participant">
          <span class="step">3</span>
          <h2>{{ i18n.t('birthDeclaration.father') }}</h2>
          <p>{{ i18n.t('birthDeclaration.father.desc') }}</p>
          <ng-container *ngTemplateOutlet="participantEditor; context: { key: 'father', state: father(), required: false }" />
        </article>
      </section>

      <ng-template #participantEditor let-key="key" let-state="state" let-required="required">
        <div class="mode-switch" role="group" [attr.aria-label]="'Mode de saisie ' + key">
          <button type="button" [class.active]="state.mode === 'existing'" (click)="setMode(key, 'existing')">{{ i18n.t('birthDeclaration.existingPerson') }}</button>
          <button type="button" [class.active]="state.mode === 'new'" (click)="setMode(key, 'new')">{{ i18n.t('birthDeclaration.newPerson') }}</button>
        </div>

        @if (state.mode === 'existing') {
          <div class="field">
            <label [for]="key + 'Existing'">{{ i18n.t('birthDeclaration.person') }}</label>
            <select [id]="key + 'Existing'" [name]="key + 'Existing'" [ngModel]="state.existingId" (ngModelChange)="setExisting(key, $event)">
              <option value="">{{ required ? i18n.t('birthDeclaration.select') : i18n.t('birthDeclaration.notSpecified') }}</option>
              @for (person of persons(); track person.id) {
                <option [value]="person.id">{{ person.first_name }} {{ person.last_name }} · {{ person.birth_date || person.gender }}</option>
              }
            </select>
          </div>
        } @else {
          <div class="person-form">
            <div class="field">
              <label [for]="key + 'FirstName'">{{ i18n.t('person.firstName') }}</label>
              <input [id]="key + 'FirstName'" [name]="key + 'FirstName'" required [ngModel]="state.draft.first_name" (ngModelChange)="updateDraft(key, 'first_name', $event)" />
            </div>
            <div class="field">
              <label [for]="key + 'LastName'">{{ i18n.t('person.lastName') }}</label>
              <input [id]="key + 'LastName'" [name]="key + 'LastName'" required [ngModel]="state.draft.last_name" (ngModelChange)="updateDraft(key, 'last_name', $event)" />
            </div>
            <div class="field">
              <label [for]="key + 'Gender'">{{ i18n.t('person.gender') }}</label>
              <select [id]="key + 'Gender'" [name]="key + 'Gender'" [ngModel]="state.draft.gender" (ngModelChange)="updateDraft(key, 'gender', $event)">
                <option value="F">{{ i18n.t('person.gender.F') }}</option>
                <option value="M">{{ i18n.t('person.gender.M') }}</option>
                <option value="OTHER">{{ i18n.t('person.gender.OTHER') }}</option>
              </select>
            </div>
            <div class="field">
              <label [for]="key + 'BirthDate'">{{ i18n.t('birthDeclaration.birthDate') }}</label>
              <input [id]="key + 'BirthDate'" [name]="key + 'BirthDate'" type="date" [ngModel]="state.draft.birth_date" (ngModelChange)="updateDraft(key, 'birth_date', emptyToNull($event))" />
            </div>
            <label class="check">
              <input type="checkbox" [name]="key + 'WithoutDocument'" [ngModel]="state.draft.is_without_document" (ngModelChange)="updateDraft(key, 'is_without_document', $event)" />
              {{ i18n.t('person.withoutDocument') }}
            </label>
          </div>
        }
      </ng-template>

      <article class="card summary">
        <div>
          <h2>{{ i18n.t('birthDeclaration.summary') }}</h2>
          <p>{{ summaryText() }}</p>
        </div>
        <button class="btn primary" type="button" [disabled]="!canSubmit() || saving()" (click)="submitDeclaration()">
          <span class="material-symbols-outlined">account_tree</span>
          {{ saving() ? i18n.t('birthDeclaration.creating') : i18n.t('birthDeclaration.create') }}
        </button>
      </article>
    </section>
  `,
  styles: `
    .page { padding: 40px; display: grid; gap: 24px; }
    .page-head { display: flex; align-items: end; justify-content: space-between; gap: 24px; }
    .page-head > div:first-child { max-width: 780px; }
    h1 { margin: 0; font-size: 40px; line-height: 48px; }
    h2 { margin: 8px 0; font-size: 24px; }
    p { margin: 0; color: var(--muted); }
    .steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; align-items: start; }
    .participant { display: grid; gap: 16px; align-content: start; }
    .step { width: 42px; height: 42px; border-radius: 999px; display: grid; place-items: center; background: var(--primary); color: var(--on-primary); font-weight: 900; }
    .mode-switch { display: grid; grid-template-columns: 1fr 1fr; border: 2px solid var(--outline-soft); border-radius: 8px; overflow: hidden; }
    .mode-switch button { min-height: 44px; border: 0; background: var(--surface); color: var(--muted); font-weight: 900; }
    .mode-switch button.active { background: var(--primary); color: var(--on-primary); }
    .person-form { display: grid; gap: 14px; }
    .check { min-height: 44px; display: flex; align-items: center; gap: 10px; font-weight: 800; }
    .check input { width: 22px; height: 22px; accent-color: var(--primary); }
    .summary { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
    .summary .btn { flex: 0 0 auto; }
    .status { padding: 14px 16px; border: 2px solid var(--growth); border-radius: 8px; background: color-mix(in srgb, var(--growth) 12%, var(--surface)); color: var(--ink); font-weight: 800; }
    .status.error { border-color: var(--error); background: var(--error-soft); color: var(--error); }
    @media(max-width: 1100px) {
      .steps { grid-template-columns: 1fr; }
    }
    @media(max-width: 860px) {
      .page { padding: 24px 16px; }
      .page-head, .summary { align-items: stretch; flex-direction: column; }
      h1 { font-size: 32px; line-height: 40px; }
    }
  `,
})
export class BirthDeclarationPageComponent implements OnInit {
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

  constructor(private readonly api: ApiService, readonly i18n: I18nService) {}

  ngOnInit(): void {
    this.api.households().subscribe({
      next: (households) => {
        this.households.set(households);
        if (households[0]) this.selectHousehold(households[0].id);
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

  submitDeclaration(): void {
    if (!this.canSubmit()) return;
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
          this.status.set('Déclaration créée avec succès. Les liens parent-enfant sont soumis à validation.');
          this.saving.set(false);
          this.resetWorkflow();
          this.loadPersons();
        },
        error: () => {
          this.status.set('Erreur : la déclaration n’a pas pu être créée.');
          this.saving.set(false);
        },
      });
  }

  private loadPersons(): void {
    this.api.persons().subscribe({
      next: (persons) => this.persons.set(persons),
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
