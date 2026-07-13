import { Component, OnInit, signal } from '@angular/core';

import { ApiService } from '../core/api.service';
import { I18nService } from '../core/i18n/i18n.service';
import { CensusRecord } from '../core/models';
import { LocalizedDatePipe } from '../shared/pipes/localized-date.pipe';

@Component({
  selector: 'acl-validation-page',
  imports: [LocalizedDatePipe],
  template: `
    <section class="page">
      <header>
        <h1>{{ i18n.t('validation.title') }}</h1>
        <p>{{ i18n.t('validation.subtitle') }}</p>
      </header>
      <div class="queue">
        @for (item of items(); track item.id) {
          <article class="card queue-card">
            <div>
              <span class="chip {{ item.validation_status }}">{{ item.validation_status }}</span>
              <h2>{{ item.household_code || (item.first_name + ' ' + item.last_name) }}</h2>
              <p>{{ item.entity_type }} · {{ item.updated_at | aclLocalizedDate }}</p>
            </div>
            <div class="actions">
              @if (item.entity_type === 'persons') {
                <button class="btn primary" type="button" (click)="validate(item.id)">
                  <span class="material-symbols-outlined">check_circle</span>
                  {{ i18n.t('validation.validate') }}
                </button>
                <button class="btn secondary" type="button" (click)="correction(item.id)">
                  <span class="material-symbols-outlined">edit_note</span>
                  {{ i18n.t('validation.requestCorrection') }}
                </button>
              }
            </div>
          </article>
        }
      </div>
    </section>
  `,
  styles: `
    .page { padding: 40px; display: grid; gap: 24px; }
    h1 { margin: 0; font-size: 40px; } p { color: var(--muted); margin: 4px 0 0; }
    .queue { display: grid; gap: 16px; }
    .queue-card { display: flex; justify-content: space-between; gap: 20px; align-items: center; border-left: 8px solid var(--primary); }
    h2 { margin: 12px 0 4px; }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; }
    @media(max-width: 860px){.page{padding:24px 16px}.queue-card{align-items:start; flex-direction:column}}
  `,
})
export class ValidationPageComponent implements OnInit {
  readonly items = signal<CensusRecord[]>([]);
  constructor(private readonly api: ApiService, readonly i18n: I18nService) {}

  ngOnInit(): void {
    this.load();
  }

  validate(id: string): void {
    this.api.validatePerson(id).subscribe({
      next: () => this.load(),
      error: () => undefined,
    });
  }

  correction(id: string): void {
    this.api.requestCorrection(id, this.i18n.t('validation.defaultCorrectionMessage')).subscribe({
      next: () => this.load(),
      error: () => undefined,
    });
  }

  private load(): void {
    this.api.validationQueue().subscribe({
      next: (items) => this.items.set(items),
      error: () => this.items.set([]),
    });
  }
}
