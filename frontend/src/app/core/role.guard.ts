import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';
import { User } from './models';

export const roleGuard: CanActivateFn = (route) => {
  const allowed = route.data?.['roles'] as User['role'][] | undefined;
  if (!allowed?.length) {
    return true;
  }

  const user = inject(AuthService).currentUser();
  if (user && allowed.includes(user.role)) {
    return true;
  }

  return inject(Router).createUrlTree(['/unauthorized']);
};
