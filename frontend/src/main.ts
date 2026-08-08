import { APP_INITIALIZER, importProvidersFrom, isDevMode, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { LucideAngularModule, icons } from 'lucide-angular';

import { AppComponent } from '@/app/app.component';
import { apiErrorInterceptor } from '@/app/core/api-error.interceptor';
import { authInterceptor } from '@/app/core/auth.interceptor';
import { languageInterceptor } from '@/app/core/i18n/language.interceptor';
import { AppSettingsService } from '@/app/core/app-settings.service';
import { routes } from '@/app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    importProvidersFrom(LucideAngularModule.pick(icons)),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([languageInterceptor, authInterceptor, apiErrorInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: (svc: AppSettingsService) => () => svc.load(),
      deps: [AppSettingsService],
      multi: true,
    },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    }),
  ],
}).catch((error) => console.error(error));
