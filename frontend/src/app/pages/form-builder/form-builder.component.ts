import { SelectComponent } from '@/app/shared/select/select.component';
import { LucideAngularModule } from 'lucide-angular';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { I18nService } from '@/app/core/i18n/i18n.service';
import { ApiService } from '@/app/core/api.service';
import { ToastService } from '@/app/core/toast.service';
import { MultiLangString } from '@/app/core/i18n/translations';
import { MultilangFieldComponent } from '@/app/shared/multilang-field/multilang-field.component';
import { ButtonComponent } from '@/app/shared/button/button';
import { AclTooltipDirective } from '@/app/shared/tooltip/tooltip';
import { ModalComponent } from '@/app/shared/modal/modal.component';
import { DatePickerComponent } from '@/app/shared/date-picker/date-picker.component';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

type Field = { label: MultiLangString; type: string; required: boolean; branchingRule?: string };

@Component({
  selector: 'acl-form-builder-page',
  templateUrl: './form-builder.component.html',
  styleUrl: './form-builder.component.css',
  imports: [LucideAngularModule, FormsModule, MultilangFieldComponent, SelectComponent, ButtonComponent, AclTooltipDirective, ModalComponent, DatePickerComponent, DragDropModule]
})
export class FormBuilderComponent {
  title: MultiLangString = { fr: 'Démographie du ménage 2026', en: 'Household Demographics 2026' };
  description: MultiLangString = { fr: 'Veuillez collecter les détails concernant le décideur principal du ménage.', en: 'Please collect details regarding the primary decision maker of the household.' };
  readonly selected = signal(1);
  readonly saveMessage = signal('');
  readonly previewModalOpen = signal(false);
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
    { type: 'multiple_choice', label: 'Multiple Choice', icon: 'square-check' },
    { type: 'gps', label: 'GPS Coordinate', icon: 'map-pin' },
    { type: 'image', label: 'Image Capture', icon: 'camera' },
  ];

  fieldTypeOptions = computed(() => {
    this.i18n.language();
    return this.fieldTypes.map(t => ({ label: this.i18n.t(('formBuilder.fieldType.' + t.type) as any), value: t.type }));
  });

  constructor(
    readonly i18n: I18nService,
    private readonly api: ApiService,
    private readonly toast: ToastService,
    private readonly router: Router
  ) {}

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

  onDrop(event: CdkDragDrop<any>): void {
    if (event.previousContainer === event.container) {
      // Reordering within the form
      this.fields.update(fields => {
        const copy = [...fields];
        moveItemInArray(copy, event.previousIndex, event.currentIndex);
        return copy;
      });
      this.selected.set(event.currentIndex);
    } else {
      // Adding a new field from the palette
      const type = event.item.data as string;
      const newField: Field = { label: { fr: 'Nouvelle question', en: 'New question' }, type, required: false };
      this.fields.update(fields => {
        const copy = [...fields];
        copy.splice(event.currentIndex, 0, newField);
        return copy;
      });
      this.selected.set(event.currentIndex);
    }
  }

  saveDraft(): void {
    localStorage.setItem(
      'africensus_form_builder_draft',
      JSON.stringify({ title: this.title, description: this.description, fields: this.fields() }),
    );
    this.saveMessage.set(this.i18n.t('formBuilder.draftSaved'));
    window.setTimeout(() => this.saveMessage.set(''), 2400);
  }

  preview(): void {
    this.previewModalOpen.set(true);
  }

  readonly publishing = signal(false);

  publish(): void {
    const payload = {
      title: this.title as any,
      description: this.description as any,
      fields: this.fields(),
      status: 'PUBLISHED'
    };

    this.publishing.set(true);
    this.api.createForm(payload as any).subscribe({
      next: () => {
        this.publishing.set(false);
        this.toast.success(
          this.i18n.t('formBuilder.publishSuccess') || 'Formulaire publié avec succès.',
          this.i18n.t('formBuilder.publishDesc') || 'Les agents peuvent maintenant y accéder.'
        );
        this.router.navigate(['/admin-portal']);
      },
      error: (err) => {
        this.publishing.set(false);
        console.error(err);
        this.toast.error(
          this.i18n.t('error.api.title'),
          this.i18n.t('error.default.message')
        );
      }
    });
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
