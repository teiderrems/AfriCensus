import { LucideAngularModule } from 'lucide-angular';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '@/app/core/auth.service';
import { AppError } from '@/app/core/error.service';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { ToastService } from '@/app/core/toast.service';
import { ButtonComponent } from '@/app/shared/button/button';

@Component({
  selector: 'acl-forgot-password',
  imports: [LucideAngularModule, FormsModule, ButtonComponent, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: '../login/login.component.css',
})
export class ForgotPasswordComponent {
  identifier = '';
  readonly error = signal('');
  readonly success = signal('');
  readonly loading = signal(false);

  constructor(
    private readonly auth: AuthService,
    readonly i18n: I18nService,
    private readonly router: Router,
    private readonly toastService: ToastService,
  ) {
    const nav = this.router.getCurrentNavigation();
    if (nav?.extras.queryParams?.['username']) {
      this.identifier = nav.extras.queryParams['username'];
      this.error.set(this.i18n.t('auth.passwordExpired'));
    }
  }

  submit(): void {
    this.error.set('');
    this.success.set('');
    
    if (!this.identifier) {
      return;
    }

    this.loading.set(true);
    this.auth.forgotPassword(this.identifier).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.success.set(res.message);
        this.toastService.success('Success', res.message);
      },
      error: (error: AppError) => {
        this.loading.set(false);
        const msg = error.message || this.i18n.t('error.default.message');
        this.error.set(msg);
      },
    });
  }
}
