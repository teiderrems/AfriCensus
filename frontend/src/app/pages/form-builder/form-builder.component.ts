import { SelectComponent } from '@/app/shared/select/select.component';
import { LucideAngularModule } from 'lucide-angular';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { I18nService } from '@/app/core/i18n/i18n.service';
import { MultiLangString } from '@/app/core/i18n/translations';
import { MultilangFieldComponent } from '@/app/shared/multilang-field/multilang-field.component';
import { ButtonComponent } from '@/app/shared/button/button';
import { AclTooltipDirective } from '@/app/shared/tooltip/tooltip';

type Field = { label: MultiLangString; type: string; required: boolean; branchingRule?: string };

@Component({
  selector: 'acl-form-builder-page',
  templateUrl: './form-builder.component.html',
  imports: [LucideAngularModule, FormsModule, MultilangFieldComponent, SelectComponent, ButtonComponent, AclTooltipDirective]
})
export class FormBuilderComponent {
  title: MultiLangString = { fr: 'Démographie du ménage 2026', en: 'Household Demographics 2026' };
  description: MultiLangString = { fr: 'Veuillez collecter les détails concernant le décideur principal du ménage.', en: 'Please collect details regarding the primary decision maker of the household.' };
  readonly selected = signal(1);
  readonly saveMessage = signal('');
  readonly fields = signal<Field[]>([
    { label: { fr: 'Nom complet du répondant', en: 'Full Name of Respondent' }, type: 'short_text', required: true },
    { label: { fr: 'Date de naissance', en: 'Date of Birth' }, type: 'date', required: true },
  ]);
  readonly fieldTypes = [
    { type: 'short_text', label: 'Short Text', icon: 'type' },
    { type: 'long_text', label: 'Long Text', icon: 'file-text' },
    { type: 'number', label: 'Number', icon: 'pin' },
    { type: 'date', label: 'Date & Time', icon: 'calendar' },
    { type: 'single_choice', label: 'Single Choice', icon: 'circle-dot' },
    { type: 'multiple_choice', label: 'Multiple Choice', icon: 'check-square' },
    { type: 'gps', label: 'GPS Coordinate', icon: 'map-pin' },
    { type: 'image', label: 'Image Capture', icon: 'camera' },
  ];

  fieldTypeOptions = computed(() => {
    this.i18n.language();
    return this.fieldTypes.map(t => ({ label: this.i18n.t(('formBuilder.fieldType.' + t.type) as any), value: t.type }));
  });

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
