import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AppSettingsService } from './app-settings.service';
import { AuthService } from './auth.service';
import { AppFeatures } from './models';

export const featureGuard = (featureKey: keyof AppFeatures): CanActivateFn => {
  return () => {
    const settings = inject(AppSettingsService);
    const auth = inject(AuthService);
    const router = inject(Router);
    
    if (!settings.isFeatureEnabledForUser(featureKey, auth.currentUser())) {
      router.navigateByUrl('/portal');
      return false;
    }
    return true;
  };
};
