import { LucideAngularModule } from 'lucide-angular';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '@/app/core/auth.service';
import { AppError } from '@/app/core/error.service';
import { I18nService } from '@/app/core/i18n/i18n.service';
import { ToastService } from '@/app/core/toast.service';
import { ButtonComponent } from '@/app/shared/button/button';

@Component({
  selector: 'acl-login-page',
  imports: [LucideAngularModule, FormsModule, ButtonComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  username = 'admin';
  password = 'admin123';
  readonly error = signal('');
  readonly showPassword = signal(false);
  readonly loading = signal(false);

  constructor(
    private readonly auth: AuthService,
    readonly i18n: I18nService,
    private readonly router: Router,
    private readonly toastService: ToastService,
  ) {}

  submit(): void {
    this.error.set('');
    this.loading.set(true);
    this.auth.login(this.username, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/portal');
      },
      error: (error: AppError) => {
        this.loading.set(false);
        // Handle password expired error explicitly
        if (error.status === 403 && error.details?.includes('PASSWORD_EXPIRED')) {
          this.router.navigate(['/forgot-password'], { queryParams: { username: this.username } });
          return;
        }

        const msg = error.message || this.i18n.t('login.error');
        this.error.set(msg);
        this.toastService.error(this.i18n.t('error.api.title'), msg);
      },
    });
  }
}
