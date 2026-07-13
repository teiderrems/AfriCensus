import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { I18nService } from '../core/i18n/i18n.service';
import { MultiLangString } from '../core/i18n/translations';
import { MultilangFieldComponent } from '../shared/multilang-field.component';

type Field = { label: MultiLangString; type: string; required: boolean; branchingRule?: string };

@Component({
  selector: 'acl-form-builder-page',
  imports: [FormsModule, MultilangFieldComponent],
  template: `
    <section class="builder">
      <aside class="palette">
        <h2>{{ i18n.t('formBuilder.palette.title') }}</h2>
        @for (type of fieldTypes; track type.type) {
          <button type="button" (click)="addField(type.type)">
            <span class="material-symbols-outlined">{{ type.icon }}</span>
            {{ i18n.t($any('formBuilder.fieldType.' + type.type)) }}
          </button>
        }
      </aside>
      <main class="canvas">
        <header>
          <div>
            <h1>Household Demographics 2026</h1>
            <p>{{ i18n.t('formBuilder.defaultDescription') }}</p>
          </div>
          <button class="btn primary" type="button" (click)="saveDraft()"><span class="material-symbols-outlined">save</span> {{ i18n.t('formBuilder.saveDraft') }}</button>
        </header>
        <article class="form-title">
          <acl-multilang-field [(ngModel)]="title" type="text" [aria-label]="i18n.t('formBuilder.titleAria')"></acl-multilang-field>
          <acl-multilang-field [(ngModel)]="description" type="textarea" [aria-label]="i18n.t('formBuilder.descriptionAria')"></acl-multilang-field>
        </article>
        @for (field of fields(); track $index) {
          <article class="question" [class.selected]="$index === selected()" (click)="selected.set($index)">
            <div class="question-head">
              <span class="material-symbols-outlined">drag_indicator</span>
              <acl-multilang-field class="question-field" [(ngModel)]="field.label" type="text" [aria-label]="i18n.t('formBuilder.questionAria')"></acl-multilang-field>
              <button type="button" (click)="remove($index); $event.stopPropagation()"><span class="material-symbols-outlined">delete</span></button>
            </div>
            <input disabled [placeholder]="placeholder(field.type)">
          </article>
        }
        <button class="drop" type="button" (click)="addField('short_text')">{{ i18n.t('formBuilder.dropElement') }}</button>
      </main>
      <aside class="settings">
        <h2>{{ i18n.t('formBuilder.settings.title') }}</h2>
        @if (activeField(); as field) {
          <div class="field">
            <label>{{ i18n.t('formBuilder.settings.questionType') }}</label>
            <select [(ngModel)]="field.type">
              @for (type of fieldTypes; track type.type) {
                <option [value]="type.type">{{ i18n.t($any('formBuilder.fieldType.' + type.type)) }}</option>
              }
            </select>
          </div>
          <label class="toggle">
            <span>{{ i18n.t('formBuilder.settings.requiredField') }}</span>
            <input type="checkbox" [(ngModel)]="field.required">
          </label>
          <button class="btn secondary" type="button" (click)="addBranchingRule()"><span class="material-symbols-outlined">account_tree</span> {{ i18n.t('formBuilder.settings.addBranchingRule') }}</button>
          @if (field.branchingRule) {
            <p class="saved-note">{{ field.branchingRule }}</p>
          }
        } @else {
          <p>{{ i18n.t('formBuilder.settings.noSelection') }}</p>
        }
        @if (saveMessage()) {
          <p class="saved-note">{{ saveMessage() }}</p>
        }
      </aside>
    </section>
  `,
  styles: `
    .builder { height: calc(100vh - 64px); display: grid; grid-template-columns: 288px 1fr 320px; overflow: hidden; }
    .palette, .settings { background: var(--surface); border-color: var(--outline-soft); padding: 24px; overflow-y: auto; }
    .palette { border-right: 2px solid var(--outline-soft); }
    .settings { border-left: 2px solid var(--outline-soft); }
    h1, h2, p { margin: 0; }
    h1 { font-size: 28px; }
    h2 { font-size: 16px; text-transform: uppercase; color: var(--muted); letter-spacing: .05em; margin-bottom: 18px; }
    .palette button {
      width: 100%; min-height: 52px; display: flex; align-items: center; gap: 12px; border: 2px solid var(--outline-soft);
      border-radius: 6px; background: var(--surface); margin-bottom: 12px; padding: 0 12px; font-weight: 700;
    }
    .canvas { padding: 24px; overflow-y: auto; display: grid; align-content: start; gap: 20px; }
    header { display: flex; justify-content: space-between; gap: 16px; align-items: center; background: var(--surface); border-bottom: 2px solid var(--outline-soft); margin: -24px -24px 4px; padding: 18px 24px; }
    .form-title, .question {
      background: var(--surface); border: 2px solid var(--outline-soft); border-radius: 8px; padding: 24px; max-width: 760px; width: 100%; margin: 0 auto;
    }
    .form-title { border-top: 8px solid var(--primary); display: grid; gap: 8px; }
    .form-title input, .form-title textarea, .question input {
      width: 100%; border: 0; background: transparent; color: var(--ink); resize: vertical;
    }
    .form-title input { font-size: 24px; font-weight: 800; }
    .question { border-left: 8px solid var(--growth); display: grid; gap: 18px; }
    .question.selected { border-color: var(--primary); border-left-color: var(--primary); }
    .question-head { display: flex; align-items: flex-start; gap: 10px; }
    .question-field { flex: 1; }
    .question-head button { border: 0; background: transparent; color: var(--error); margin-top: 24px; }
    .question > input { min-height: 48px; border: 2px dashed var(--outline-soft); border-radius: 6px; padding: 0 12px; background: var(--surface-low); }
    .drop {
      max-width: 760px; width: 100%; margin: 0 auto; height: 96px; border: 2px dashed var(--primary); border-radius: 8px;
      color: var(--primary); background: #c9e6ff55; font-weight: 800;
    }
    .toggle { min-height: 64px; border: 2px solid var(--outline-soft); border-radius: 6px; padding: 12px; display: flex; justify-content: space-between; align-items: center; margin: 20px 0; font-weight: 700; }
    .saved-note { border: 2px solid var(--outline-soft); border-radius: 6px; padding: 10px; color: var(--primary); background: var(--primary-soft); font-weight: 800; }
    @media (max-width: 1100px) { .builder { grid-template-columns: 1fr; height: auto; min-height: calc(100vh - 64px); } .palette, .settings { border: 0; } header { flex-direction: column; align-items: stretch; } }
    @media (max-width: 560px) { .canvas, .palette, .settings { padding: 16px; } header { margin: -16px -16px 0; padding: 16px; } .question-head { align-items: stretch; flex-wrap: wrap; } .question-head input { min-width: 0; flex: 1 1 180px; } }
  `,
})
export class FormBuilderPageComponent {
  title: MultiLangString = { fr: 'Démographie du ménage 2026', en: 'Household Demographics 2026' };
  description: MultiLangString = { fr: 'Veuillez collecter les détails concernant le décideur principal du ménage.', en: 'Please collect details regarding the primary decision maker of the household.' };
  readonly selected = signal(1);
  readonly saveMessage = signal('');
  readonly fields = signal<Field[]>([
    { label: { fr: 'Nom complet du répondant', en: 'Full Name of Respondent' }, type: 'short_text', required: true },
    { label: { fr: 'Date de naissance', en: 'Date of Birth' }, type: 'date', required: true },
  ]);
  readonly fieldTypes = [
    { type: 'short_text', label: 'Short Text', icon: 'text_fields' },
    { type: 'long_text', label: 'Long Text', icon: 'notes' },
    { type: 'number', label: 'Number', icon: 'pin' },
    { type: 'date', label: 'Date & Time', icon: 'calendar_today' },
    { type: 'single_choice', label: 'Single Choice', icon: 'radio_button_checked' },
    { type: 'multiple_choice', label: 'Multiple Choice', icon: 'check_box' },
    { type: 'gps', label: 'GPS Coordinate', icon: 'location_on' },
    { type: 'image', label: 'Image Capture', icon: 'photo_camera' },
  ];

