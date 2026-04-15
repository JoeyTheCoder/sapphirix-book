import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { AuthService } from './auth.service';

export const adminAuthGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.ensureInitialized();

  if (!authService.currentUser()) {
    return router.createUrlTree(['/admin/login']);
  }

  if (!authService.adminProfile()) {
    try {
      await authService.fetchAdminProfile();
    } catch {
      return router.createUrlTree(['/admin/login']);
    }
  }

  return true;
};