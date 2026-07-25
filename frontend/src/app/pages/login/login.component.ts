import { LucideAngularModule } from 'lucide-angular';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '@/app/core/auth.service';
import { AppError } from '@/app/core/error.service';
import { I18nService } from '@/app/core/i18n/i18n.service';
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
