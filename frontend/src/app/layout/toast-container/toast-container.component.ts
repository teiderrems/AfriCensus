import { Component } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  template: `
    <div class="toast-container" aria-live="polite">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast" [class]="toast.type" role="alert">
          <div>
            <strong>{{ toast.title }}</strong>
            @if (toast.message) {
              <p>{{ toast.message }}</p>
            }
          </div>
          <button type="button" (click)="toastService.remove(toast.id)" [attr.aria-label]="i18n.t('a11y.closeError')">✕</button>
        </div>
      }
    </div>
  `,
  styles: `
    .toast-container {
      position: fixed; top: 20px; right: 20px; z-index: 2000; display: flex; flex-direction: column; gap: 12px;
    }
    .toast {
      width: 320px; padding: 16px; border-radius: 12px; background: color-mix(in srgb, var(--surface) 95%, transparent);
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      box-shadow: var(--card-hover-shadow); border-left: 4px solid var(--primary);
      display: flex; justify-content: space-between; align-items: start; gap: 12px;
      transition: transform 0.2s ease, opacity 0.2s ease;
    }
    .toast.error { border-left-color: var(--error); }
    .toast.success { border-left-color: var(--growth); }
    .toast strong { display: block; margin-bottom: 4px; font-size: 14px; }
    .toast p { margin: 0; font-size: 13px; color: var(--muted); }
    .toast button { background: none; border: none; cursor: pointer; color: var(--muted); transition: color 0.15s ease; }
    .toast button:hover { color: var(--ink); }
  `
})
export class ToastContainerComponent {
  constructor(
    readonly toastService: ToastService,
    readonly i18n: I18nService
  ) {}
}
