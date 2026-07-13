import { NgTemplateOutlet } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'acl-modal',
  imports: [NgTemplateOutlet],
  template: `
    @if (open) {
      <section class="modal-backdrop" role="presentation" (click)="closed.emit()">
        <!-- Mode Formulaire -->
        @if (isForm) {
          <form
            class="modal"
            role="dialog"
            aria-modal="true"
            [attr.aria-labelledby]="titleId"
            (click)="$event.stopPropagation()"
            (ngSubmit)="submitted.emit()"
          >
            <ng-container *ngTemplateOutlet="modalInner" />
          </form>
        }
        <!-- Mode Standard -->
        @else {
          <article
            class="modal"
            role="dialog"
            aria-modal="true"
            [attr.aria-labelledby]="titleId"
            (click)="$event.stopPropagation()"
          >
            <ng-container *ngTemplateOutlet="modalInner" />
          </article>
        }
      </section>
    }

    <ng-template #modalInner>
      <header class="modal-head">
        <div>
          <h2 [id]="titleId">{{ title }}</h2>
          @if (subtitle) {
            <p>{{ subtitle }}</p>
          }
        </div>
        <button type="button" class="icon-action" aria-label="Fermer la modale" (click)="closed.emit()">
          <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
      </header>
      <div class="modal-body">
        <ng-content />
      </div>
      <footer class="modal-actions">
        <ng-content select="[modal-actions]" />
      </footer>
    </ng-template>
  `,
  styles: `
    .modal-backdrop {
      position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center;
      padding: 24px; background: rgba(8, 13, 18, .62);
    }
    .modal {
      width: min(980px, 100%); max-height: min(820px, calc(100vh - 48px)); overflow: auto;
      display: grid; gap: 20px; padding: 24px; border: 2px solid var(--outline-soft); border-radius: 8px;
      background: var(--surface); color: var(--ink); box-shadow: 0 24px 70px rgba(0, 0, 0, .28);
    }
    .modal-head { display: flex; align-items: start; justify-content: space-between; gap: 16px; }
    h2 { margin: 0; font-size: 26px; line-height: 32px; }
    p { margin: 4px 0 0; color: var(--muted); }
    .modal-body { min-width: 0; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
    .icon-action {
      width: 42px; height: 42px; border: 1px solid var(--outline-soft); border-radius: 8px;
      background: var(--surface-low); color: var(--primary); display: inline-grid; place-items: center; cursor: pointer;
    }
    .icon-action:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
    @media(max-width: 680px) {
      .modal-backdrop { align-items: end; padding: 0; }
      .modal { width: 100%; max-height: 92vh; border-radius: 8px 8px 0 0; padding: 18px; }
      h2 { font-size: 22px; line-height: 28px; }
      .modal-actions { display: grid; grid-template-columns: 1fr; }
    }
  `,
})
export class ModalComponent {
  @Input({ required: true }) open = false;
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() titleId = `modal-title-${Math.random().toString(36).slice(2)}`;
  @Input() isForm = false;
  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly submitted = new EventEmitter<void>();
}
