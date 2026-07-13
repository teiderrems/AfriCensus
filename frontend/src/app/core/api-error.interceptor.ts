import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';
import { ErrorService } from './error.service';

export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const errors = inject(ErrorService);
  const auth = inject(AuthService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      const appError = errors.fromHttp(error);
      const isLoginRequest = request.url.includes('/api/v1/auth/login');
      if (!isLoginRequest) {
        errors.publish(appError);
      }

      if (error.status === 401 && !isLoginRequest) {
        auth.logout();
      }

      return throwError(() => appError);
    }),
  );
};
