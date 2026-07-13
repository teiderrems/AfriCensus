import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { AppError } from '../core/error.service';
import { I18nService } from '../core/i18n/i18n.service';

@Component({
  selector: 'acl-login-page',
  imports: [FormsModule],
  template: `
    <section class="login-page">
      <div class="login-panel">
        <div class="brand">
          <div class="mark">AL</div>
          <div>
            <h1>AfriCensus Link</h1>
            <p>{{ i18n.t('login.subtitle') }}</p>
          </div>
        </div>
        <form (ngSubmit)="submit()">
          <div class="field">
            <label for="username">{{ i18n.t('login.username') }}</label>
            <input id="username" name="username" [(ngModel)]="username" autocomplete="username" required>
          </div>
          <div class="field">
            <label for="password">{{ i18n.t('login.password') }}</label>
            <input id="password" name="password" [(ngModel)]="password" type="password" autocomplete="current-password" required>
          </div>
          @if (error()) {
            <p class="error">{{ error() }}</p>
          }
          <button class="btn primary" type="submit">
            <span class="material-symbols-outlined">login</span>
            {{ i18n.t('login.submit') }}
          </button>
        </form>
        <p class="hint">{{ i18n.t('login.hint') }}</p>
      </div>
    </section>
  `,
  styles: `
    .login-page {
      min-height: 100vh; display: grid; place-items: center; padding: 24px;
      background: linear-gradient(180deg, var(--sand-bg), var(--surface-low));
    }
    .login-panel {
      width: min(100%, 460px); background: var(--surface); border: 2px solid var(--outline-soft);
      border-radius: 8px; padding: 32px; display: grid; gap: 28px;
    }
    .brand { display: flex; gap: 14px; align-items: center; }
    .mark { width: 56px; height: 56px; border-radius: 6px; background: var(--primary); color: var(--on-primary); display: grid; place-items: center; font-weight: 800; }
    h1 { margin: 0; color: var(--primary); font-size: 32px; line-height: 40px; }
    p { margin: 0; color: var(--muted); }
    form { display: grid; gap: 18px; }
    .field { display: grid; gap: 8px; }
    .field label { font-size: 14px; font-weight: 800; color: var(--ink); }
    .field input {
      width: 100%; min-height: 48px; border: 2px solid var(--outline-soft); border-radius: 6px;
      background: var(--surface); color: var(--ink); padding: 10px 12px; line-height: 1.35;
    }
    .field input:focus { border-color: var(--primary); outline: 3px solid color-mix(in srgb, var(--primary) 28%, transparent); outline-offset: 1px; }
    .btn {
      width: 100%; min-height: 48px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      border: 2px solid transparent; border-radius: 6px; padding: 0 20px; font-weight: 800;
    }
    .btn.primary { background: var(--primary); color: var(--on-primary); }
    .error { color: var(--error); font-weight: 700; }
    .hint { font-size: 13px; }
  `,
})
export class LoginPageComponent {
  username = 'admin';
  password = 'admin123';
  readonly error = signal('');

  constructor(
    private readonly auth: AuthService,
    readonly i18n: I18nService,
    private readonly router: Router,
  ) {}

  submit(): void {
    this.error.set('');
    this.auth.login(this.username, this.password).subscribe({
      next: () => this.router.navigateByUrl('/portal'),
      error: (error: AppError) => this.error.set(error.message || this.i18n.t('login.error')),
    });
  }
}
