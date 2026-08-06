import { LucideAngularModule } from 'lucide-angular';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ApiService } from '@/app/core/api.service';
import { AppError } from '@/app/core/error.service';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { ToastService } from '@/app/core/toast.service';
import { ButtonComponent } from '@/app/shared/button/button';

@Component({
  selector: 'acl-change-password',
  imports: [LucideAngularModule, FormsModule, ButtonComponent, RouterLink],
  templateUrl: './change-password.component.html',
  styleUrl: '../login/login.component.css',
})
export class ChangePasswordComponent {
  oldPassword = '';
  newPassword = '';
  confirmPassword = '';
  
  readonly error = signal('');
  readonly success = signal('');
  readonly loading = signal(false);
  
  readonly showOldPassword = signal(false);
  readonly showNewPassword = signal(false);
  readonly showConfirmPassword = signal(false);

  constructor(
    private readonly api: ApiService,
    readonly i18n: I18nService,
    private readonly router: Router,
    private readonly toastService: ToastService,
  ) {}

  get validationError(): string {
    if (this.newPassword && this.newPassword.length < 8) {
      return this.i18n.t('auth.resetPassword.minLength');
    }
    if (this.confirmPassword && this.newPassword !== this.confirmPassword) {
      return this.i18n.t('auth.resetPassword.mismatch');
    }
    return '';
  }

  submit(): void {
    this.error.set('');
    this.success.set('');
    
    if (!this.oldPassword || !this.newPassword || !this.confirmPassword) {
      return;
    }

    if (this.newPassword !== this.confirmPassword || this.newPassword.length < 8) {
      this.error.set(this.validationError || this.i18n.t('auth.resetPassword.mismatch'));
      return;
    }

    this.loading.set(true);
    this.api.changePassword(this.oldPassword, this.newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(this.i18n.t('auth.resetPassword.success'));
        this.toastService.success('', this.i18n.t('auth.resetPassword.success'));
        setTimeout(() => this.router.navigateByUrl('/portal'), 2000);
      },
      error: (err: AppError) => {
        this.loading.set(false);
        if (err.status === 401) {
          this.error.set(this.i18n.t('auth.changePassword.invalidOld'));
        } else {
          this.error.set(err.message || this.i18n.t('error.default.message'));
        }
      },
    });
  }
}