  constructor(readonly i18n: I18nService) {
  }

  activeField(): Field | undefined {
    return this.fields()[this.selected()];
  }

  addField(type: string): void {
    this.fields.update((fields) => [...fields, { label: { fr: 'Nouvelle question', en: 'New question' }, type, required: false }]);
    this.selected.set(this.fields().length - 1);
  }

  remove(index: number): void {
    this.fields.update((fields) => fields.filter((_, current) => current !== index));
    this.selected.set(Math.max(0, index - 1));
  }

  saveDraft(): void {
    localStorage.setItem(
      'africensus_form_builder_draft',
      JSON.stringify({ title: this.title, description: this.description, fields: this.fields() }),
    );
    this.saveMessage.set(this.i18n.t('formBuilder.draftSaved'));
    window.setTimeout(() => this.saveMessage.set(''), 2400);
  }

  addBranchingRule(): void {
    const index = this.selected();
    this.fields.update((fields) =>
      fields.map((field, current) =>
        current === index ? { ...field, branchingRule: this.i18n.t('formBuilder.defaultBranchingRule') } : field,
      ),
    );
  }

  placeholder(type: string): string {
    return this.i18n.t(('formBuilder.placeholder.' + type) as any) || this.i18n.t('formBuilder.placeholder.default');
  }
}
