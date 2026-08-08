import { LucideAngularModule } from 'lucide-angular';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '@/app/core/api.service';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { DashboardSummary } from '@/app/core/models';

import { StatusFilterComponent } from '@/app/shared/status-filter/status-filter.component';
import { TablePaginationComponent } from '@/app/shared/table-pagination/table-pagination.component';
import { CardComponent } from '@/app/shared/card/card.component';
import { ButtonComponent } from '@/app/shared/button/button';
import { ScrollAnimateDirective } from '@/app/shared/scroll-animate/scroll-animate.directive';

import { AclLocalizedTextPipe } from '@/app/shared/pipes/localized-text.pipe';

@Component({
  selector: 'acl-dashboard-page',
  imports: [LucideAngularModule, FormsModule, StatusFilterComponent, TablePaginationComponent, CardComponent, ButtonComponent, AclLocalizedTextPipe, ScrollAnimateDirective],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  readonly summary = signal<DashboardSummary | null>(null);
  readonly loading = signal(false);
  readonly pageSizes = [5, 10, 20];
  readonly submissionSearch = signal('');
  readonly submissionStatusFilter = signal('');
  readonly submissionPage = signal(1);
  readonly submissionPageSize = signal(5);
  readonly filteredSubmissions = computed(() => {
    const query = this.submissionSearch().trim().toLowerCase();
    const status = this.submissionStatusFilter();
    return (this.summary()?.recentSubmissions || []).filter((row) => {
      const label = row.household_code || `${row.first_name || ''} ${row.last_name || ''}`;
      const searchable = `${label} ${this.zoneLabel(row.zone_id)} ${row.validation_status} ${row.updated_at}`.toLowerCase();
      return (!status || row.validation_status === status) && (!query || searchable.includes(query));
    });
  });
  readonly submissionTotalPages = computed(() => Math.max(1, Math.ceil(this.filteredSubmissions().length / this.submissionPageSize())));
  readonly pagedSubmissions = computed(() => {
    const start = (Math.min(this.submissionPage(), this.submissionTotalPages()) - 1) * this.submissionPageSize();
    return this.filteredSubmissions().slice(start, start + this.submissionPageSize());
  });

  constructor(private readonly api: ApiService, readonly i18n: I18nService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.dashboard().subscribe({
      next: (summary) => this.summary.set(summary),
      error: () => {
        this.summary.set(null);
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  setSubmissionSearch(value: string): void {
    this.submissionSearch.set(value);
    this.submissionPage.set(1);
  }

  setSubmissionStatusFilter(value: string): void {
    this.submissionStatusFilter.set(value);
    this.submissionPage.set(1);
  }

  setSubmissionPageSize(value: number | string): void {
    this.submissionPageSize.set(Number(value));
    this.submissionPage.set(1);
  }

  previousSubmissionPage(): void {
    this.submissionPage.set(Math.max(1, this.submissionPage() - 1));
  }

  nextSubmissionPage(): void {
    this.submissionPage.set(Math.min(this.submissionTotalPages(), this.submissionPage() + 1));
  }

  zoneLabel(zoneId: string): string {
    const zone = this.summary()?.zoneProgress.find((item) => item.id === zoneId);
    return zone ? this.resolveLocalizedText(zone.name) : zoneId;
  }

  private resolveLocalizedText(val: any): string {
    if (!val) return '';
    const currentLang = this.i18n.language();
    if (typeof val === 'object') {
      return val[currentLang] || val['fr'] || val['en'] || Object.values(val)[0] || '';
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.startsWith('{')) {
        const closeBraceIdx = trimmed.indexOf('}');
        if (closeBraceIdx !== -1) {
          const jsonPart = trimmed.substring(0, closeBraceIdx + 1);
          const codeSuffix = trimmed.substring(closeBraceIdx + 1);
          try {
            const normalized = jsonPart.replace(/'/g, '"');
            const parsed = JSON.parse(normalized);
            if (typeof parsed === 'object' && parsed !== null) {
              const text = parsed[currentLang] || parsed['fr'] || parsed['en'] || Object.values(parsed)[0] || '';
              return String(text) + codeSuffix;
            }
          } catch {
            // fallback
          }
        }
      }
    }
    return String(val);
  }
}
