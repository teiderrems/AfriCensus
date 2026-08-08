import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { ApiService } from '@/app/core/api.service';
import { AppSettingsService } from '@/app/core/app-settings.service';
import { MultilangFieldComponent } from '@/app/shared/multilang-field/multilang-field.component';
import { ButtonComponent } from '@/app/shared/button/button';
import { ModalComponent } from '@/app/shared/modal/modal.component';

@Component({
  selector: 'acl-admin-faq',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, MultilangFieldComponent, ButtonComponent, ModalComponent],
  templateUrl: './admin-faq.component.html',
  styleUrl: './admin-faq.component.css'
})
export class AdminFaqComponent implements OnInit {
  readonly i18n = inject(I18nService);
  readonly api = inject(ApiService);
  readonly appSettingsService = inject(AppSettingsService);

  readonly faqs = signal<any[]>([]);
  readonly quickGuide = signal<any>({ fr: '', en: '' });
  readonly contactEmail = signal<string>('');
  readonly contactPhone = signal<string>('');

  readonly faqModalOpen = signal(false);
  readonly currentFaq = signal<any>(null);

  ngOnInit() {
    this.loadFaqs();
    this.loadHelpConfig();
  }

  loadFaqs() {
    this.api.getFaqs().subscribe({
      next: (data) => this.faqs.set(data),
      error: (err) => console.error(err)
    });
  }

  loadHelpConfig() {
    const helpConfig = this.appSettingsService.help();
    if (helpConfig) {
      this.quickGuide.set(helpConfig.quick_guide || { fr: '', en: '' });
      this.contactEmail.set(helpConfig.contact_email || '');
      this.contactPhone.set(helpConfig.contact_phone || '');
    }
  }

  saveHelpConfig() {
    const payload = {
      quick_guide: this.quickGuide(),
      contact_email: this.contactEmail(),
      contact_phone: this.contactPhone()
    };
    this.api.updateHelpConfig(payload).subscribe({
      next: (res) => {
        this.appSettingsService.applyConfig(res);
        // Show success toast (implement if ToastService is available)
      }
    });
  }

  openFaqModal(faq?: any) {
    if (faq) {
      this.currentFaq.set({ ...faq });
    } else {
      this.currentFaq.set({ question: { fr: '', en: '' }, answer: { fr: '', en: '' }, category: { fr: '', en: '' }, order: 0, is_active: true });
    }
    this.faqModalOpen.set(true);
  }

  closeFaqModal() {
    this.faqModalOpen.set(false);
    this.currentFaq.set(null);
  }

  saveFaq() {
    const payload = this.currentFaq();
    if (payload.id) {
      this.api.updateFaq(payload.id, payload).subscribe({
        next: () => {
          this.loadFaqs();
          this.closeFaqModal();
        }
      });
    } else {
      this.api.createFaq(payload).subscribe({
        next: () => {
          this.loadFaqs();
          this.closeFaqModal();
        }
      });
    }
  }

  deleteFaq(id: string) {
    if (confirm(this.i18n.t('admin.faq.deleteConfirm'))) {
      this.api.deleteFaq(id).subscribe({
        next: () => this.loadFaqs()
      });
    }
  }
}
