import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { I18nService } from './i18n.service';

export const languageInterceptor: HttpInterceptorFn = (request, next) => {
  const i18n = inject(I18nService);
  return next(request.clone({ setHeaders: { 'Accept-Language': i18n.language() } }));
};
