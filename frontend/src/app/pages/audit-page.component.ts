import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../core/api.service';
import { I18nService } from '../core/i18n/i18n.service';
import { AuditLog } from '../core/models';
import { DetailDrawerComponent, DetailDrawerItem } from '../shared/detail-drawer.component';
import { PageSizeSelectComponent } from '../shared/page-size-select.component';
import { TablePaginationComponent } from '../shared/table-pagination.component';
import { LocalizedDatePipe } from '../shared/pipes/localized-date.pipe';
import { ShortIdPipe } from '../shared/pipes/short-id.pipe';

@Component({
  selector: 'acl-audit-page',
  imports: [FormsModule, DetailDrawerComponent, PageSizeSelectComponent, TablePaginationComponent, LocalizedDatePipe, ShortIdPipe],
  template: `
    <section class="page">
      <h1>Audit logs</h1>
      <article class="card">
        <div class="table-controls" [attr.aria-label]="i18n.t('audit.filtersLabel')">
          <div class="field">
            <label for="auditSearch">{{ i18n.t('audit.search') }}</label>
            <input id="auditSearch" name="auditSearch" type="search" [ngModel]="search()" (ngModelChange)="setSearch($event)" [placeholder]="i18n.t('audit.search.placeholder')" />
          </div>
          <div class="field">
            <label for="auditEntity">{{ i18n.t('audit.entity') }}</label>
            <select id="auditEntity" name="auditEntity" [ngModel]="entityFilter()" (ngModelChange)="setEntityFilter($event)">
              <option value="">{{ i18n.t('audit.all') }}</option>
              @for (entity of entityOptions(); track entity) {
                <option [value]="entity">{{ entity }}</option>
              }
            </select>
          </div>
          <acl-page-size-select controlId="auditPageSize" [value]="pageSize()" [options]="pageSizes" (valueChange)="setPageSize($event)" />
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>{{ i18n.t('audit.table.date') }}</th><th>{{ i18n.t('audit.table.action') }}</th><th>{{ i18n.t('audit.table.entity') }}</th><th>{{ i18n.t('audit.table.user') }}</th><th>{{ i18n.t('audit.table.details') }}</th></tr></thead>
            <tbody>
              @for (log of pagedLogs(); track log.id) {
                <tr>
                  <td>{{ log.created_at | aclLocalizedDate }}</td>
                  <td><strong>{{ log.action }}</strong></td>
                  <td>{{ log.entity_type }} · {{ log.entity_name || (log.entity_id | aclShortId) }}</td>
                  <td>{{ log.user_name || userName(log.user_id) }}</td>
                  <td>
                    <button type="button" class="icon-action" [attr.aria-label]="i18n.t('audit.table.viewDetails')" (click)="openLog(log)">
                      <span class="material-symbols-outlined" aria-hidden="true">visibility</span>
                    </button>
                  </td>
                </tr>
              }
              @if (!pagedLogs().length) {
                <tr><td colspan="5" class="empty-cell">{{ i18n.t('audit.emptyLogs') }}</td></tr>
              }
            </tbody>
          </table>
        </div>
        <acl-table-pagination
          [ariaLabel]="i18n.t('audit.paginationLabel')"
          [totalItems]="filteredLogs().length"
          [page]="page()"
          [totalPages]="totalPages()"
          (previous)="previousPage()"
          (next)="nextPage()"
        />
      </article>
      <acl-detail-drawer
        [open]="logDrawerOpen()"
        [title]="selectedLogTitle()"
        [subtitle]="i18n.t('audit.drawer.subtitle')"
        [items]="selectedLogDetails()"
        (closed)="selectedLog.set(null)"
      />
    </section>
  `,
  styles: `
    .page { padding: 40px; display: grid; gap: 24px; }
    h1 { margin: 0; font-size: 40px; }
    .table-controls { grid-template-columns: minmax(220px, 1fr) 190px 130px; margin-top: 0; }
    .icon-action { width: 42px; height: 42px; border: 1px solid var(--outline-soft); border-radius: 8px; background: var(--surface-low); color: var(--primary); display: inline-grid; place-items: center; cursor: pointer; }
    .icon-action:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
    @media(max-width: 860px){
      .page{padding:24px 16px}
    }
  `,
})
export class AuditPageComponent implements OnInit {
  readonly logs = signal<AuditLog[]>([]);
  readonly search = signal('');
  readonly entityFilter = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly pageSizes = [5, 10, 20, 50];
  readonly selectedLog = signal<AuditLog | null>(null);
  readonly entityOptions = computed(() => Array.from(new Set(this.logs().map((log) => log.entity_type))).sort());
  readonly filteredLogs = computed(() => {
    const query = this.search().trim().toLowerCase();
    const entity = this.entityFilter();
    return this.logs().filter((log) => {
      const matchesEntity = !entity || log.entity_type === entity;
      const searchable = `${log.created_at} ${log.action} ${log.entity_type} ${log.entity_id} ${log.user_id || 'system'}`.toLowerCase();
      return matchesEntity && (!query || searchable.includes(query));
    });
  });
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredLogs().length / this.pageSize())));
  readonly pagedLogs = computed(() => {
    const start = (Math.min(this.page(), this.totalPages()) - 1) * this.pageSize();
    return this.filteredLogs().slice(start, start + this.pageSize());
  });
  readonly logDrawerOpen = computed(() => Boolean(this.selectedLog()));
  readonly selectedLogTitle = computed(() => this.selectedLog()?.action || this.i18n.t('audit.table.details'));
  readonly selectedLogDetails = computed<DetailDrawerItem[]>(() => {
    const log = this.selectedLog();
    if (!log) return [];
    return [
      { label: this.i18n.t('audit.drawer.id'), value: this.shortId.transform(log.id) },
      { label: this.i18n.t('audit.drawer.date'), value: this.localizedDate.transform(log.created_at) },
      { label: this.i18n.t('audit.drawer.action'), value: log.action },
      { label: this.i18n.t('audit.drawer.entityType'), value: log.entity_type },
      { label: this.i18n.t('audit.drawer.entityId'), value: log.entity_name || this.shortId.transform(log.entity_id) },
      { label: this.i18n.t('audit.drawer.user'), value: log.user_name || this.userName(log.user_id) },
    ];
  });

  constructor(
    private readonly api: ApiService,
    readonly i18n: I18nService,
    private readonly shortId: ShortIdPipe,
    private readonly localizedDate: LocalizedDatePipe
  ) {}
  ngOnInit(): void {
    this.api.auditLogs().subscribe({
      next: (logs) => this.logs.set(logs),
      error: () => this.logs.set([]),
    });
  }

  userName(userId: string | null): string {
    if (!userId) return 'system';
    return this.shortId.transform(userId);
  }

  setSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
  }

  setEntityFilter(value: string): void {
    this.entityFilter.set(value);
    this.page.set(1);
  }

  setPageSize(value: number | string): void {
    this.pageSize.set(Number(value));
    this.page.set(1);
  }

  previousPage(): void {
    this.page.set(Math.max(1, this.page() - 1));
  }

  nextPage(): void {
    this.page.set(Math.min(this.totalPages(), this.page() + 1));
  }

  openLog(log: AuditLog): void {
    this.selectedLog.set(log);
  }
}
