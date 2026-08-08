import { Component, signal, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../../core/i18n/i18n.service';
import { ApiService } from '../../core/api.service';
import { AppSettingsService } from '../../core/app-settings.service';
import { ToastService } from '../../core/toast.service';
import { LucideAngularModule } from 'lucide-angular';
import { ModalComponent } from '../../shared/modal/modal.component';
import { ButtonComponent } from '@/app/shared/button/button';
@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, ButtonComponent],
  templateUrl: './help.component.html',
  styleUrl: './help.component.css'
})
export class HelpComponent implements OnInit {
  readonly i18n = inject(I18nService);
  readonly api = inject(ApiService);
  readonly appSettings = inject(AppSettingsService);
  readonly toast = inject(ToastService);

  readonly expandedFaq = signal<string | null>(null);
  readonly faqs = signal<any[]>([]);

  readonly ticketModalOpen = signal(false);
  readonly ticketCategory = signal('TECHNICAL_ISSUE');
  readonly ticketTitle = signal('');
  readonly ticketDescription = signal('');
  readonly submittingTicket = signal(false);

  ngOnInit() {
    this.api.getFaqs().subscribe({
      next: (data) => {
        // filter active FAQs
        this.faqs.set(data.filter(f => f.is_active));
      },
      error: (err) => console.error(err)
    });
  }

  toggleFaq(id: string): void {
    this.expandedFaq.update(current => current === id ? null : id);
  }

  get helpConfig() {
    return this.appSettings.help() || {};
  }

  openTicketModal(): void {
    this.ticketCategory.set('TECHNICAL_ISSUE');
    this.ticketTitle.set('');
    this.ticketDescription.set('');
    this.ticketModalOpen.set(true);
  }

  closeTicketModal(): void {
    this.ticketModalOpen.set(false);
  }

  submitTicket(): void {
    if (!this.ticketTitle().trim() || !this.ticketDescription().trim()) {
      return;
    }

    this.submittingTicket.set(true);
    const payload = {
      title: this.ticketTitle(),
      description: this.ticketDescription(),
      category: this.ticketCategory()
    };

    this.api.submitSupportTicket(payload).subscribe({
      next: () => {
        this.submittingTicket.set(false);
        this.closeTicketModal();
        this.toast.success(this.i18n.t('help.ticket.success'));
      },
      error: (err) => {
        this.submittingTicket.set(false);
        console.error(err);
        this.toast.error(this.i18n.t('help.ticket.error'));
      }
    });
  }
}

