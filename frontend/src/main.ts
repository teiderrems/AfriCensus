import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { AppComponent } from './app/app.component';
import { apiErrorInterceptor } from './app/core/api-error.interceptor';
import { authInterceptor } from './app/core/auth.interceptor';
import { languageInterceptor } from './app/core/i18n/language.interceptor';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([languageInterceptor, authInterceptor, apiErrorInterceptor])),
  ],
}).catch((error) => console.error(error));
