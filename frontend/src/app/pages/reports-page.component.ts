import { JsonPipe } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';

import { ApiService } from '../core/api.service';
import { I18nService } from '../core/i18n/i18n.service';
import { PopulationSummary } from '../core/models';

@Component({
  selector: 'acl-reports-page',
  imports: [JsonPipe],
  template: `
    <section class="page">
      <header>
        <h1>{{ i18n.t('reports.title') }}</h1>
        <a class="btn primary" href="/api/v1/exports/persons.csv"><span class="material-symbols-outlined">download</span> {{ i18n.t('reports.exportCsv') }}</a>
      </header>
      <article class="card">
        <h2>{{ i18n.t('reports.populationSummary') }}</h2>
        <pre>{{ summary() | json }}</pre>
      </article>
    </section>
  `,
  styles: `.page{padding:40px;display:grid;gap:24px}header{display:flex;justify-content:space-between;gap:16px;align-items:center}h1{font-size:40px;margin:0}a{text-decoration:none}pre{white-space:pre-wrap;font-size:16px}@media(max-width:860px){.page{padding:24px 16px}header{align-items:start;flex-direction:column}}`,
})
export class ReportsPageComponent implements OnInit {
  readonly summary = signal<PopulationSummary | null>(null);
  constructor(private readonly api: ApiService, readonly i18n: I18nService) {}
  ngOnInit(): void {
    this.api.populationSummary().subscribe({
      next: (summary) => this.summary.set(summary),
      error: () => this.summary.set(null),
    });
  }
}
