import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../core/api.service';
import { I18nService } from '../core/i18n/i18n.service';
import { DashboardSummary } from '../core/models';
import { PageSizeSelectComponent } from '../shared/page-size-select.component';
import { StatusFilterComponent } from '../shared/status-filter.component';
import { TablePaginationComponent } from '../shared/table-pagination.component';

@Component({
  selector: 'acl-dashboard-page',
  imports: [FormsModule, PageSizeSelectComponent, StatusFilterComponent, TablePaginationComponent],
  template: `
    <section class="page">
      <header class="page-head">
        <div>
          <h1>{{ i18n.t('dashboard.title') }}</h1>
          <p>{{ i18n.t('dashboard.subtitle') }}</p>
        </div>
        <button class="btn secondary" type="button" [disabled]="loading()" (click)="load()">
          <span class="material-symbols-outlined">sync</span>
          {{ loading() ? i18n.t('dashboard.refreshing') : i18n.t('dashboard.refresh') }}
        </button>
      </header>

      @if (summary(); as data) {
        <div class="stats">
          <article class="card stat"><span class="material-symbols-outlined blue">home</span><p>{{ i18n.t('dashboard.enumeratedHouseholds') }}</p><strong>{{ data.totalHouseholds }}</strong></article>
          <article class="card stat"><span class="material-symbols-outlined green">groups</span><p>{{ i18n.t('dashboard.individuals') }}</p><strong>{{ data.totalPersons }}</strong></article>
          <article class="card stat urgent"><span class="material-symbols-outlined">warning</span><p>{{ i18n.t('dashboard.toValidate') }}</p><strong>{{ data.submitted }}</strong></article>
          <article class="card stat"><span class="material-symbols-outlined earth">badge</span><p>{{ i18n.t('dashboard.activeAgents') }}</p><strong>{{ data.activeAgents }}</strong></article>
        </div>

        <div class="content-grid">
          <article class="card">
            <h2>{{ i18n.t('dashboard.regionalProgress') }}</h2>
            <div class="map">
              <span class="material-symbols-outlined">location_on</span>
            </div>
            @for (zone of data.zoneProgress; track zone.id) {
              <div class="zone-row">
                <div>
                  <strong>{{ zone.name }}</strong>
                  <span>{{ zone.progress }}% {{ i18n.t('dashboard.completed') }}</span>
                </div>
                <progress [value]="zone.progress" max="100"></progress>
              </div>
            }
          </article>

          <article class="card submissions">
            <h2>{{ i18n.t('dashboard.recentSubmissions') }}</h2>
            <div class="table-controls" aria-label="Filtres des soumissions récentes">
              <div class="field">
                <label for="submissionSearch">{{ i18n.t('dashboard.search') }}</label>
                <input id="submissionSearch" name="submissionSearch" type="search" [ngModel]="submissionSearch()" (ngModelChange)="setSubmissionSearch($event)" [placeholder]="i18n.t('dashboard.search.placeholder')" />
              </div>
              <acl-status-filter controlId="submissionStatus" [value]="submissionStatusFilter()" (valueChange)="setSubmissionStatusFilter($event)" />
              <acl-page-size-select controlId="submissionPageSize" [value]="submissionPageSize()" [options]="pageSizes" (valueChange)="setSubmissionPageSize($event)" />
            </div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>{{ i18n.t('dashboard.table.record') }}</th><th>{{ i18n.t('dashboard.table.zone') }}</th><th>{{ i18n.t('dashboard.table.status') }}</th><th>{{ i18n.t('dashboard.table.updatedAt') }}</th></tr></thead>
                <tbody>
                  @for (row of pagedSubmissions(); track row.id) {
                    <tr>
                      <td><strong>{{ row.household_code || (row.first_name + ' ' + row.last_name) }}</strong></td>
                      <td>{{ zoneLabel(row.zone_id) }}</td>
                      <td><span class="chip {{ row.validation_status }}">{{ row.validation_status }}</span></td>
                      <td>{{ row.updated_at }}</td>
                    </tr>
                  }
                  @if (!pagedSubmissions().length) {
                    <tr><td colspan="4" class="empty-cell">{{ i18n.t('dashboard.emptySubmissions') }}</td></tr>
                  }
                </tbody>
              </table>
            </div>
            <acl-table-pagination
              ariaLabel="Pagination des soumissions récentes"
              [totalItems]="filteredSubmissions().length"
              [page]="submissionPage()"
              [totalPages]="submissionTotalPages()"
              (previous)="previousSubmissionPage()"
              (next)="nextSubmissionPage()"
            />
          </article>
        </div>
      }
    </section>
  `,
  styles: `
    .page { padding: 40px; display: grid; gap: 28px; }
    .page-head { display: flex; justify-content: space-between; gap: 16px; align-items: center; }
    h1 { margin: 0; font-size: 44px; line-height: 52px; }
    h2 { margin: 0 0 18px; font-size: 24px; }
    p { color: var(--muted); margin: 0; }
    .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 24px; }
    .stat { min-height: 168px; display: grid; align-content: space-between; }
    .stat span { width: 44px; height: 44px; border-radius: 6px; display: grid; place-items: center; background: var(--primary-soft); color: var(--primary); }
    .stat .green { background: var(--secondary-soft); color: var(--secondary); }
    .stat .earth { background: var(--terracotta-soft); color: var(--terracotta); }
    .stat strong { font-size: 34px; }
    .urgent { background: var(--error-soft); border-color: var(--error); }
    .content-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 24px; }
    .map { height: 210px; border: 1px solid var(--outline-soft); border-radius: 6px; background: repeating-linear-gradient(45deg, var(--surface-container), var(--surface-container) 12px, var(--surface) 12px, var(--surface) 24px); display: grid; place-items: center; margin-bottom: 18px; }
    .map span { font-size: 56px; color: var(--primary); }
    .zone-row { display: grid; gap: 8px; margin-top: 16px; }
    .zone-row div { display: flex; justify-content: space-between; gap: 12px; }
    progress { width: 100%; accent-color: var(--primary); }
    .table-controls { grid-template-columns: minmax(220px, 1fr) 180px 120px; margin-top: 0; }
    @media (max-width: 1000px) {
      .stats, .content-grid, .table-controls { grid-template-columns: 1fr; }
      .page { padding: 24px 16px; }
      h1 { font-size: 32px; }
    }
  `,
})
export class DashboardPageComponent implements OnInit {
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
    return zone ? zone.name : zoneId;
  }
}
