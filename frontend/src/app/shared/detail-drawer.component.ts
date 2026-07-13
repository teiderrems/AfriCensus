import { DOCUMENT } from '@angular/common';
import { Component, EventEmitter, Inject, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';

export interface DetailDrawerItem {
  label: string;
  value: string | number | boolean | null | undefined;
}

@Component({
  selector: 'acl-detail-drawer',
  template: `
    @if (open) {
      <div class="drawer-backdrop" aria-hidden="true" (click)="closed.emit()"></div>
      <aside class="detail-drawer" role="dialog" aria-modal="true" [attr.aria-label]="title">
        <header>
          <div>
            <strong>{{ title }}</strong>
            @if (subtitle) {
              <span>{{ subtitle }}</span>
            }
          </div>
          <button type="button" class="drawer-close" aria-label="Fermer les détails" (click)="closed.emit()">
            <span class="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </header>

        <dl>
          @for (item of items; track item.label) {
            <div>
              <dt>{{ item.label }}</dt>
              <dd>{{ display(item.value) }}</dd>
            </div>
          }
        </dl>

        <ng-content />
      </aside>
    }
  `,
  styles: `
    .drawer-backdrop {
      position: fixed;
      inset: 0;
      z-index: 70;
      background: rgba(15, 23, 42, .38);
      backdrop-filter: blur(3px);
    }
    .detail-drawer {
      position: fixed;
      inset: 0 0 0 auto;
      z-index: 80;
      width: min(440px, 100vw);
      min-height: 100dvh;
      overflow-y: auto;
      background: var(--surface);
      color: var(--text);
      border-left: 1px solid var(--outline-soft);
      box-shadow: -24px 0 70px rgba(15, 23, 42, .22);
      padding: 24px;
      display: grid;
      align-content: start;
      gap: 24px;
    }
    header {
      display: flex;
      align-items: start;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--outline-soft);
    }
    header strong {
      display: block;
      font-size: 24px;
      line-height: 30px;
    }
    header span {
      display: block;
      margin-top: 4px;
      color: var(--muted);
      font-weight: 700;
    }
    .drawer-close {
      width: 44px;
      height: 44px;
      border: 1px solid var(--outline-soft);
      border-radius: 8px;
      background: var(--surface-low);
      color: var(--text);
      display: inline-grid;
      place-items: center;
      cursor: pointer;
    }
    .drawer-close:focus-visible {
      outline: 3px solid var(--focus);
      outline-offset: 2px;
    }
    dl {
      display: grid;
      gap: 12px;
      margin: 0;
    }
    dl div {
      display: grid;
      gap: 6px;
      padding: 14px;
      border: 1px solid var(--outline-soft);
      border-radius: 8px;
      background: var(--surface-low);
    }
    dt {
      color: var(--muted);
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: .04em;
    }
    dd {
      margin: 0;
      font-weight: 800;
      overflow-wrap: anywhere;
    }
    @media (max-width: 560px) {
      .detail-drawer {
        width: 100vw;
        padding: 18px 16px;
      }
      header strong {
        font-size: 21px;
        line-height: 28px;
      }
    }
  `,
})
export class DetailDrawerComponent implements OnChanges, OnDestroy {
  private static openCount = 0;
  private static previousOverflow = '';

  @Input({ required: true }) open = false;
  @Input({ required: true }) title = 'Détails';
  @Input() subtitle = '';
  @Input() items: DetailDrawerItem[] = [];
  @Output() readonly closed = new EventEmitter<void>();
  private scrollLocked = false;

  constructor(@Inject(DOCUMENT) private readonly document: Document) {}

  ngOnChanges(changes: SimpleChanges): void {
    if ('open' in changes) {
      this.syncBodyScrollLock();
    }
  }

  ngOnDestroy(): void {
    this.unlockBodyScroll();
  }

  display(value: DetailDrawerItem['value']): string {
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
    if (value === null || value === undefined || value === '') return 'Non renseigné';
    return String(value);
  }

  private syncBodyScrollLock(): void {
    if (this.open) {
      this.lockBodyScroll();
      return;
    }
    this.unlockBodyScroll();
  }

  private lockBodyScroll(): void {
    if (this.scrollLocked) {
      return;
    }
    if (DetailDrawerComponent.openCount === 0) {
      DetailDrawerComponent.previousOverflow = this.document.body.style.overflow;
      this.document.body.style.overflow = 'hidden';
    }
    DetailDrawerComponent.openCount += 1;
    this.scrollLocked = true;
  }

  private unlockBodyScroll(): void {
    if (!this.scrollLocked) {
      return;
    }
    DetailDrawerComponent.openCount = Math.max(0, DetailDrawerComponent.openCount - 1);
    if (DetailDrawerComponent.openCount === 0) {
      this.document.body.style.overflow = DetailDrawerComponent.previousOverflow;
    }
    this.scrollLocked = false;
  }
}
