import { LucideAngularModule } from 'lucide-angular';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';

import { AuthService } from '@/app/core/auth.service';
import { AppError } from '@/app/core/error.service';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { ToastService } from '@/app/core/toast.service';
import { ButtonComponent } from '@/app/shared/button/button';

@Component({
  selector: 'acl-reset-password',
  imports: [LucideAngularModule, FormsModule, ButtonComponent, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: '../login/login.component.css',
})
export class ResetPasswordComponent {
  token = '';
  password = '';
  confirmPassword = '';
  readonly error = signal('');
  readonly success = signal('');
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly loading = signal(false);

  constructor(
    private readonly auth: AuthService,
    readonly i18n: I18nService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly toastService: ToastService,
  ) {
    this.route.queryParams.subscribe(params => {
      if (params['token']) {
        this.token = params['token'];
      } else {
        this.error.set(this.i18n.t('auth.resetPassword.invalidToken'));
      }
    });
  }

  get validationError(): string {
    if (this.password && this.password.length < 8) {
      return this.i18n.t('auth.resetPassword.minLength');
    }
    if (this.confirmPassword && this.password !== this.confirmPassword) {
      return this.i18n.t('auth.resetPassword.mismatch');
    }
    return '';
  }

  submit(): void {
    this.error.set('');
    this.success.set('');
    
    if (!this.token) {
      this.error.set(this.i18n.t('auth.resetPassword.invalidToken'));
      return;
    }

    if (this.password !== this.confirmPassword || this.password.length < 8) {
      this.error.set(this.validationError || this.i18n.t('auth.resetPassword.mismatch'));
      return;
    }

    this.loading.set(true);
    this.auth.resetPassword(this.token, this.password).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.success.set(this.i18n.t('auth.resetPassword.success'));
        this.toastService.success('Succès', 'Mot de passe mis à jour');
        setTimeout(() => this.router.navigateByUrl('/login'), 2000);
      },
      error: (error: AppError) => {
        this.loading.set(false);
        const msg = error.message || this.i18n.t('error.default.message');
        this.error.set(msg);
      },
    });
  }
}
